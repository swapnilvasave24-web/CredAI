import json
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.entities import (
    User, RoleEnum, ApplicantProfile, Institution, FederatedRound, CreditAssessment,
)
from app.auth.security import require_role
from app.ml.train import METRICS_PATH, MODEL_PATH
from app.ml.preprocessing import load_preprocessor, transform
from app.ml.train import load_model
from app.fairness.fairness_eval import evaluate_group_fairness

router = APIRouter(prefix="/admin", tags=["admin"])

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"


@router.get("/dashboard")
def admin_dashboard(
    user: User = Depends(require_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    total_applicants  = db.query(ApplicantProfile).count()
    total_institutions = db.query(Institution).count()
    total_assessments  = db.query(CreditAssessment).count()
    latest_round       = db.query(FederatedRound).order_by(FederatedRound.round_number.desc()).first()

    centralized_metrics = None
    data_mode = "synthetic"
    if METRICS_PATH.exists():
        centralized_metrics = json.loads(METRICS_PATH.read_text())
        # Detect data mode from training metadata if available
        real_data_marker = MODELS_DIR.parent / "data" / "raw" / "application_train.csv"
        data_mode = "real" if real_data_marker.exists() else "synthetic"

    return {
        "total_applicants":            total_applicants,
        "total_institutions":          total_institutions,
        "total_assessments":           total_assessments,
        "current_global_model_version": latest_round.global_model_version if latest_round else None,
        "latest_federated_round":      latest_round.round_number if latest_round else None,
        "centralized_metrics":         centralized_metrics,
        "federated_metrics":           (
            latest_round.metrics.get("global_metrics")
            if latest_round and latest_round.metrics else None
        ),
        "system_status":  "OPERATIONAL" if MODEL_PATH.exists() else "MODEL_NOT_TRAINED",
        "data_mode":      data_mode,
    }


@router.get("/model-metrics")
def model_metrics(user: User = Depends(require_role(RoleEnum.ADMIN))):
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=404, detail="No centralized model metrics available yet.")
    centralized = json.loads(METRICS_PATH.read_text())

    fed_rounds_path = MODELS_DIR / "federated_rounds.json"
    federated = None
    if fed_rounds_path.exists():
        rounds = json.loads(fed_rounds_path.read_text())
        federated = rounds[-1]["global_metrics"] if rounds else None

    return {
        "centralized": centralized,
        "federated":   federated,
    }


@router.get("/fairness")
def fairness_metrics(user: User = Depends(require_role(RoleEnum.ADMIN))):
    holdout_path = MODELS_DIR / "holdout_test.csv"
    if not holdout_path.exists() or not MODEL_PATH.exists():
        raise HTTPException(status_code=404, detail="Model or holdout set not available yet.")

    holdout = pd.read_csv(holdout_path)
    model   = load_model()
    ct      = load_preprocessor()
    probs   = model.predict_proba(transform(ct, holdout))[:, 1]
    holdout = holdout.copy()

    from app.ml.train import load_decision_threshold
    threshold = load_decision_threshold()
    holdout["pred"] = (probs >= threshold).astype(int)

    if "CODE_GENDER" not in holdout.columns:
        raise HTTPException(
            status_code=404,
            detail="No group attribute available in this dataset for fairness evaluation.",
        )

    return evaluate_group_fairness(holdout, "TARGET", "pred", "CODE_GENDER")
