"""Runs federated training (FedAvg across Bank A / Bank B / FinTech C)."""
import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.federated.server import run_federated_training

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=5)
    parser.add_argument("--local-epochs", type=int, default=20)
    args = parser.parse_args()

    logs = run_federated_training(n_rounds=args.rounds, local_epochs=args.local_epochs)
    print("\nFinal round summary:")
    print(json.dumps(logs[-1], indent=2, default=str))
