"""
Real SHAP explanations for individual XGBoost predictions. No hard-coded
explanation text -- feature contributions and their human-readable labels
are generated from the actual SHAP values of the actual model.
"""
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import shap

from app.ml.preprocessing import load_preprocessor, transform, get_feature_names, ALL_FEATURES

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
EXPLAINER_CACHE_PATH = MODELS_DIR / "shap_background.joblib"

# Human-readable labels for transformed feature name prefixes/fragments.
# Falls back to a cleaned-up raw name when no mapping exists.
FRIENDLY_LABELS = {
    "AMT_INCOME_TOTAL": "Income level",
    "AMT_CREDIT": "Requested credit amount",
    "AMT_ANNUITY": "Loan annuity size",
    "EXT_SOURCE_1": "External credit signal (source 1)",
    "EXT_SOURCE_2": "External credit signal (source 2)",
    "EXT_SOURCE_3": "External credit signal (source 3)",
    "BUREAU_LOAN_COUNT": "Number of prior bureau loans",
    "BUREAU_OVERDUE_RATIO": "Bureau overdue ratio",
    "PREV_APPLICATION_COUNT": "Prior applications with lenders",
    "PREV_APPROVAL_RATE": "Prior application approval rate",
    "INSTALLMENT_LATE_RATIO": "Late installment payment history",
    "INSTALLMENT_AVG_DAYS_LATE": "Average days late on installments",
    "DEBT_TO_INCOME": "Debt-to-income ratio",
    "ANNUITY_TO_INCOME": "Annuity-to-income ratio",
    "CREDIT_TERM": "Credit term length",
    "EMPLOYED_YEARS": "Years employed",
    "AGE_YEARS": "Applicant age",
    "EMPLOYED_TO_AGE_RATIO": "Employment stability ratio",
    "IS_THIN_FILE": "Thin-file applicant (no bureau history)",
    "syn_upi_txn_count_monthly": "Monthly transaction frequency",
    "syn_avg_txn_amount": "Average transaction size",
    "syn_txn_consistency": "Transaction consistency",
    "syn_utility_payment_reliability": "Utility payment reliability",
    "syn_monthly_savings_rate": "Monthly savings behavior",
    "syn_income_stability_score": "Income stability",
    "NAME_EDUCATION_TYPE": "Education level",
    "NAME_FAMILY_STATUS": "Family status",
    "NAME_HOUSING_TYPE": "Housing situation",
    "NAME_INCOME_TYPE": "Employment type",
}

SYNTHETIC_PREFIX = "syn_"


def _friendly_label(raw_feature_name: str) -> tuple[str, bool]:
    # raw_feature_name looks like "num__AMT_INCOME_TOTAL" or "cat__NAME_EDUCATION_TYPE_Married"
    base = raw_feature_name.split("__", 1)[-1]
    is_synthetic = base.startswith(SYNTHETIC_PREFIX)
    for key, label in FRIENDLY_LABELS.items():
        if base.startswith(key):
            suffix = base[len(key):].lstrip("_").replace("_", " ")
            return (f"{label} ({suffix})" if suffix else label), is_synthetic
    return base.replace("_", " ").title(), is_synthetic


def get_explainer(model, background_df: pd.DataFrame):
    ct = load_preprocessor()
    # tree_path_dependent avoids needing an explicit background dataset and
    # is robust to XGBoost's internal categorical-split handling.
    explainer = shap.TreeExplainer(model, feature_perturbation="tree_path_dependent")
    return explainer, ct


def explain_instance(model, ct, explainer, applicant_row: pd.DataFrame, top_k: int = 8) -> dict:
    """Returns real SHAP-derived contributions for a single applicant row."""
    X = transform(ct, applicant_row)
    shap_values = explainer.shap_values(X)
    if isinstance(shap_values, list):
        shap_values = shap_values[1]  # positive class for older SHAP API
    sv = np.asarray(shap_values).reshape(-1)

    feature_names = get_feature_names(ct)
    base_value = explainer.expected_value
    if isinstance(base_value, (list, np.ndarray)):
        arr = np.atleast_1d(base_value)
        base_value = float(arr[1]) if len(arr) > 1 else float(arr[0])
    else:
        base_value = float(base_value)

    contributions = []
    for name, val, xval in zip(feature_names, sv, X.reshape(-1)):
        label, is_syn = _friendly_label(name)
        contributions.append({
            "feature": name,
            "friendly_label": label,
            "shap_value": float(val),
            "contribution_type": "increases_risk" if val > 0 else "decreases_risk",
            "is_synthetic": is_syn,
            "feature_value": float(xval),
        })

    contributions.sort(key=lambda c: abs(c["shap_value"]), reverse=True)
    top = contributions[:top_k]

    return {
        "base_value": float(base_value),
        "prediction_margin": float(base_value + sv.sum()),
        "top_contributors": top,
        "positive_contributors": [c for c in top if c["contribution_type"] == "decreases_risk"],
        "negative_contributors": [c for c in top if c["contribution_type"] == "increases_risk"],
    }
