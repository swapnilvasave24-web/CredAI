"""
Partitions data/processed/applicant_dataset.csv into three NON-IID
federated clients: Bank A, Bank B, FinTech C. See data/README.md section 5
for the documented partitioning rationale.

Each client's local training/validation split never leaves its own file --
the federated learning code in backend/app/federated only ever loads a
client's own partition inside that client's simulated process, and only
model weights cross the "network" boundary.
"""
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split

SEED = 42
PROCESSED_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"
FED_DIR = Path(__file__).resolve().parents[1] / "data" / "federated"
FED_DIR.mkdir(parents=True, exist_ok=True)


def partition(df: pd.DataFrame, seed: int = SEED):
    rng = np.random.default_rng(seed)
    n = len(df)

    income_rank = df["AMT_INCOME_TOTAL"].rank(pct=True).to_numpy()
    is_salaried = df["NAME_INCOME_TYPE"].isin(["Working", "State servant"]).to_numpy()
    bureau_count = df["BUREAU_LOAN_COUNT"].to_numpy()
    age_years = df["AGE_YEARS"].to_numpy() if "AGE_YEARS" in df.columns else 40 * np.ones(n)

    # weighted-probability affinity scores per client (non-IID skew, not a hard rule)
    score_bank_a = 0.5 + 0.3 * is_salaried + 0.2 * (income_rank > 0.5)
    score_bank_b = 0.5 + 0.3 * (~is_salaried) + 0.2 * (income_rank <= 0.7)
    score_fintech_c = 0.5 + 0.3 * (age_years < 32) + 0.2 * (bureau_count <= 1)

    scores = np.vstack([score_bank_a, score_bank_b, score_fintech_c]).T
    probs = scores / scores.sum(axis=1, keepdims=True)
    assignment = np.array([rng.choice(3, p=probs[i]) for i in range(n)])

    clients = {}
    names = ["bank_a", "bank_b", "fintech_c"]
    for idx, name in enumerate(names):
        clients[name] = df[assignment == idx].reset_index(drop=True)
    return clients


def main():
    src = PROCESSED_DIR / "applicant_dataset.csv"
    if not src.exists():
        raise SystemExit(f"Run prepare_data.py + generate_synthetic_data.py first ({src} missing)")
    df = pd.read_csv(src)
    clients = partition(df)

    for name, cdf in clients.items():
        if "TARGET" in cdf.columns and cdf["TARGET"].nunique() > 1:
            train_df, val_df = train_test_split(
                cdf, test_size=0.2, random_state=SEED, stratify=cdf["TARGET"]
            )
        else:
            train_df, val_df = train_test_split(cdf, test_size=0.2, random_state=SEED)
        train_df.to_csv(FED_DIR / f"{name}_train.csv", index=False)
        val_df.to_csv(FED_DIR / f"{name}_val.csv", index=False)
        pos_rate = cdf["TARGET"].mean() if "TARGET" in cdf.columns else float("nan")
        print(f"{name}: n={len(cdf)} train={len(train_df)} val={len(val_df)} target_rate={pos_rate:.4f}")


if __name__ == "__main__":
    main()
