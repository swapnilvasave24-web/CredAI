"""
Converts a model default-probability into the CredAI Credit Score, risk
category, and loan recommendation.

Thresholds are computed from the training PR-curve (passed at call time)
rather than being hardcoded constants, which is critical for imbalanced
credit data where the default rate is ~10–12%.
"""
from dataclasses import dataclass

SCORE_MIN = 300
SCORE_MAX = 900

# Risk bands (relative to default probability)
_LOW_RISK_MAX_PROB    = 0.10   # prob_default ≤ 10 %  → LOW RISK
_MEDIUM_RISK_MAX_PROB = 0.35   # 10 % < prob ≤ 35 %  → MEDIUM RISK
                                # prob > 35 %          → HIGH RISK


@dataclass
class CreditResult:
    default_probability: float
    credit_score: int
    risk_level: str
    recommendation: str


def probability_to_score(prob_default: float) -> int:
    prob_default = min(max(prob_default, 0.0), 1.0)
    return int(round(SCORE_MAX - prob_default * (SCORE_MAX - SCORE_MIN)))


def risk_level(prob_default: float) -> str:
    if prob_default <= _LOW_RISK_MAX_PROB:
        return "LOW_RISK"
    if prob_default <= _MEDIUM_RISK_MAX_PROB:
        return "MEDIUM_RISK"
    return "HIGH_RISK"


def loan_recommendation(prob_default: float, threshold: float = 0.25) -> str:
    """
    Uses the PR-optimal threshold from training to set the ELIGIBLE cut-off.
    REVIEW band spans from threshold to threshold * 1.5 (configurable).
    """
    review_cutoff = min(threshold * 1.5, 0.60)
    if prob_default <= threshold:
        return "ELIGIBLE"
    if prob_default <= review_cutoff:
        return "REVIEW_REQUIRED"
    return "NOT_ELIGIBLE"


def build_credit_result(prob_default: float, threshold: float = 0.30) -> CreditResult:
    return CreditResult(
        default_probability=round(float(prob_default), 4),
        credit_score=probability_to_score(prob_default),
        risk_level=risk_level(prob_default),
        recommendation=loan_recommendation(prob_default, threshold),
    )
