"""
Generates the CLEARLY-LABELED synthetic alternative-data layer
(UPI-style transactions, utility payment reliability, savings behavior,
income stability) on top of the real-schema dataset.

These columns must NEVER be presented as real banking data. Every column
here is prefixed `syn_` and the API sets `is_synthetic=True` on the
corresponding explanation rows so the frontend can show a
"Synthetic Prototype Data" badge.

Fixed seed for reproducibility. Values are derived from already-existing
real-schema fields (income, employment stability, real late-payment ratio)
so relationships are statistically plausible, but TARGET is never used as
an input, so these columns cannot leak the label directly.
"""
import numpy as np
import pandas as pd
from pathlib import Path

SEED = 42


def add_synthetic_alt_data(df: pd.DataFrame, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n = len(df)

    income = df["AMT_INCOME_TOTAL"].to_numpy()
    income_decile = pd.qcut(income, 10, labels=False, duplicates="drop")
    employed_days = df["DAYS_EMPLOYED"].to_numpy()
    employment_stability_raw = np.clip(-employed_days / (10 * 365), 0, 1)
    real_late_ratio = df["INSTALLMENT_LATE_RATIO"].to_numpy()

    upi_txn_count = rng.poisson(lam=(income_decile + 1) * 3.5, size=n)
    avg_txn_amount = rng.lognormal(mean=np.log(income / 40 + 1), sigma=0.4, size=n)

    txn_consistency = np.clip(
        rng.beta(3 + employment_stability_raw * 4, 3, size=n), 0, 1
    )

    # negatively correlated with real late-payment ratio (plausible real-world link)
    utility_reliability = np.clip(
        rng.beta(5 * (1 - real_late_ratio) + 1, 2, size=n), 0, 1
    )

    savings_rate = np.clip(
        rng.normal(loc=0.08 + income_decile * 0.01, scale=0.05, size=n), 0, 0.6
    )

    income_stability_score = np.clip(
        employment_stability_raw * 0.7 + rng.normal(0, 0.1, size=n), 0, 1
    )

    df = df.copy()
    df["syn_upi_txn_count_monthly"] = upi_txn_count
    df["syn_avg_txn_amount"] = avg_txn_amount.round(2)
    df["syn_txn_consistency"] = txn_consistency.round(4)
    df["syn_utility_payment_reliability"] = utility_reliability.round(4)
    df["syn_monthly_savings_rate"] = savings_rate.round(4)
    df["syn_income_stability_score"] = income_stability_score.round(4)
    if "IS_THIN_FILE" not in df.columns:
        bureau = df["BUREAU_LOAN_COUNT"].fillna(0) if "BUREAU_LOAN_COUNT" in df.columns else pd.Series(0, index=df.index)
        prev = df["PREV_APPLICATION_COUNT"].fillna(0) if "PREV_APPLICATION_COUNT" in df.columns else pd.Series(0, index=df.index)
        df["IS_THIN_FILE"] = ((bureau == 0) & (prev == 0)).astype(int)
    return df


if __name__ == "__main__":
    processed_dir = Path(__file__).resolve().parents[1] / "data" / "processed"
    src = processed_dir / "applicant_dataset_real_layer.csv"
    if not src.exists():
        raise SystemExit(f"Run prepare_data.py first to create {src}")
    df = pd.read_csv(src)
    df = add_synthetic_alt_data(df)
    out = processed_dir / "applicant_dataset.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} rows with synthetic alt-data layer to {out}")
