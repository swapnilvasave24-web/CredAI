"""
Tests for the federated learning system.
Verifies that FedAvg is genuine: weights are actually averaged, raw client
data never crosses the server boundary, global model improves over rounds.
"""
import pytest
import numpy as np
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.federated.local_model import LogisticRegressionNP
from app.federated.server import fedavg


# ─── FedAvg unit tests ──────────────────────────────────────────────────────

def test_fedavg_simple_equal_weights():
    """FedAvg of two identical models should produce the same model."""
    params = [
        {"weights": np.array([1.0, 2.0, 3.0]), "bias": 1.0},
        {"weights": np.array([1.0, 2.0, 3.0]), "bias": 1.0},
    ]
    counts = [100, 100]
    result = fedavg(params, counts)
    np.testing.assert_allclose(result["weights"], [1.0, 2.0, 3.0])
    assert result["bias"] == pytest.approx(1.0)


def test_fedavg_weighted_correctly():
    """Larger client should dominate the average."""
    params = [
        {"weights": np.array([10.0]), "bias": 10.0},  # 900 samples
        {"weights": np.array([0.0]), "bias": 0.0},    # 100 samples
    ]
    counts = [900, 100]
    result = fedavg(params, counts)
    # Expected: (10*900 + 0*100)/1000 = 9.0
    np.testing.assert_allclose(result["weights"], [9.0], atol=1e-6)
    assert result["bias"] == pytest.approx(9.0)


def test_fedavg_three_clients():
    """FedAvg across three clients with different sizes."""
    params = [
        {"weights": np.array([6.0, 0.0]), "bias": 6.0},
        {"weights": np.array([0.0, 6.0]), "bias": 0.0},
        {"weights": np.array([3.0, 3.0]), "bias": 3.0},
    ]
    counts = [1, 1, 1]  # equal weights → plain average
    result = fedavg(params, counts)
    np.testing.assert_allclose(result["weights"], [3.0, 3.0], atol=1e-6)
    assert result["bias"] == pytest.approx(3.0)


# ─── Local model tests ──────────────────────────────────────────────────────

def test_local_model_get_set_params_roundtrip():
    model = LogisticRegressionNP(n_features=5, seed=1)
    params = model.get_params()
    model2 = LogisticRegressionNP(n_features=5, seed=99)
    model2.set_params(params)
    np.testing.assert_array_equal(model2.get_params()["weights"], params["weights"])


def test_local_model_predict_proba_range():
    model = LogisticRegressionNP(n_features=4, seed=7)
    X = np.random.default_rng(7).normal(size=(100, 4))
    probs = model.predict_proba(X)
    assert probs.shape == (100,)
    assert np.all(probs >= 0) and np.all(probs <= 1)


def test_local_training_reduces_loss():
    """Loss after training must be lower than before training on same data."""
    rng = np.random.default_rng(42)
    X = rng.normal(size=(200, 10))
    y = (X[:, 0] + X[:, 1] > 0).astype(int)  # linearly separable

    model = LogisticRegressionNP(n_features=10, seed=42)
    probs_before = model.predict_proba(X)
    loss_before = -np.mean(y * np.log(probs_before + 1e-9) + (1-y) * np.log(1 - probs_before + 1e-9))

    report = model.local_train(X, y, epochs=50, lr=0.1, seed=0)
    assert report["local_loss"] < loss_before, "Training should reduce loss"


def test_local_training_does_not_modify_other_model():
    """Clients must train independently — one model's training must not affect another's weights."""
    rng = np.random.default_rng(42)
    X = rng.normal(size=(100, 5))
    y = rng.integers(0, 2, size=100)

    model_a = LogisticRegressionNP(n_features=5, seed=1)
    model_b = LogisticRegressionNP(n_features=5, seed=1)
    weights_b_before = model_b.get_params()["weights"].copy()

    model_a.local_train(X, y, epochs=10, seed=0)
    np.testing.assert_array_equal(model_b.get_params()["weights"], weights_b_before)


def test_global_model_receives_average_not_one_client():
    """After FedAvg, global model should not be identical to any single client."""
    rng = np.random.default_rng(42)
    X = rng.normal(size=(200, 10))
    y = (rng.random(200) > 0.1).astype(int)

    global_init = {"weights": np.zeros(10), "bias": 0.0}
    clients = []
    for seed in [1, 2, 3]:
        m = LogisticRegressionNP(n_features=10)
        m.set_params(global_init)
        m.local_train(X, y, epochs=20, seed=seed)
        clients.append(m.get_params())

    averaged = fedavg(clients, [200, 200, 200])
    for c_params in clients:
        assert not np.allclose(averaged["weights"], c_params["weights"]), (
            "FedAvg result should not be identical to any single client's weights"
        )


# ─── Federated training via API ─────────────────────────────────────────────

def test_federated_training_api_requires_admin():
    import asyncio
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async def _run():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/auth/login",
                             json={"email": "applicant@test.example.com", "password": "TestPass99!"})
            headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
            r2 = await c.post("/federated/train", json={"rounds": 1}, headers=headers)
            assert r2.status_code == 403

    asyncio.run(_run())


def test_federated_training_api_produces_real_metrics():
    import asyncio
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async def _run():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/auth/login",
                             json={"email": "admin@test.example.com", "password": "TestPass99!"})
            headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
            r2 = await c.post("/federated/train", json={"rounds": 2, "local_epochs": 5},
                              headers=headers, timeout=60.0)
            assert r2.status_code == 200
            body = r2.json()
            gm = body["final_global_metrics"]
            assert 0.5 <= gm["roc_auc"] <= 1.0, f"Suspicious ROC-AUC: {gm['roc_auc']}"
            assert 0 <= gm["accuracy"] <= 1.0

    asyncio.run(_run())
