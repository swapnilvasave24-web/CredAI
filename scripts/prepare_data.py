"""
Builds the applicant-level "real-schema" table used by the rest of the
pipeline, PLUS a printed dataset-inspection report (never fabricated --
always computed from whatever file is actually loaded).

Priority:
  1. If data/raw/application_train.csv exists (real Kaggle file), use it
     as-is (schema matches the columns referenced throughout this repo --
     see data/README.md section 1 for the exact real column names used).
  2. Otherwise fall back to the synthetic Home-Credit-schema generator so
     the whole pipeline still runs end-to-end.

Feature engineering here mirrors what would be done against the real
bureau/previous_application/installments tables (see data/README.md
section 3); when only the flat synthetic file is available, the relevant
aggregate columns are already embedded in it by
generate_homecredit_like_data.py (BUREAU_*, PREV_*, INSTALLMENT_*).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

REAL_FILE = RAW_DIR / "application_train.csv"
SYNTHETIC_FALLBACK = RAW_DIR / "application_train_synthetic.csv"


def load_source() -> tuple[pd.DataFrame, str]:
    if REAL_FILE.exists():
        return pd.read_csv(REAL_FILE), "real_kaggle_home_credit"
    if not SYNTHETIC_FALLBACK.exists():
        print("No raw data found. Run scripts/generate_homecredit_like_data.py first "
              "(or scripts/download_data.py if you have Kaggle credentials).")
        sys.exit(1)
    return pd.read_csv(SYNTHETIC_FALLBACK), "synthetic_homecredit_schema"


def inspect(df: pd.DataFrame) -> dict:
    report = {
        "n_records": len(df),
        "n_columns": df.shape[1],
        "dtypes": df.dtypes.astype(str).value_counts().to_dict(),
        "missing_values_total": int(df.isna().sum().sum()),
        "duplicate_records": int(df.duplicated().sum()),
        "target_distribution": df["TARGET"].value_counts(normalize=True).to_dict()
        if "TARGET" in df.columns else None,
    }
    return report


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["DEBT_TO_INCOME"] = (df["AMT_CREDIT"] / df["AMT_INCOME_TOTAL"]).replace([np.inf, -np.inf], np.nan)
    df["ANNUITY_TO_INCOME"] = (df["AMT_ANNUITY"] / df["AMT_INCOME_TOTAL"]).replace([np.inf, -np.inf], np.nan)
    df["CREDIT_TERM"] = (df["AMT_CREDIT"] / df["AMT_ANNUITY"]).replace([np.inf, -np.inf], np.nan)
    # DAYS_EMPLOYED has a known Home Credit sentinel value (365243) meaning "pensioner / not employed"
    df["IS_PENSIONER_SENTINEL"] = (df["DAYS_EMPLOYED"] == 365243).astype(int)
    days_employed_clean = df["DAYS_EMPLOYED"].where(df["DAYS_EMPLOYED"] != 365243, np.nan)
    df["EMPLOYED_YEARS"] = (-days_employed_clean / 365).clip(lower=0)
    df["AGE_YEARS"] = (-df["DAYS_BIRTH"] / 365).clip(lower=0)
    df["EMPLOYED_TO_AGE_RATIO"] = (df["EMPLOYED_YEARS"] / df["AGE_YEARS"]).fillna(0)
    bureau = df["BUREAU_LOAN_COUNT"].fillna(0) if "BUREAU_LOAN_COUNT" in df.columns else pd.Series(0, index=df.index)
    prev = df["PREV_APPLICATION_COUNT"].fillna(0) if "PREV_APPLICATION_COUNT" in df.columns else pd.Series(0, index=df.index)
    df["IS_THIN_FILE"] = ((bureau == 0) & (prev == 0)).astype(int)
    df.rename(columns={"SK_ID_CURR": "applicant_id"}, inplace=True)
    return df


def main():
    df, source_tag = load_source()
    report = inspect(df)
    print("=== Dataset Inspection Report ===")
    for k, v in report.items():
        print(f"{k}: {v}")
    print(f"Data source used: {source_tag}")

    df = engineer_features(df)
    out = PROCESSED_DIR / "applicant_dataset_real_layer.csv"
    df.to_csv(out, index=False)

    meta_path = PROCESSED_DIR / "dataset_report.txt"
    with open(meta_path, "w") as f:
        f.write(f"data_source={source_tag}\n")
        for k, v in report.items():
            f.write(f"{k}={v}\n")

    print(f"Wrote engineered real-schema layer to {out}")
    print(f"Wrote inspection report to {meta_path}")


if __name__ == "__main__":
    main()
