from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.entities import User, ApplicantProfile, RoleEnum
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.auth.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        role=RoleEnum.APPLICANT,  # public signup is always an Applicant; institution/admin accounts are provisioned separately
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(ApplicantProfile(user_id=user.id))
    db.commit()

    token = create_access_token(subject=user.email, role=user.role.value)
    return TokenResponse(access_token=token, role=user.role.value, name=user.name)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(subject=user.email, role=user.role.value)
    return TokenResponse(access_token=token, role=user.role.value, name=user.name)


@router.post("/logout")
def logout():
    # JWTs are stateless; logout is handled client-side by discarding the token.
    return {"message": "Logged out. Discard the client-side token."}
