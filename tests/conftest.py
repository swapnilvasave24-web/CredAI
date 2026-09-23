"""
CredAI backend pytest fixtures.

Uses SQLite with StaticPool so every connection sees the same in-memory DB,
and a standard FastAPI dependency_overrides[get_db] to inject test sessions.
"""
import sys
import os
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# Must be set before any app import (affects app.config.settings)
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# StaticPool makes every connect() call return the SAME underlying connection,
# so Base.metadata.create_all and the test sessions all share one in-memory DB.
TESTING_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=TESTING_ENGINE
)

# Patch the db module BEFORE importing app.main (which calls create_all)
import app.database.db as _db
_db.engine = TESTING_ENGINE
_db.SessionLocal = TestingSessionLocal

from app.database.db import Base, get_db
from app.models import entities as _entities_module  # ensure all models registered

Base.metadata.create_all(bind=TESTING_ENGINE)

# Import app after schema is created
from app.main import app

# Install DI override so all route handlers get a TestingSessionLocal session
def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = _override_get_db

# ── Seed data ────────────────────────────────────────────────────────────────
from app.models.entities import User, ApplicantProfile, Institution, RoleEnum
from app.auth.security import hash_password


def _seed():
    db = TestingSessionLocal()
    try:
        if db.query(Institution).first():
            return
        for name, typ in [("Bank A", "Bank"), ("Bank B", "Bank"), ("FinTech C", "FinTech")]:
            db.add(Institution(name=name, type=typ, status="ACTIVE"))
        db.commit()
        bank_a = db.query(Institution).filter(Institution.name == "Bank A").first()

        for u in [
            User(name="Applicant", email="applicant@test.example.com",
                 password_hash=hash_password("TestPass99!"), role=RoleEnum.APPLICANT),
            User(name="Admin", email="admin@test.example.com",
                 password_hash=hash_password("TestPass99!"), role=RoleEnum.ADMIN),
            User(name="Bank A User", email="banka@test.example.com",
                 password_hash=hash_password("TestPass99!"), role=RoleEnum.INSTITUTION,
                 institution_id=bank_a.id),
        ]:
            db.add(u)
        db.commit()

        appl = db.query(User).filter(User.email == "applicant@test.example.com").first()
        db.add(ApplicantProfile(
            user_id=appl.id, age=32, employment_type="Working",
            education_level="Higher education", family_status="Married",
            housing_type="House / apartment", employment_years=5.0,
        ))
        db.commit()
    finally:
        db.close()


_seed()

# ── Public fixtures ───────────────────────────────────────────────────────────
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


GOOD_ASSESSMENT = {
    "monthly_income": 60000, "requested_credit_amount": 350000, "monthly_annuity": 11000,
    "bureau_loan_count": 1, "bureau_overdue_ratio": 0.02, "prev_application_count": 1,
    "prev_approval_rate": 0.95, "installment_late_ratio": 0.01, "installment_avg_days_late": 0.5,
    "ext_source_1": 0.75, "ext_source_2": 0.70, "ext_source_3": 0.65,
    "syn_upi_txn_count_monthly": 35, "syn_avg_txn_amount": 1200, "syn_txn_consistency": 0.85,
    "syn_utility_payment_reliability": 0.92, "syn_monthly_savings_rate": 0.18,
    "syn_income_stability_score": 0.80,
}

BAD_ASSESSMENT = {
    "monthly_income": 10000, "requested_credit_amount": 900000, "monthly_annuity": 9500,
    "bureau_loan_count": 9, "bureau_overdue_ratio": 0.7, "prev_application_count": 6,
    "prev_approval_rate": 0.05, "installment_late_ratio": 0.8, "installment_avg_days_late": 30.0,
    "ext_source_1": 0.05, "ext_source_2": 0.04, "ext_source_3": 0.06,
    "syn_upi_txn_count_monthly": 1, "syn_avg_txn_amount": 50, "syn_txn_consistency": 0.05,
    "syn_utility_payment_reliability": 0.03, "syn_monthly_savings_rate": 0.005,
    "syn_income_stability_score": 0.04,
}
