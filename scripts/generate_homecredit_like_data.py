"""
Generates a SYNTHETIC dataset that mirrors the schema and rough statistical
shape of Kaggle's "Home Credit Default Risk" application_train.csv, plus
lightweight stand-ins for bureau.csv / previous_application.csv /
installments_payments.csv aggregates.

WHY THIS EXISTS: this sandbox has no internet access to Kaggle. On a machine
with Kaggle credentials, run scripts/download_data.py + scripts/prepare_data.py
instead, which will produce data/processed/applicant_dataset.csv from the
REAL files with the SAME downstream column names used here, so no other
code in this repo needs to change.

This script does NOT invent alternative-data (UPI/utility/savings) columns
-- those are added separately and explicitly by
scripts/generate_synthetic_data.py so the "real-schema" vs "synthetic
alternative-data" layers stay auditable and separately labeled.
"""
import numpy as np
import pandas as pd
from pathlib import Path

SEED = 42
N_APPLICANTS = 20000

RAW_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)


def generate(n=N_APPLICANTS, seed=SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    income = rng.lognormal(mean=11.9, sigma=0.55, size=n).clip(25000, 2_000_000)
    age_days = -rng.integers(20 * 365, 69 * 365, size=n)  # DAYS_BIRTH negative like real data
    employed_days = -rng.integers(0, 40 * 365, size=n)
    employed_days = np.where(rng.random(n) < 0.05, 365243, employed_days)  # HomeCredit's "pensioner" sentinel

    credit_amt = income * rng.uniform(1.5, 6.0, size=n)
    annuity = credit_amt / rng.uniform(8, 30, size=n)

    education = rng.choice(
        ["Secondary", "Higher education", "Incomplete higher", "Lower secondary"],
        size=n, p=[0.55, 0.30, 0.10, 0.05]
    )
    family_status = rng.choice(
        ["Married", "Single / not married", "Civil marriage", "Widow", "Separated"],
        size=n, p=[0.55, 0.22, 0.10, 0.06, 0.07]
    )
    housing_type = rng.choice(
        ["House / apartment", "With parents", "Rented apartment", "Municipal apartment"],
        size=n, p=[0.70, 0.12, 0.10, 0.08]
    )
    employment_type = rng.choice(
        ["Working", "Commercial associate", "Pensioner", "State servant", "Self-employed"],
        size=n, p=[0.45, 0.20, 0.15, 0.10, 0.10]
    )
    gender = rng.choice(["F", "M"], size=n, p=[0.65, 0.35])  # roughly matches known public distribution

    # bureau aggregates
    bureau_count = rng.poisson(2.2, size=n)
    bureau_overdue_ratio = rng.beta(1.2, 8, size=n)  # mostly low overdue

    # previous application aggregates
    prev_app_count = rng.poisson(1.8, size=n)
    prev_approval_rate = rng.beta(6, 2, size=n)

    # installment payment behavior
    late_installment_ratio = rng.beta(1.1, 6, size=n)
    avg_days_late = late_installment_ratio * rng.uniform(0, 25, size=n)

    ext_source_1 = rng.beta(5, 5, size=n)
    ext_source_2 = rng.beta(5, 5, size=n)
    ext_source_3 = rng.beta(5, 5, size=n)

    # --- Latent risk score drives TARGET (this is the *only* place risk is
    # constructed; no single column trivially leaks it) ---
    z = (
        -0.9 * (income - income.mean()) / income.std()
        + 1.1 * (credit_amt / income - (credit_amt / income).mean()) / (credit_amt / income).std()
        + 1.3 * (late_installment_ratio - late_installment_ratio.mean()) / late_installment_ratio.std()
        + 0.8 * (bureau_overdue_ratio - bureau_overdue_ratio.mean()) / bureau_overdue_ratio.std()
        - 0.7 * (prev_approval_rate - prev_approval_rate.mean()) / prev_approval_rate.std()
        - 1.0 * ((ext_source_1 + ext_source_2 + ext_source_3) / 3
                 - ((ext_source_1 + ext_source_2 + ext_source_3) / 3).mean())
        / ((ext_source_1 + ext_source_2 + ext_source_3) / 3).std()
        + rng.normal(0, 1.0, size=n)  # irreducible noise
    )
    prob_default = 1 / (1 + np.exp(-(z - np.quantile(z, 0.91)) * 1.1))  # ~9% base rate
    target = (rng.random(n) < prob_default).astype(int)

    df = pd.DataFrame({
        "SK_ID_CURR": np.arange(100001, 100001 + n),
        "TARGET": target,
        "CODE_GENDER": gender,
        "DAYS_BIRTH": age_days,
        "DAYS_EMPLOYED": employed_days,
        "AMT_INCOME_TOTAL": income.round(2),
        "AMT_CREDIT": credit_amt.round(2),
        "AMT_ANNUITY": annuity.round(2),
        "NAME_EDUCATION_TYPE": education,
        "NAME_FAMILY_STATUS": family_status,
        "NAME_HOUSING_TYPE": housing_type,
        "NAME_INCOME_TYPE": employment_type,
        "EXT_SOURCE_1": ext_source_1.round(4),
        "EXT_SOURCE_2": ext_source_2.round(4),
        "EXT_SOURCE_3": ext_source_3.round(4),
        "BUREAU_LOAN_COUNT": bureau_count,
        "BUREAU_OVERDUE_RATIO": bureau_overdue_ratio.round(4),
        "PREV_APPLICATION_COUNT": prev_app_count,
        "PREV_APPROVAL_RATE": prev_approval_rate.round(4),
        "INSTALLMENT_LATE_RATIO": late_installment_ratio.round(4),
        "INSTALLMENT_AVG_DAYS_LATE": avg_days_late.round(2),
    })
    return df


if __name__ == "__main__":
    df = generate()
    out = RAW_DIR / "application_train_synthetic.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} rows to {out}")
    print(f"TARGET positive rate: {df['TARGET'].mean():.4f}")
