FROM python:3.12-slim

WORKDIR /app

# System deps for xgboost/shap (libgomp needed by xgboost)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY data/ ./data/
COPY models/ ./models/

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend
EXPOSE 8000

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# On first container start: build demo data/models if not already present
# (mount a volume at /app/models and /app/data to persist across restarts).
# In production, mount real trained models instead of generating demo ones.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
