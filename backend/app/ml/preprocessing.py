"""
Single shared preprocessing pipeline used identically for:
  - centralized training
  - federated client training
  - validation / test evaluation
  - live inference

This guarantees no train/inference skew. Fit ONLY on the training split;
persisted with joblib and reloaded everywhere else.
"""
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.joblib"

NUMERIC_FEATURES = [
    "AMT_INCOME_TOTAL", "AMT_CREDIT", "AMT_ANNUITY",
    "EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3",
    "BUREAU_LOAN_COUNT", "BUREAU_OVERDUE_RATIO",
    "PREV_APPLICATION_COUNT", "PREV_APPROVAL_RATE",
    "INSTALLMENT_LATE_RATIO", "INSTALLMENT_AVG_DAYS_LATE",
    "DEBT_TO_INCOME", "ANNUITY_TO_INCOME", "CREDIT_TERM",
    "EMPLOYED_YEARS", "AGE_YEARS", "EMPLOYED_TO_AGE_RATIO",
    "IS_THIN_FILE",
    "syn_upi_txn_count_monthly", "syn_avg_txn_amount", "syn_txn_consistency",
    "syn_utility_payment_reliability", "syn_monthly_savings_rate",
    "syn_income_stability_score",
]

CATEGORICAL_FEATURES = [
    "NAME_EDUCATION_TYPE", "NAME_FAMILY_STATUS",
    "NAME_HOUSING_TYPE", "NAME_INCOME_TYPE",
]

TARGET_COL = "TARGET"
ID_COL = "applicant_id"

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def ensure_features(df: pd.DataFrame) -> pd.DataFrame:
    """Ensures derived features like IS_THIN_FILE are present across training and inference."""
    df = df.copy()
    if "IS_THIN_FILE" not in df.columns:
        bureau = df["BUREAU_LOAN_COUNT"].fillna(0) if "BUREAU_LOAN_COUNT" in df.columns else pd.Series(0, index=df.index)
        prev = df["PREV_APPLICATION_COUNT"].fillna(0) if "PREV_APPLICATION_COUNT" in df.columns else pd.Series(0, index=df.index)
        df["IS_THIN_FILE"] = ((bureau == 0) & (prev == 0)).astype(float)
    return df


def build_pipeline() -> ColumnTransformer:
    numeric_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    categorical_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", numeric_pipe, NUMERIC_FEATURES),
        ("cat", categorical_pipe, CATEGORICAL_FEATURES),
    ])


def fit_and_save(df: pd.DataFrame) -> ColumnTransformer:
    df = ensure_features(df)
    ct = build_pipeline()
    ct.fit(df[ALL_FEATURES])
    joblib.dump(ct, PREPROCESSOR_PATH)
    return ct


def load_preprocessor() -> ColumnTransformer:
    if not PREPROCESSOR_PATH.exists():
        raise FileNotFoundError(
            f"No fitted preprocessor at {PREPROCESSOR_PATH}. Run scripts/train_baseline.py first."
        )
    return joblib.load(PREPROCESSOR_PATH)


def transform(ct: ColumnTransformer, df: pd.DataFrame) -> np.ndarray:
    df = ensure_features(df)
    return ct.transform(df[ALL_FEATURES])


def get_feature_names(ct: ColumnTransformer) -> list[str]:
    return list(ct.get_feature_names_out())
