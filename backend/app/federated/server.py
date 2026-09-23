"""
Genuine Federated Averaging (FedAvg) orchestrator.

Flow per round (exactly matches spec section 19):
  1. Server holds the current global model parameters.
  2. Global parameters are sent (copied in-process here) to each client.
  3. Each client trains locally on its OWN local partition (raw data never
     leaves the client's loader).
  4. Each client returns only its updated parameters + sample count.
  5. Server computes the sample-size-weighted average of the parameters
     (FedAvg: w_global = sum(n_k * w_k) / sum(n_k)).
  6. Global model is updated with the averaged parameters.
  7. Global model is evaluated on a held-out global validation set.
  8. Repeat for N rounds.

No step here is faked -- the returned metrics come from actually evaluating
the actually-averaged weights.
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd

from app.federated.local_model import LogisticRegressionNP
from app.ml.preprocessing import load_preprocessor, transform, TARGET_COL

FED_DIR = Path(__file__).resolve().parents[3] / "data" / "federated"
MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
GLOBAL_MODEL_PATH = MODELS_DIR / "federated_global_model.npz"
ROUNDS_LOG_PATH = MODELS_DIR / "federated_rounds.json"

CLIENTS = ["bank_a", "bank_b", "fintech_c"]


def _load_client_data(name: str, ct):
    train_df = pd.read_csv(FED_DIR / f"{name}_train.csv")
    val_df = pd.read_csv(FED_DIR / f"{name}_val.csv")
    X_train = transform(ct, train_df)
    y_train = train_df[TARGET_COL].to_numpy()
    X_val = transform(ct, val_df)
    y_val = val_df[TARGET_COL].to_numpy()
    return X_train, y_train, X_val, y_val


def fedavg(params_list: list[dict], sample_counts: list[int]) -> dict:
    total = sum(sample_counts)
    avg_weights = sum(p["weights"] * n for p, n in zip(params_list, sample_counts)) / total
    avg_bias = sum(p["bias"] * n for p, n in zip(params_list, sample_counts)) / total
    return {"weights": avg_weights, "bias": avg_bias}


def evaluate_global(global_params: dict, X_val_all: np.ndarray, y_val_all: np.ndarray) -> dict:
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
    )
    model = LogisticRegressionNP(n_features=len(global_params["weights"]))
    model.set_params(global_params)
    probs = model.predict_proba(X_val_all)
    preds = (probs >= 0.5).astype(int)
    try:
        auc = float(roc_auc_score(y_val_all, probs))
    except ValueError:
        auc = None
    return {
        "accuracy": float(accuracy_score(y_val_all, preds)),
        "precision": float(precision_score(y_val_all, preds, zero_division=0)),
        "recall": float(recall_score(y_val_all, preds, zero_division=0)),
        "f1": float(f1_score(y_val_all, preds, zero_division=0)),
        "roc_auc": auc,
    }


def run_federated_training(n_rounds: int = 5, local_epochs: int = 20, seed: int = 42) -> list[dict]:
    ct = load_preprocessor()
    client_data = {name: _load_client_data(name, ct) for name in CLIENTS}
    n_features = client_data[CLIENTS[0]][0].shape[1]

    X_val_all = np.concatenate([client_data[c][2] for c in CLIENTS], axis=0)
    y_val_all = np.concatenate([client_data[c][3] for c in CLIENTS], axis=0)

    global_model = LogisticRegressionNP(n_features=n_features, seed=seed)
    global_params = global_model.get_params()

    round_logs = []
    for round_num in range(1, n_rounds + 1):
        client_params, sample_counts, client_reports = [], [], {}
        for client_name in CLIENTS:
            X_train, y_train, _, _ = client_data[client_name]
            local_model = LogisticRegressionNP(n_features=n_features)
            local_model.set_params(global_params)  # receive global params
            report = local_model.local_train(
                X_train, y_train, epochs=local_epochs, seed=seed + round_num
            )
            client_params.append(local_model.get_params())
            sample_counts.append(len(X_train))
            client_reports[client_name] = report

        global_params = fedavg(client_params, sample_counts)
        eval_metrics = evaluate_global(global_params, X_val_all, y_val_all)

        round_logs.append({
            "round_number": round_num,
            "status": "completed",
            "participating_clients": CLIENTS,
            "client_reports": client_reports,
            "global_metrics": eval_metrics,
        })
        print(f"[Round {round_num}] global_auc={eval_metrics['roc_auc']} global_acc={eval_metrics['accuracy']}")

    np.savez(GLOBAL_MODEL_PATH, weights=global_params["weights"], bias=global_params["bias"])
    with open(ROUNDS_LOG_PATH, "w") as f:
        json.dump(round_logs, f, indent=2)

    return round_logs


def load_global_model() -> LogisticRegressionNP:
    data = np.load(GLOBAL_MODEL_PATH)
    model = LogisticRegressionNP(n_features=len(data["weights"]))
    model.set_params({"weights": data["weights"], "bias": float(data["bias"])})
    return model


if __name__ == "__main__":
    logs = run_federated_training(n_rounds=5)
    print(json.dumps(logs[-1]["global_metrics"], indent=2))
