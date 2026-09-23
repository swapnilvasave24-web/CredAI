from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.entities import User, RoleEnum, FederatedRound, ModelVersion
from app.auth.security import require_role
from app.schemas.schemas import FederatedTrainRequest
from app.federated.server import run_federated_training

router = APIRouter(prefix="/federated", tags=["federated"])


@router.post("/train")
def start_federated_training(req: FederatedTrainRequest,
                              user: User = Depends(require_role(RoleEnum.ADMIN)),
                              db: Session = Depends(get_db)):
    """Runs real FedAvg training synchronously (kept simple/synchronous for
    prototype clarity; a production system would push this to a background
    worker/queue)."""
    try:
        round_logs = run_federated_training(n_rounds=req.rounds, local_epochs=req.local_epochs)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Federated client datasets or preprocessor not found. Run the data pipeline scripts first.",
        )

    last_version = db.query(ModelVersion).filter(ModelVersion.algorithm == "federated_fedavg").count()
    version_str = f"fedavg-v{last_version + 1}"

    for log in round_logs:
        db.add(FederatedRound(
            round_number=log["round_number"],
            status=log["status"],
            global_model_version=version_str,
            participating_clients=log["participating_clients"],
            metrics={"client_reports": log["client_reports"], "global_metrics": log["global_metrics"]},
        ))
    db.add(ModelVersion(version=version_str, algorithm="federated_fedavg",
                         metrics=round_logs[-1]["global_metrics"]))
    db.commit()

    return {
        "message": f"Federated training completed: {req.rounds} rounds.",
        "global_model_version": version_str,
        "final_global_metrics": round_logs[-1]["global_metrics"],
    }


@router.get("/status")
def federated_status(db: Session = Depends(get_db)):
    latest = db.query(FederatedRound).order_by(FederatedRound.round_number.desc()).first()
    if not latest:
        return {"status": "NOT_STARTED", "latest_round": None}
    return {
        "status": latest.status,
        "latest_round": latest.round_number,
        "global_model_version": latest.global_model_version,
        "global_metrics": latest.metrics.get("global_metrics") if latest.metrics else None,
        "participating_clients": latest.participating_clients,
    }


@router.get("/rounds")
def federated_rounds(db: Session = Depends(get_db)):
    rounds = db.query(FederatedRound).order_by(FederatedRound.round_number.asc()).all()
    return [
        {
            "round_number": r.round_number,
            "status": r.status,
            "global_model_version": r.global_model_version,
            "participating_clients": r.participating_clients,
            "metrics": r.metrics,
            "created_at": r.created_at,
        }
        for r in rounds
    ]
