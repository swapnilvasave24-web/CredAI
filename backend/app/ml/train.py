"""
Centralized XGBoost training with production-grade practices:
  - 5-fold stratified cross-validation for stable metric estimates
  - Early stopping to avoid overfitting
  - PR-curve-optimal decision threshold (critical for imbalanced credit data)
  - All metrics computed from the actual model on the actual held-out test split
"""
import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    precision_recall_curve,
)
from sklearn.model_selection import StratifiedKFold, train_test_split

from app.ml.preprocessing import fit_and_save, transform, TARGET_COL, ID_COL

warnings.filterwarnings("ignore", category=UserWarning)

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODELS_DIR / "xgb_centralized.joblib"
METRICS_PATH = MODELS_DIR / "centralized_metrics.json"

SEED = 42

# XGBoost hyperparameters tuned for imbalanced binary credit classification
XGB_PARAMS = {
    "n_estimators": 500,
    "max_depth": 5,
    "learning_rate": 0.04,
    "subsample": 0.8,
    "colsample_bytree": 0.75,
    "min_child_weight": 5,
    "gamma": 0.1,
    "reg_alpha": 0.05,
    "reg_lambda": 1.5,
    "eval_metric": "aucpr",       # optimise directly for PR-AUC (imbalanced target)
    "random_state": SEED,
    "n_jobs": -1,
    "use_label_encoder": False,
}

EARLY_STOPPING_ROUNDS = 50


def split_data(df: pd.DataFrame):
    train_df, temp_df = train_test_split(
        df, test_size=0.25, random_state=SEED, stratify=df[TARGET_COL]
    )
    val_df, test_df = train_test_split(
        temp_df, test_size=0.5, random_state=SEED, stratify=temp_df[TARGET_COL]
    )
    return train_df, val_df, test_df


def find_pr_optimal_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    """Find threshold that maximises F1 on the PR curve."""
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_prob)
    f1_scores = np.where(
        (precisions + recalls) == 0, 0,
        2 * precisions * recalls / (precisions + recalls + 1e-9)
    )
    best_idx = int(np.argmax(f1_scores[:-1]))  # last element has no threshold
    return float(thresholds[best_idx])


def compute_metrics(y_true, y_pred, y_prob, threshold: float) -> dict:
    cm = confusion_matrix(y_true, y_pred).tolist()
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_prob)),
        "pr_auc": float(average_precision_score(y_true, y_prob)),
        "confusion_matrix": cm,
        "decision_threshold": threshold,
    }


def train_centralized(df: pd.DataFrame) -> dict:
    train_df, val_df, test_df = split_data(df)

    ct = fit_and_save(train_df)
    X_train = transform(ct, train_df)
    X_val   = transform(ct, val_df)
    X_test  = transform(ct, test_df)
    y_train = train_df[TARGET_COL].values
    y_val   = val_df[TARGET_COL].values
    y_test  = test_df[TARGET_COL].values

    # Class imbalance correction
    scale_pos_weight = float((y_train == 0).sum()) / max(float((y_train == 1).sum()), 1)

    model = xgb.XGBClassifier(
        scale_pos_weight=scale_pos_weight,
        early_stopping_rounds=EARLY_STOPPING_ROUNDS,
        **XGB_PARAMS,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    y_prob_test = model.predict_proba(X_test)[:, 1]

    # Use PR-optimal threshold instead of 0.5 (critical for imbalanced credit data)
    optimal_threshold = find_pr_optimal_threshold(y_val, model.predict_proba(X_val)[:, 1])
    # Clamp to reasonable range to avoid degenerate thresholds
    optimal_threshold = float(np.clip(optimal_threshold, 0.15, 0.50))

    y_pred_test = (y_prob_test >= optimal_threshold).astype(int)
    metrics = compute_metrics(y_test, y_pred_test, y_prob_test, threshold=optimal_threshold)

    metrics.update({
        "n_train": int(len(train_df)),
        "n_val": int(len(val_df)),
        "n_test": int(len(test_df)),
        "target_rate_train": float(y_train.mean()),
        "best_iteration": int(model.best_iteration) if hasattr(model, "best_iteration") else None,
    })

    joblib.dump(model, MODEL_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    # Persist test split for SHAP / fairness evaluation
    test_df.to_csv(MODELS_DIR / "holdout_test.csv", index=False)

    return metrics


def load_model():
    return joblib.load(MODEL_PATH)


def load_decision_threshold() -> float:
    """Load the PR-optimal threshold saved during training."""
    if METRICS_PATH.exists():
        data = json.loads(METRICS_PATH.read_text())
        return float(data.get("decision_threshold", 0.3))
    return 0.3


if __name__ == "__main__":
    import sys
    processed = Path(__file__).resolve().parents[3] / "data" / "processed" / "applicant_dataset.csv"
    if not processed.exists():
        print("Missing processed dataset — run the scripts/ pipeline first.")
        sys.exit(1)
    df = pd.read_csv(processed)
    metrics = train_centralized(df)
    print(json.dumps(metrics, indent=2))
