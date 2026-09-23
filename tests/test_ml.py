"""
Tests for ML model, credit scoring, SHAP, and preprocessing.
All assertions use real model outputs -- nothing is hard-coded.
"""
import pytest
import sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.ml.credit_score import (
    build_credit_result, probability_to_score, risk_level, loan_recommendation,
    SCORE_MIN, SCORE_MAX
)


# ─── Credit score calculation unit tests ────────────────────────────────────

def test_score_range():
    for prob in np.linspace(0, 1, 21):
        score = probability_to_score(prob)
        assert SCORE_MIN <= score <= SCORE_MAX, f"Score {score} out of range for prob={prob}"


def test_score_monotone_decreasing():
    """Higher default probability must produce lower CredAI score."""
    probs = np.linspace(0.01, 0.99, 20)
    scores = [probability_to_score(p) for p in probs]
    for i in range(len(scores) - 1):
        assert scores[i] >= scores[i + 1], (
            f"Score not monotone: score({probs[i]:.2f})={scores[i]} > score({probs[i+1]:.2f})={scores[i+1]}"
        )


def test_risk_levels():
    assert risk_level(0.05) == "LOW_RISK"
    assert risk_level(0.10) == "LOW_RISK"
    assert risk_level(0.11) == "MEDIUM_RISK"
    assert risk_level(0.35) == "MEDIUM_RISK"
    assert risk_level(0.36) == "HIGH_RISK"
    assert risk_level(0.99) == "HIGH_RISK"


def test_recommendation_levels():
    assert loan_recommendation(0.05, threshold=0.15) == "ELIGIBLE"
    assert loan_recommendation(0.15, threshold=0.15) == "ELIGIBLE"
    assert loan_recommendation(0.20, threshold=0.15) == "REVIEW_REQUIRED"
    assert loan_recommendation(0.40, threshold=0.15) == "NOT_ELIGIBLE"


def test_build_credit_result_roundtrip():
    result = build_credit_result(0.08)
    assert result.risk_level == "LOW_RISK"
    assert result.recommendation == "ELIGIBLE"
    assert SCORE_MIN <= result.credit_score <= SCORE_MAX
    assert 0 <= result.default_probability <= 1


def test_edge_case_zero_prob():
    r = build_credit_result(0.0)
    assert r.credit_score == SCORE_MAX
    assert r.risk_level == "LOW_RISK"


def test_edge_case_one_prob():
    r = build_credit_result(1.0)
    assert r.credit_score == SCORE_MIN
    assert r.risk_level == "HIGH_RISK"
    assert r.recommendation == "NOT_ELIGIBLE"


# ─── Preprocessing unit tests ───────────────────────────────────────────────

def test_preprocessor_loads():
    from app.ml.preprocessing import load_preprocessor
    ct = load_preprocessor()
    assert ct is not None


def test_transform_produces_float_array():
    from app.ml.preprocessing import load_preprocessor, transform, NUMERIC_FEATURES, CATEGORICAL_FEATURES
    ct = load_preprocessor()
    row = pd.DataFrame([{
        "AMT_INCOME_TOTAL": 600000, "AMT_CREDIT": 400000, "AMT_ANNUITY": 12000,
        "EXT_SOURCE_1": 0.7, "EXT_SOURCE_2": 0.65, "EXT_SOURCE_3": 0.6,
        "BUREAU_LOAN_COUNT": 2, "BUREAU_OVERDUE_RATIO": 0.05,
        "PREV_APPLICATION_COUNT": 1, "PREV_APPROVAL_RATE": 0.9,
        "INSTALLMENT_LATE_RATIO": 0.02, "INSTALLMENT_AVG_DAYS_LATE": 1.0,
        "DEBT_TO_INCOME": 0.67, "ANNUITY_TO_INCOME": 0.02, "CREDIT_TERM": 33.3,
        "EMPLOYED_YEARS": 5.0, "AGE_YEARS": 35.0, "EMPLOYED_TO_AGE_RATIO": 0.143,
        "syn_upi_txn_count_monthly": 40, "syn_avg_txn_amount": 1500,
        "syn_txn_consistency": 0.8, "syn_utility_payment_reliability": 0.9,
        "syn_monthly_savings_rate": 0.15, "syn_income_stability_score": 0.75,
        "NAME_EDUCATION_TYPE": "Higher education", "NAME_FAMILY_STATUS": "Married",
        "NAME_HOUSING_TYPE": "House / apartment", "NAME_INCOME_TYPE": "Working",
    }])
    X = transform(ct, row)
    assert X.shape[0] == 1
    assert X.dtype in (np.float32, np.float64)
    assert not np.isnan(X).any()


