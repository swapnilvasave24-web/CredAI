"""
Creates demo accounts for LOCAL DEVELOPMENT ONLY. Do not use these
credentials in any real deployment. Run after the backend DB tables exist
(they're auto-created on backend startup, or run this after starting the
server once).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.database.db import SessionLocal, Base, engine
from app.models.entities import User, ApplicantProfile, Institution, RoleEnum
from app.auth.security import hash_password

DEMO_ACCOUNTS = [
    {"name": "Demo Applicant", "email": "applicant@demo.credai.app", "password": "DemoPass123!", "role": RoleEnum.APPLICANT},
    {"name": "Bank A Admin", "email": "banka@demo.credai.app", "password": "DemoPass123!", "role": RoleEnum.INSTITUTION, "institution": "Bank A"},
    {"name": "Bank B Admin", "email": "bankb@demo.credai.app", "password": "DemoPass123!", "role": RoleEnum.INSTITUTION, "institution": "Bank B"},
    {"name": "FinTech C Admin", "email": "fintechc@demo.credai.app", "password": "DemoPass123!", "role": RoleEnum.INSTITUTION, "institution": "FinTech C"},
    {"name": "CredAI Admin", "email": "admin@demo.credai.app", "password": "DemoPass123!", "role": RoleEnum.ADMIN},
]

INSTITUTIONS = [
    {"name": "Bank A", "type": "Bank"},
    {"name": "Bank B", "type": "Bank"},
    {"name": "FinTech C", "type": "FinTech"},
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        inst_by_name = {}
        for inst in INSTITUTIONS:
            existing = db.query(Institution).filter(Institution.name == inst["name"]).first()
            if not existing:
                existing = Institution(name=inst["name"], type=inst["type"], status="ACTIVE")
                db.add(existing)
                db.commit()
                db.refresh(existing)
            inst_by_name[inst["name"]] = existing

        for acc in DEMO_ACCOUNTS:
            if db.query(User).filter(User.email == acc["email"]).first():
                print(f"Skipping existing user {acc['email']}")
                continue
            user = User(
                name=acc["name"], email=acc["email"], password_hash=hash_password(acc["password"]),
                role=acc["role"],
                institution_id=inst_by_name[acc["institution"]].id if "institution" in acc else None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            if acc["role"] == RoleEnum.APPLICANT:
                db.add(ApplicantProfile(user_id=user.id, age=32, employment_type="Working",
                                         education_level="Higher education", family_status="Married",
                                         housing_type="House / apartment", employment_years=5))
                db.commit()
            print(f"Created {acc['role'].value}: {acc['email']} / {acc['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
