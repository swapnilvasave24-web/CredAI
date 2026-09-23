import datetime as dt
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


# ---------- Applicant profile ----------
class ApplicantProfileUpdate(BaseModel):
    age: Optional[int] = None
    employment_type: Optional[str] = None
    education_level: Optional[str] = None
    family_status: Optional[str] = None
    housing_type: Optional[str] = None
    employment_years: Optional[float] = None


class ApplicantProfileOut(ApplicantProfileUpdate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ---------- Financial assessment input ----------
class AssessmentRequest(BaseModel):
    monthly_income: float = Field(gt=0)
    requested_credit_amount: float = Field(gt=0)
    monthly_annuity: float = Field(gt=0)
    bureau_loan_count: int = Field(ge=0)
    bureau_overdue_ratio: float = Field(ge=0, le=1)
    prev_application_count: int = Field(ge=0)
    prev_approval_rate: float = Field(ge=0, le=1)
    installment_late_ratio: float = Field(ge=0, le=1)
    installment_avg_days_late: float = Field(ge=0)
    ext_source_1: float = Field(ge=0, le=1)
    ext_source_2: float = Field(ge=0, le=1)
    ext_source_3: float = Field(ge=0, le=1)
    # Synthetic alternative-data inputs (clearly labeled to the user in the UI)
    syn_upi_txn_count_monthly: float = Field(ge=0)
    syn_avg_txn_amount: float = Field(ge=0)
    syn_txn_consistency: float = Field(ge=0, le=1)
    syn_utility_payment_reliability: float = Field(ge=0, le=1)
    syn_monthly_savings_rate: float = Field(ge=0, le=1)
    syn_income_stability_score: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def check_business_rules(self) -> "AssessmentRequest":
        if self.monthly_annuity > self.monthly_income:
            raise ValueError("Monthly annuity cannot exceed monthly income.")
        if self.requested_credit_amount > self.monthly_income * 120:
            raise ValueError("Requested credit amount seems unrealistically high relative to income.")
        return self


class ExplanationItem(BaseModel):
    feature: str
    friendly_label: str
    shap_value: float
    contribution_type: str
    is_synthetic: bool


class AssessmentResult(BaseModel):
    id: int
    model_version: str
    credit_score: int
    risk_level: str
    default_probability: float
    recommendation: str
    created_at: dt.datetime
    top_contributors: list[ExplanationItem]

    class Config:
        from_attributes = True


class AssessmentHistoryItem(BaseModel):
    id: int
    credit_score: int
    risk_level: str
    recommendation: str
    default_probability: float
    created_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- Institution ----------
class InstitutionStatus(BaseModel):
    id: int
    name: str
    type: str
    status: str
    latest_round: Optional[int]
    local_metrics: Optional[dict]
    global_model_version: Optional[str]


# ---------- Federated ----------
class FederatedTrainRequest(BaseModel):
    rounds: int = Field(default=5, ge=1, le=50)
    local_epochs: int = Field(default=20, ge=1, le=200)


class FederatedRoundOut(BaseModel):
    round_number: int
    status: str
    global_model_version: str
    participating_clients: list[str]
    metrics: dict
    created_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- Admin ----------
class AdminDashboardOut(BaseModel):
    total_applicants: int
    total_institutions: int
    total_assessments: int = 0
    current_global_model_version: Optional[str] = None
    latest_federated_round: Optional[int] = None
    centralized_metrics: Optional[dict] = None
    federated_metrics: Optional[dict] = None
    fairness_metrics: Optional[dict] = None
    system_status: str
    data_mode: str = "synthetic"