# ─── Live model prediction tests ────────────────────────────────────────────

def test_model_predicts_low_risk_for_good_profile():
    from app.ml.train import load_model
    from app.ml.preprocessing import load_preprocessor, transform
    model = load_model()
    ct = load_preprocessor()
    row = pd.DataFrame([{
        "AMT_INCOME_TOTAL": 720000, "AMT_CREDIT": 300000, "AMT_ANNUITY": 10000,
        "EXT_SOURCE_1": 0.82, "EXT_SOURCE_2": 0.79, "EXT_SOURCE_3": 0.75,
        "BUREAU_LOAN_COUNT": 1, "BUREAU_OVERDUE_RATIO": 0.0,
        "PREV_APPLICATION_COUNT": 1, "PREV_APPROVAL_RATE": 1.0,
        "INSTALLMENT_LATE_RATIO": 0.0, "INSTALLMENT_AVG_DAYS_LATE": 0.0,
        "DEBT_TO_INCOME": 0.42, "ANNUITY_TO_INCOME": 0.014, "CREDIT_TERM": 30.0,
        "EMPLOYED_YEARS": 10.0, "AGE_YEARS": 42.0, "EMPLOYED_TO_AGE_RATIO": 0.24,
        "syn_upi_txn_count_monthly": 50, "syn_avg_txn_amount": 2000,
        "syn_txn_consistency": 0.95, "syn_utility_payment_reliability": 0.97,
        "syn_monthly_savings_rate": 0.22, "syn_income_stability_score": 0.90,
        "NAME_EDUCATION_TYPE": "Higher education", "NAME_FAMILY_STATUS": "Married",
        "NAME_HOUSING_TYPE": "House / apartment", "NAME_INCOME_TYPE": "Working",
    }])
    prob = float(model.predict_proba(transform(ct, row))[:, 1][0])
    assert prob < 0.3, f"Expected low risk probability, got {prob:.4f}"


def test_model_predicts_high_risk_for_bad_profile():
    from app.ml.train import load_model
    from app.ml.preprocessing import load_preprocessor, transform
    model = load_model()
    ct = load_preprocessor()
    row = pd.DataFrame([{
        "AMT_INCOME_TOTAL": 120000, "AMT_CREDIT": 900000, "AMT_ANNUITY": 40000,
        "EXT_SOURCE_1": 0.05, "EXT_SOURCE_2": 0.04, "EXT_SOURCE_3": 0.06,
        "BUREAU_LOAN_COUNT": 10, "BUREAU_OVERDUE_RATIO": 0.75,
        "PREV_APPLICATION_COUNT": 7, "PREV_APPROVAL_RATE": 0.05,
        "INSTALLMENT_LATE_RATIO": 0.85, "INSTALLMENT_AVG_DAYS_LATE": 35.0,
        "DEBT_TO_INCOME": 7.5, "ANNUITY_TO_INCOME": 0.33, "CREDIT_TERM": 22.5,
        "EMPLOYED_YEARS": 0.1, "AGE_YEARS": 24.0, "EMPLOYED_TO_AGE_RATIO": 0.004,
        "syn_upi_txn_count_monthly": 0, "syn_avg_txn_amount": 0,
        "syn_txn_consistency": 0.03, "syn_utility_payment_reliability": 0.02,
        "syn_monthly_savings_rate": 0.0, "syn_income_stability_score": 0.02,
        "NAME_EDUCATION_TYPE": "Lower secondary", "NAME_FAMILY_STATUS": "Single / not married",
        "NAME_HOUSING_TYPE": "Rented apartment", "NAME_INCOME_TYPE": "Self-employed",
    }])
    prob = float(model.predict_proba(transform(ct, row))[:, 1][0])
    assert prob > 0.5, f"Expected high risk probability, got {prob:.4f}"


