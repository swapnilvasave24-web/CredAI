import json
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.entities import User, RoleEnum, FederatedRound
from app.auth.security import require_role

router = APIRouter(prefix="/institution", tags=["institution"])

FED_DIR = Path(__file__).resolve().parents[3] / "data" / "federated"

CLIENT_NAME_MAP = {
    "Bank A": "bank_a",
    "Bank B": "bank_b",
    "FinTech C": "fintech_c",
}


def _client_key_for_user(user: User) -> str:
    if not user.institution:
        raise HTTPException(status_code=403, detail="No institution is associated with this account.")
    key = CLIENT_NAME_MAP.get(user.institution.name)
    if not key:
        raise HTTPException(status_code=400, detail="Unknown institution mapping.")
    return key


@router.get("/status")
def institution_status(user: User = Depends(require_role(RoleEnum.INSTITUTION)), db: Session = Depends(get_db)):
    client_key = _client_key_for_user(user)
    train_path = FED_DIR / f"{client_key}_train.csv"
    val_path = FED_DIR / f"{client_key}_val.csv"

    if not train_path.exists():
        raise HTTPException(status_code=503, detail="Federated client data has not been prepared yet.")

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)

    latest_round = (
        db.query(FederatedRound).order_by(FederatedRound.round_number.desc()).first()
    )
    client_report = None
    if latest_round and latest_round.metrics:
        client_report = latest_round.metrics.get("client_reports", {}).get(client_key)

    return {
        "institution_name": user.institution.name,
        "institution_type": user.institution.type,
        "local_dataset_stats": {
            "n_train": int(len(train_df)),
            "n_val": int(len(val_df)),
            "target_rate_train": float(train_df["TARGET"].mean()) if "TARGET" in train_df.columns else None,
        },
        "latest_federated_round": latest_round.round_number if latest_round else None,
        "latest_round_status": latest_round.status if latest_round else "NOT_STARTED",
        "global_model_version": latest_round.global_model_version if latest_round else None,
        "local_model_report_from_last_round": client_report,
    }


@router.get("/metrics")
def institution_metrics(user: User = Depends(require_role(RoleEnum.INSTITUTION)), db: Session = Depends(get_db)):
    client_key = _client_key_for_user(user)
    latest_round = db.query(FederatedRound).order_by(FederatedRound.round_number.desc()).first()
    if not latest_round or not latest_round.metrics:
        raise HTTPException(status_code=404, detail="No federated training rounds have been run yet.")
    client_report = latest_round.metrics.get("client_reports", {}).get(client_key)
    if not client_report:
        raise HTTPException(status_code=404, detail="No local metrics recorded for this institution yet.")
    return {
        "institution_name": user.institution.name,
        "round_number": latest_round.round_number,
        "local_metrics": client_report,
        "global_metrics": latest_round.metrics.get("global_metrics"),
    }
