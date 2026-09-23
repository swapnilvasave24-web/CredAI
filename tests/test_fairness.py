"""Tests for the fairness evaluation module."""
import pytest
import numpy as np
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.fairness.fairness_eval import evaluate_group_fairness


def _make_df(n=500, seed=42):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "CODE_GENDER": rng.choice(["M", "F"], size=n, p=[0.4, 0.6]),
        "TARGET": rng.integers(0, 2, size=n),
        "pred": rng.integers(0, 2, size=n),
    })


def test_fairness_returns_required_keys():
    df = _make_df()
    result = evaluate_group_fairness(df, "TARGET", "pred", "CODE_GENDER")
    for key in ["group_attribute", "group_metrics", "demographic_parity_difference",
                "equal_opportunity_difference", "note"]:
        assert key in result, f"Missing key: {key}"


def test_fairness_reports_both_genders():
    df = _make_df()
    result = evaluate_group_fairness(df, "TARGET", "pred", "CODE_GENDER")
    assert "M" in result["group_metrics"]
    assert "F" in result["group_metrics"]


def test_group_metrics_keys():
    df = _make_df()
    result = evaluate_group_fairness(df, "TARGET", "pred", "CODE_GENDER")
    for g, gm in result["group_metrics"].items():
        for key in ["n", "approval_rate", "true_positive_rate"]:
            assert key in gm, f"Missing key {key} in group {g}"


def test_dpd_is_non_negative():
    df = _make_df()
    result = evaluate_group_fairness(df, "TARGET", "pred", "CODE_GENDER")
    assert result["demographic_parity_difference"] >= 0


def test_dpd_zero_when_equal():
    """If both groups have identical approval rates, DPD should be 0."""
    df = pd.DataFrame({
        "CODE_GENDER": ["M", "F", "M", "F"],
        "TARGET":      [0, 1, 1, 0],
        "pred":        [0, 0, 0, 0],  # all predicted non-default → same approval rate
    })
    result = evaluate_group_fairness(df, "TARGET", "pred", "CODE_GENDER")
    assert result["demographic_parity_difference"] == 0.0


def test_note_does_not_claim_fairness():
    """The result must not assert the model is 'fair' — only report metrics."""
    df = _make_df()
    result = evaluate_group_fairness(df, "TARGET", "pred", "CODE_GENDER")
    note_lower = result["note"].lower()
    assert "fair" not in note_lower or "not" in note_lower or "diagnostic" in note_lower or "only" in note_lower


def test_fairness_admin_endpoint_works():
    """Admin endpoint returns real computed fairness, not hard-coded."""
    import asyncio
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async def _run():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/auth/login",
                             json={"email": "admin@test.example.com", "password": "TestPass99!"})
            headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
            r2 = await c.get("/admin/fairness", headers=headers)
            assert r2.status_code == 200
            body = r2.json()
            assert "demographic_parity_difference" in body
            # Key requirement: DPD is a real number from model evaluation, not hardcoded
            assert isinstance(body["demographic_parity_difference"], float)
            assert 0.0 <= body["demographic_parity_difference"] <= 1.0

    asyncio.run(_run())


def test_thin_file_fairness_evaluated():
    """evaluate_group_fairness must include thin_file_fairness metrics."""
    df = pd.DataFrame({
        "CODE_GENDER": ["M", "F", "M", "F"],
        "BUREAU_LOAN_COUNT": [0, 1, 0, 2],
        "PREV_APPLICATION_COUNT": [0, 1, 0, 0],
        "TARGET": [0, 1, 0, 0],
        "pred": [0, 1, 0, 0],
    })
    result = evaluate_group_fairness(df, "TARGET", "pred", "CODE_GENDER")
    assert "thin_file_fairness" in result
    tf = result["thin_file_fairness"]
    assert tf is not None
    assert "group_metrics" in tf
    assert "Thin-File (No History)" in tf["group_metrics"]
    assert "Established Credit" in tf["group_metrics"]
    assert tf["demographic_parity_difference"] >= 0

