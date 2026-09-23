"""Integration tests for the credit assessment flow."""
import pytest
from tests.conftest import GOOD_ASSESSMENT, BAD_ASSESSMENT


async def _login_applicant(client):
    r = await client.post("/auth/login",
                          json={"email": "applicant@test.example.com", "password": "TestPass99!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_assessment_returns_valid_schema(client):
    async with client as c:
        h = await _login_applicant(c)
        r = await c.post("/assessments", json=GOOD_ASSESSMENT, headers=h)
        assert r.status_code == 200
        body = r.json()
        for field in ["id", "credit_score", "risk_level", "default_probability",
                      "recommendation", "model_version", "top_contributors"]:
            assert field in body, f"Missing field: {field}"


@pytest.mark.asyncio
async def test_good_applicant_gets_low_risk(client):
    async with client as c:
        h = await _login_applicant(c)
        r = await c.post("/assessments", json=GOOD_ASSESSMENT, headers=h)
        body = r.json()
        # Not asserting exact score (model-dependent), but probability and recommendation
        assert body["default_probability"] < 0.35
        assert body["recommendation"] in ("ELIGIBLE", "REVIEW_REQUIRED")


@pytest.mark.asyncio
async def test_bad_applicant_gets_high_risk(client):
    async with client as c:
        h = await _login_applicant(c)
        r = await c.post("/assessments", json=BAD_ASSESSMENT, headers=h)
        body = r.json()
        assert body["default_probability"] > 0.4
        assert body["risk_level"] in ("MEDIUM_RISK", "HIGH_RISK")


@pytest.mark.asyncio
async def test_shap_contributors_present(client):
    async with client as c:
        h = await _login_applicant(c)
        r = await c.post("/assessments", json=GOOD_ASSESSMENT, headers=h)
        contributors = r.json()["top_contributors"]
        assert len(contributors) >= 1
        for c_item in contributors:
            assert "friendly_label" in c_item
            assert "shap_value" in c_item
            assert c_item["contribution_type"] in ("increases_risk", "decreases_risk")


@pytest.mark.asyncio
async def test_assessment_persisted_in_history(client):
    async with client as c:
        h = await _login_applicant(c)
        before = await c.get("/assessments", headers=h)
        n_before = len(before.json())
        await c.post("/assessments", json=GOOD_ASSESSMENT, headers=h)
        after = await c.get("/assessments", headers=h)
        assert len(after.json()) == n_before + 1


@pytest.mark.asyncio
async def test_explanation_endpoint_matches_assessment(client):
    async with client as c:
        h = await _login_applicant(c)
        r = await c.post("/assessments", json=GOOD_ASSESSMENT, headers=h)
        aid = r.json()["id"]
        r2 = await c.get(f"/assessments/{aid}/explanation", headers=h)
        assert r2.status_code == 200
        explanations = r2.json()
        assert len(explanations) >= 1
        assert all("shap_value" in e for e in explanations)


@pytest.mark.asyncio
async def test_assessment_validates_input(client):
    async with client as c:
        h = await _login_applicant(c)
        bad_payload = GOOD_ASSESSMENT.copy()
        bad_payload["monthly_income"] = -1000  # must be > 0
        r = await c.post("/assessments", json=bad_payload, headers=h)
        assert r.status_code == 422


@pytest.mark.asyncio
async def test_profile_update_and_assessment(client):
    async with client as c:
        h = await _login_applicant(c)
        await c.put("/applicant/profile", json={
            "age": 35, "employment_type": "Working", "education_level": "Higher education",
            "family_status": "Married", "housing_type": "House / apartment",
            "employment_years": 8.0
        }, headers=h)
        r = await c.post("/assessments", json=GOOD_ASSESSMENT, headers=h)
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_credit_score_in_valid_range(client):
    async with client as c:
        h = await _login_applicant(c)
        for payload in [GOOD_ASSESSMENT, BAD_ASSESSMENT]:
            r = await c.post("/assessments", json=payload, headers=h)
            score = r.json()["credit_score"]
            assert 300 <= score <= 900, f"Score {score} out of valid range"
