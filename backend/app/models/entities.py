import enum
import datetime as dt

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, JSON, Boolean
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class RoleEnum(str, enum.Enum):
    APPLICANT = "APPLICANT"
    INSTITUTION = "INSTITUTION"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    applicant_profile = relationship("ApplicantProfile", back_populates="user", uselist=False)
    institution = relationship("Institution", back_populates="users")


class ApplicantProfile(Base):
    __tablename__ = "applicant_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    age = Column(Integer)
    employment_type = Column(String)
    education_level = Column(String)
    family_status = Column(String)
    housing_type = Column(String)
    employment_years = Column(Float)

    user = relationship("User", back_populates="applicant_profile")
    financial_profile = relationship("FinancialProfile", back_populates="applicant", uselist=False)
    assessments = relationship("CreditAssessment", back_populates="applicant")


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"
    id = Column(Integer, primary_key=True)
    applicant_id = Column(Integer, ForeignKey("applicant_profiles.id"), unique=True, nullable=False)
    monthly_income = Column(Float)
    requested_credit_amount = Column(Float)
    monthly_annuity = Column(Float)
    existing_debt_ratio = Column(Float)
    bureau_loan_count = Column(Integer)
    bureau_overdue_ratio = Column(Float)
    prev_application_count = Column(Integer)
    prev_approval_rate = Column(Float)
    installment_late_ratio = Column(Float)
    installment_avg_days_late = Column(Float)
    ext_source_1 = Column(Float)
    ext_source_2 = Column(Float)
    ext_source_3 = Column(Float)
    # Synthetic alternative-data layer (explicitly labeled)
    syn_upi_txn_count_monthly = Column(Float)
    syn_avg_txn_amount = Column(Float)
    syn_txn_consistency = Column(Float)
    syn_utility_payment_reliability = Column(Float)
    syn_monthly_savings_rate = Column(Float)
    syn_income_stability_score = Column(Float)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    applicant = relationship("ApplicantProfile", back_populates="financial_profile")


class CreditAssessment(Base):
    __tablename__ = "credit_assessments"
    id = Column(Integer, primary_key=True)
    applicant_id = Column(Integer, ForeignKey("applicant_profiles.id"), nullable=False)
    model_version = Column(String, nullable=False)
    credit_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)
    default_probability = Column(Float, nullable=False)
    recommendation = Column(String, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    applicant = relationship("ApplicantProfile", back_populates="assessments")
    explanations = relationship("AssessmentExplanation", back_populates="assessment")


class AssessmentExplanation(Base):
    __tablename__ = "assessment_explanations"
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey("credit_assessments.id"), nullable=False)
    feature = Column(String, nullable=False)
    friendly_label = Column(String, nullable=False)
    shap_value = Column(Float, nullable=False)
    contribution_type = Column(String, nullable=False)
    is_synthetic = Column(Boolean, default=False)

    assessment = relationship("CreditAssessment", back_populates="explanations")


class Institution(Base):
    __tablename__ = "institutions"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Bank / NBFC / FinTech
    status = Column(String, default="ACTIVE")

    users = relationship("User", back_populates="institution")


class FederatedRound(Base):
    __tablename__ = "federated_rounds"
    id = Column(Integer, primary_key=True)
    round_number = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    global_model_version = Column(String, nullable=False)
    participating_clients = Column(JSON)
    metrics = Column(JSON)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True)
    version = Column(String, nullable=False, unique=True)
    algorithm = Column(String, nullable=False)
    metrics = Column(JSON)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