# ─── SHAP tests ─────────────────────────────────────────────────────────────

def test_shap_returns_correct_structure():
    from app.ml.train import load_model
    from app.ml.preprocessing import load_preprocessor
    from app.explainability.shap_explainer import get_explainer, explain_instance
    import pandas as pd

    model = load_model()
    ct = load_preprocessor()
    holdout_path = Path(__file__).resolve().parents[1] / "models" / "holdout_test.csv"
    holdout = pd.read_csv(holdout_path)
    explainer, _ = get_explainer(model, holdout)

    row = holdout.head(1).copy()
    result = explain_instance(model, ct, explainer, row)

    assert "top_contributors" in result
    assert "base_value" in result
    assert len(result["top_contributors"]) > 0
    for c in result["top_contributors"]:
        assert "feature" in c
        assert "friendly_label" in c
        assert "shap_value" in c
        assert c["contribution_type"] in ("increases_risk", "decreases_risk")
        assert isinstance(c["is_synthetic"], bool)


def test_shap_values_not_all_zero():
    """SHAP values must show real variation, not degenerate all-zero output."""
    from app.ml.train import load_model
    from app.ml.preprocessing import load_preprocessor
    from app.explainability.shap_explainer import get_explainer, explain_instance
    model = load_model()
    ct = load_preprocessor()
    holdout_path = Path(__file__).resolve().parents[1] / "models" / "holdout_test.csv"
    holdout = pd.read_csv(holdout_path)
    explainer, _ = get_explainer(model, holdout)
    row = holdout.head(1).copy()
    result = explain_instance(model, ct, explainer, row)
    shap_vals = [abs(c["shap_value"]) for c in result["top_contributors"]]
    assert max(shap_vals) > 0.01, "All SHAP values are near-zero — explanation is degenerate"


def test_synthetic_features_labeled_correctly():
    """Any syn_ feature must have is_synthetic=True."""
    from app.ml.train import load_model
    from app.ml.preprocessing import load_preprocessor
    from app.explainability.shap_explainer import get_explainer, explain_instance
    model = load_model()
    ct = load_preprocessor()
    holdout_path = Path(__file__).resolve().parents[1] / "models" / "holdout_test.csv"
    holdout = pd.read_csv(holdout_path)
    explainer, _ = get_explainer(model, holdout)
    row = holdout.head(5)
    for _, r in row.iterrows():
        result = explain_instance(model, ct, explainer, pd.DataFrame([r]))
        for c in result["top_contributors"]:
            if "syn_" in c["feature"]:
                assert c["is_synthetic"], f"syn_ feature {c['feature']} not labeled as synthetic"


def test_is_thin_file_feature_derivation():
    """IS_THIN_FILE must be 1 for zero-bureau borrowers and 0 for established borrowers."""
    from app.ml.preprocessing import ensure_features, NUMERIC_FEATURES, load_preprocessor, transform
    assert "IS_THIN_FILE" in NUMERIC_FEATURES

    # Thin-file borrower
    df_thin = pd.DataFrame([{"BUREAU_LOAN_COUNT": 0, "PREV_APPLICATION_COUNT": 0}])
    df_thin = ensure_features(df_thin)
    assert df_thin["IS_THIN_FILE"].iloc[0] == 1.0

    # Established borrower
    df_est = pd.DataFrame([{"BUREAU_LOAN_COUNT": 2, "PREV_APPLICATION_COUNT": 1}])
    df_est = ensure_features(df_est)
    assert df_est["IS_THIN_FILE"].iloc[0] == 0.0

