"""Runs the centralized XGBoost baseline training end-to-end."""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import pandas as pd
from app.ml.train import train_centralized

PROCESSED = Path(__file__).resolve().parents[1] / "data" / "processed" / "applicant_dataset.csv"

if __name__ == "__main__":
    if not PROCESSED.exists():
        print(f"Missing {PROCESSED}. Run generate_homecredit_like_data.py -> prepare_data.py -> "
              f"generate_synthetic_data.py -> create_federated_clients.py first.")
        sys.exit(1)
    df = pd.read_csv(PROCESSED)
    metrics = train_centralized(df)
    print("Centralized baseline metrics:")
    print(json.dumps(metrics, indent=2))
