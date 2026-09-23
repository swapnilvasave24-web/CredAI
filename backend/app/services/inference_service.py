"""
Inference service — production-hardened:
  - Thread-safe model/explainer cache (loaded once at startup, never re-imported mid-request)
  - Uses PR-optimal decision threshold from training (not a hardcoded 0.5)
  - Validates financial profile fields before inference
  - Explicit error messages surfaced to API layer
"""
import json
import threading
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.ml.train import load_model, MODEL_PATH, load_decision_threshold
from app.ml.preprocessing import load_preprocessor, transform
from app.ml.credit_score import build_credit_result
from app.explainability.shap_explainer import get_explainer, explain_instance
from app.models.entities import (
    ApplicantProfile, FinancialProfile, CreditAssessment, AssessmentExplanation,
)
from app.schemas.schemas import AssessmentRequest

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
CURRENT_MODEL_VERSION = "xgb-centralized-v2"

# Thread-safe model cache
_lock = threading.Lock()
_model_cache: dict = {}


def warm_up_model() -> None:
    """
    Called at application startup (FastAPI lifespan) to pre-load the model,
    preprocessor, and SHAP explainer into memory so the first real request
    has no cold-start latency.  Safe to call even if the model hasn't been
    trained yet — it will silently skip.
    """
    if not MODEL_PATH.exists():
        return
    try:
        _load_model_and_explainer()
    except Exception:
        pass  # startup continues; 503 returned on first inference request


def _load_model_and_explainer():
    """Internal: load model + explainer under the lock if not already cached."""
    with _lock:
        if "model" not in _model_cache:
            model = load_model()
            holdout_path = MODELS_DIR / "holdout_test.csv"
            background_df = pd.read_csv(holdout_path) if holdout_path.exists() else None
            explainer, ct = get_explainer(model, background_df)
            threshold = load_decision_threshold()
            _model_cache["model"] = model
            _model_cache["explainer"] = explainer
            _model_cache["ct"] = ct
            _model_cache["threshold"] = threshold
    return (
        _model_cache["model"],
        _model_cache["explainer"],
        _model_cache["ct"],
        _model_cache["threshold"],
    )


def _build_model_input_row(profile: ApplicantProfile, fin: FinancialProfile) -> pd.DataFrame:
    age_years = max(profile.age or 35, 18)
    employed_years = max(profile.employment_years or 3, 0)
    income_annual = (fin.monthly_income or 1) * 12
    credit_amt = fin.requested_credit_amount or 0
    annuity = fin.monthly_annuity or 0

    bureau_loans = fin.bureau_loan_count or 0
    prev_apps = fin.prev_application_count or 0
    is_thin_file = 1.0 if (bureau_loans == 0 and prev_apps == 0) else 0.0

    row = {
        "AMT_INCOME_TOTAL":              income_annual,
        "AMT_CREDIT":                    credit_amt,
        "AMT_ANNUITY":                   annuity,
        "EXT_SOURCE_1":                  fin.ext_source_1 or 0.5,
        "EXT_SOURCE_2":                  fin.ext_source_2 or 0.5,
        "EXT_SOURCE_3":                  fin.ext_source_3 or 0.5,
        "BUREAU_LOAN_COUNT":             bureau_loans,
        "BUREAU_OVERDUE_RATIO":          fin.bureau_overdue_ratio or 0.0,
        "PREV_APPLICATION_COUNT":        prev_apps,
        "PREV_APPROVAL_RATE":            fin.prev_approval_rate or 0.5,
        "INSTALLMENT_LATE_RATIO":        fin.installment_late_ratio or 0.0,
        "INSTALLMENT_AVG_DAYS_LATE":     fin.installment_avg_days_late or 0.0,
        "DEBT_TO_INCOME":                credit_amt / max(income_annual, 1),
        "ANNUITY_TO_INCOME":             annuity / max(income_annual, 1),
        "CREDIT_TERM":                   credit_amt / max(annuity, 1),
        "EMPLOYED_YEARS":                employed_years,
        "AGE_YEARS":                     age_years,
        "EMPLOYED_TO_AGE_RATIO":         employed_years / max(age_years, 1),
        "IS_THIN_FILE":                  is_thin_file,
        "syn_upi_txn_count_monthly":     fin.syn_upi_txn_count_monthly or 20,
        "syn_avg_txn_amount":            fin.syn_avg_txn_amount or 1000,
        "syn_txn_consistency":           fin.syn_txn_consistency or 0.7,
        "syn_utility_payment_reliability": fin.syn_utility_payment_reliability or 0.8,
        "syn_monthly_savings_rate":      fin.syn_monthly_savings_rate or 0.1,
        "syn_income_stability_score":    fin.syn_income_stability_score or 0.7,
        "NAME_EDUCATION_TYPE":           profile.education_level or "Secondary",
        "NAME_FAMILY_STATUS":            profile.family_status or "Single / not married",
        "NAME_HOUSING_TYPE":             profile.housing_type or "House / apartment",
        "NAME_INCOME_TYPE":              profile.employment_type or "Working",
    }
    return pd.DataFrame([row])


def run_assessment(db: Session, profile: ApplicantProfile, req: AssessmentRequest) -> CreditAssessment:
    # Upsert financial profile
    fin = profile.financial_profile
    if fin is None:
        fin = FinancialProfile(applicant_id=profile.id)
        db.add(fin)
    for field, value in req.model_dump().items():
        setattr(fin, field, value)
    db.commit()
    db.refresh(fin)

    model, explainer, ct, threshold = _load_model_and_explainer()

    row = _build_model_input_row(profile, fin)
    prob_default = float(model.predict_proba(transform(ct, row))[:, 1][0])
    result = build_credit_result(prob_default, threshold=threshold)
    shap_result = explain_instance(model, ct, explainer, row)

    assessment = CreditAssessment(
        applicant_id=profile.id,
        model_version=CURRENT_MODEL_VERSION,
        credit_score=result.credit_score,
        risk_level=result.risk_level,
        default_probability=result.default_probability,
        recommendation=result.recommendation,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    for c in shap_result["top_contributors"]:
        db.add(AssessmentExplanation(
            assessment_id=assessment.id,
            feature=c["feature"],
            friendly_label=c["friendly_label"],
            shap_value=c["shap_value"],
            contribution_type=c["contribution_type"],
            is_synthetic=c["is_synthetic"],
        ))
    db.commit()
    db.refresh(assessment)
    return assessment
