"""
Local model used by each federated client (Bank A / Bank B / FinTech C):
a logistic-regression classifier trained with mini-batch gradient descent,
implemented directly in NumPy so weights are trivially serializable
plain arrays -- exactly what gets exchanged with the FedAvg server.

WHY NOT FLOWER + PYTORCH HERE: this sandbox has tight disk/network limits
that make a full PyTorch+CUDA-toolchain install unreliable. The federated
mechanics implemented in server.py (weight averaging by FedAvg, multi-round
orchestration, local-only raw data) are the same regardless of which local
model library backs each client. `backend/app/federated/flower_optional/`
contains an equivalent Flower+PyTorch client/server if you want to run the
"official" Flower stack in an environment with more resources -- swapping
it in does not change any other part of the app (API, DB, frontend all
talk to the same FederatedOrchestrator interface).
"""
import numpy as np


class LogisticRegressionNP:
    def __init__(self, n_features: int, seed: int = 42):
        rng = np.random.default_rng(seed)
        self.weights = rng.normal(0, 0.01, size=n_features)
        self.bias = 0.0

    def get_params(self):
        return {"weights": self.weights.copy(), "bias": self.bias}

    def set_params(self, params):
        self.weights = params["weights"].copy()
        self.bias = float(params["bias"])

    @staticmethod
    def _sigmoid(z):
        return 1 / (1 + np.exp(-np.clip(z, -30, 30)))

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self._sigmoid(X @ self.weights + self.bias)

    def local_train(self, X: np.ndarray, y: np.ndarray, epochs: int = 20,
                     lr: float = 0.1, batch_size: int = 64, l2: float = 1e-3,
                     seed: int = 0) -> dict:
        """Trains starting from current weights (which were just set from the
        global model), returns updated params + local eval metrics."""
        rng = np.random.default_rng(seed)
        n = len(X)
        pos_weight = (y == 0).sum() / max((y == 1).sum(), 1)
        sample_weight = np.where(y == 1, pos_weight, 1.0)

        for _ in range(epochs):
            idx = rng.permutation(n)
            for start in range(0, n, batch_size):
                batch_idx = idx[start:start + batch_size]
                xb, yb, wb = X[batch_idx], y[batch_idx], sample_weight[batch_idx]
                preds = self.predict_proba(xb)
                error = (preds - yb) * wb
                grad_w = xb.T @ error / len(batch_idx) + l2 * self.weights
                grad_b = error.mean()
                self.weights -= lr * grad_w
                self.bias -= lr * grad_b

        final_preds = self.predict_proba(X)
        loss = -np.mean(
            sample_weight * (y * np.log(final_preds + 1e-9) + (1 - y) * np.log(1 - final_preds + 1e-9))
        )
        acc = float(((final_preds >= 0.5).astype(int) == y).mean())
        return {"local_loss": float(loss), "local_accuracy": acc, "n_samples": int(n)}
