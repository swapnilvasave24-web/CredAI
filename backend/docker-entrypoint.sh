#!/bin/sh
set -e

cd /app

# Only run the full data/model pipeline if models don't already exist.
# This makes container restarts fast; delete /app/models to force a rebuild.
if [ ! -f "/app/models/xgboost_baseline.json" ] && [ ! -f "/app/models/xgboost_baseline.pkl" ]; then
  echo "[entrypoint] No trained model found — running data + training pipeline..."
  python scripts/generate_homecredit_like_data.py
  python scripts/prepare_data.py
  python scripts/generate_synthetic_data.py
  python scripts/create_federated_clients.py
  python scripts/train_baseline.py
  python scripts/seed_demo_data.py
  echo "[entrypoint] Pipeline complete."
else
  echo "[entrypoint] Existing trained model found — skipping data/training pipeline."
  python scripts/seed_demo_data.py || true
fi

cd /app/backend
exec "$@"
