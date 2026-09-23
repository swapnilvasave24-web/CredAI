"""
Critical security tests: verifies role boundaries are enforced server-side.
These tests must NEVER be removed -- they prevent privilege escalation.
"""
import pytest


async def _login(client, email, password="TestPass99!"):
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_applicant_cannot_access_admin_dashboard(client):
    async with client as c:
        headers = await _login(c, "applicant@test.example.com")
        r = await c.get("/admin/dashboard", headers=headers)
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_applicant_cannot_access_admin_model_metrics(client):
    async with client as c:
        headers = await _login(c, "applicant@test.example.com")
        r = await c.get("/admin/model-metrics", headers=headers)
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_applicant_cannot_access_admin_fairness(client):
    async with client as c:
        headers = await _login(c, "applicant@test.example.com")
        r = await c.get("/admin/fairness", headers=headers)
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_applicant_cannot_start_federated_training(client):
    async with client as c:
        headers = await _login(c, "applicant@test.example.com")
        r = await c.post("/federated/train", json={"rounds": 1}, headers=headers)
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_applicant_cannot_access_institution_status(client):
    async with client as c:
        headers = await _login(c, "applicant@test.example.com")
        r = await c.get("/institution/status", headers=headers)
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_institution_cannot_access_admin_dashboard(client):
    async with client as c:
        headers = await _login(c, "banka@test.example.com")
        r = await c.get("/admin/dashboard", headers=headers)
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_institution_cannot_start_federated_training(client):
    """Only admin can trigger federated rounds."""
    async with client as c:
        headers = await _login(c, "banka@test.example.com")
        r = await c.post("/federated/train", json={"rounds": 1}, headers=headers)
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_blocked_from_all_protected(client):
    async with client as c:
        for path in ["/admin/dashboard", "/admin/fairness", "/institution/status",
                     "/applicant/profile", "/assessments"]:
            r = await c.get(path)
            assert r.status_code == 401, f"Expected 401 on {path}, got {r.status_code}"


@pytest.mark.asyncio
async def test_applicant_cannot_read_another_applicants_assessments(client):
    """Applicant A submitting an assessment must not see Applicant B's data."""
    async with client as c:
        # Register two fresh applicants
        r1 = await c.post("/auth/register", json={
            "name": "Alice", "email": "alice@example.com", "password": "AlicePass1!"
        })
        r2 = await c.post("/auth/register", json={
            "name": "Bob", "email": "bob@example.com", "password": "BobPass111!"
        })
        h1 = {"Authorization": f"Bearer {r1.json()['access_token']}"}
        h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}

        from tests.conftest import GOOD_ASSESSMENT, BAD_ASSESSMENT
        a1 = await c.post("/assessments", json=GOOD_ASSESSMENT, headers=h1)
        assert a1.status_code == 200
        assessment_id = a1.json()["id"]

        # Bob tries to read Alice's assessment by ID
        r_cross = await c.get(f"/assessments/{assessment_id}", headers=h2)
        assert r_cross.status_code == 404, (
            f"Security violation: Bob accessed Alice's assessment! Got {r_cross.status_code}"
        )

        # Bob's history is empty (his own data only)
        r_hist = await c.get("/assessments", headers=h2)
        assert r_hist.status_code == 200
        assert all(a["id"] != assessment_id for a in r_hist.json())
