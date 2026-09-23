"""Tests for registration, login, logout, and JWT validation."""
import pytest
import pytest_asyncio


@pytest.mark.asyncio
async def test_register_new_user(client):
    async with client as c:
        r = await c.post("/auth/register", json={
            "name": "New Person", "email": "newperson@example.com", "password": "Str0ngPass!"
        })
        assert r.status_code == 201
        body = r.json()
        assert "access_token" in body
        assert body["role"] == "APPLICANT"
        assert body["name"] == "New Person"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    async with client as c:
        payload = {"name": "X", "email": "dup@example.com", "password": "Str0ngPass!"}
        await c.post("/auth/register", json=payload)
        r = await c.post("/auth/register", json=payload)
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"]


@pytest.mark.asyncio
async def test_register_weak_password_rejected(client):
    async with client as c:
        r = await c.post("/auth/register", json={
            "name": "X", "email": "weak@example.com", "password": "short"
        })
        assert r.status_code == 422


@pytest.mark.asyncio
async def test_login_valid(client):
    async with client as c:
        r = await c.post("/auth/login", json={
            "email": "applicant@test.example.com", "password": "TestPass99!"
        })
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body
        assert body["role"] == "APPLICANT"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    async with client as c:
        r = await c.post("/auth/login", json={
            "email": "applicant@test.example.com", "password": "WrongPass999!"
        })
        assert r.status_code == 401
        assert "Invalid" in r.json()["detail"]


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    async with client as c:
        r = await c.post("/auth/login", json={
            "email": "nobody@example.com", "password": "AnyPass123!"
        })
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_logout(client):
    async with client as c:
        r = await c.post("/auth/logout")
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_protected_route_no_token(client):
    async with client as c:
        r = await c.get("/applicant/profile")
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_invalid_token(client):
    async with client as c:
        r = await c.get("/applicant/profile",
                        headers={"Authorization": "Bearer not.a.valid.jwt"})
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_register_creates_applicant_profile(client):
    """Registration must auto-create an empty ApplicantProfile."""
    async with client as c:
        r = await c.post("/auth/register", json={
            "name": "Profile Check", "email": "profcheck@example.com", "password": "Str0ngPass!"
        })
        token = r.json()["access_token"]
        r2 = await c.get("/applicant/profile",
                         headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert "id" in r2.json()
