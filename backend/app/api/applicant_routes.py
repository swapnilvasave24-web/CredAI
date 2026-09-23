from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.entities import User, ApplicantProfile, CreditAssessment, RoleEnum
from app.schemas.schemas import (
    ApplicantProfileOut, ApplicantProfileUpdate, AssessmentRequest,
    AssessmentResult, AssessmentHistoryItem, ExplanationItem,
)
from app.auth.security import require_role
from app.services.inference_service import run_assessment

router = APIRouter(tags=["applicant"])


def _get_own_profile(user: User, db: Session) -> ApplicantProfile:
    profile = db.query(ApplicantProfile).filter(ApplicantProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Applicant profile not found.")
    return profile


@router.get("/applicant/profile", response_model=ApplicantProfileOut)
def get_profile(user: User = Depends(require_role(RoleEnum.APPLICANT)), db: Session = Depends(get_db)):
    return _get_own_profile(user, db)


@router.put("/applicant/profile", response_model=ApplicantProfileOut)
def update_profile(update: ApplicantProfileUpdate, user: User = Depends(require_role(RoleEnum.APPLICANT)),
                    db: Session = Depends(get_db)):
    profile = _get_own_profile(user, db)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/assessments", response_model=AssessmentResult)
def create_assessment(req: AssessmentRequest, user: User = Depends(require_role(RoleEnum.APPLICANT)),
                       db: Session = Depends(get_db)):
    profile = _get_own_profile(user, db)
    try:
        assessment = run_assessment(db, profile, req)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model is not available yet. An administrator must run the training pipeline first.",
        )
    contributors = [
        ExplanationItem(
            feature=e.feature, friendly_label=e.friendly_label, shap_value=e.shap_value,
            contribution_type=e.contribution_type, is_synthetic=e.is_synthetic,
        )
        for e in assessment.explanations
    ]
    return AssessmentResult(
        id=assessment.id, model_version=assessment.model_version, credit_score=assessment.credit_score,
        risk_level=assessment.risk_level, default_probability=assessment.default_probability,
        recommendation=assessment.recommendation, created_at=assessment.created_at,
        top_contributors=contributors,
    )


@router.get("/assessments", response_model=list[AssessmentHistoryItem])
def list_assessments(user: User = Depends(require_role(RoleEnum.APPLICANT)), db: Session = Depends(get_db)):
    profile = _get_own_profile(user, db)
    assessments = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.applicant_id == profile.id)
        .order_by(CreditAssessment.created_at.desc())
        .all()
    )
    return assessments


@router.get("/assessments/{assessment_id}", response_model=AssessmentResult)
def get_assessment(assessment_id: int, user: User = Depends(require_role(RoleEnum.APPLICANT)),
                    db: Session = Depends(get_db)):
    profile = _get_own_profile(user, db)
    assessment = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.id == assessment_id, CreditAssessment.applicant_id == profile.id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    contributors = [
        ExplanationItem(
            feature=e.feature, friendly_label=e.friendly_label, shap_value=e.shap_value,
            contribution_type=e.contribution_type, is_synthetic=e.is_synthetic,
        )
        for e in assessment.explanations
    ]
    return AssessmentResult(
        id=assessment.id, model_version=assessment.model_version, credit_score=assessment.credit_score,
        risk_level=assessment.risk_level, default_probability=assessment.default_probability,
        recommendation=assessment.recommendation, created_at=assessment.created_at,
        top_contributors=contributors,
    )


@router.get("/assessments/{assessment_id}/explanation", response_model=list[ExplanationItem])
def get_explanation(assessment_id: int, user: User = Depends(require_role(RoleEnum.APPLICANT)),
                     db: Session = Depends(get_db)):
    profile = _get_own_profile(user, db)
    assessment = (
        db.query(CreditAssessment)
        .filter(CreditAssessment.id == assessment_id, CreditAssessment.applicant_id == profile.id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return [
        ExplanationItem(
            feature=e.feature, friendly_label=e.friendly_label, shap_value=e.shap_value,
            contribution_type=e.contribution_type, is_synthetic=e.is_synthetic,
        )
        for e in assessment.explanations
    ]
