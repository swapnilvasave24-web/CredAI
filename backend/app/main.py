import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
import app.database.db as _db
from app.api import (
    auth_routes, applicant_routes,
    institution_routes, federated_routes, admin_routes,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("credai")

# Warn loudly if running with a default JWT secret (dev sentinel)
_DEV_SECRETS = {"dev-secret-change-me-in-.env", "change-this-to-a-long-random-value-before-deploying"}
if settings.JWT_SECRET_KEY in _DEV_SECRETS:
    logger.warning(
        "⚠️  JWT_SECRET_KEY is set to a known default. "
        "Set a strong random secret in .env before any deployment."
    )

_db.Base.metadata.create_all(bind=_db.engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load the ML model at startup so the first request has no cold-start latency."""
    try:
        from app.services.inference_service import warm_up_model
        warm_up_model()
        logger.info("ML model warm-up complete.")
    except Exception as exc:
        logger.warning("ML model warm-up skipped (model not trained yet): %s", exc)
    yield


app = FastAPI(title="CredAI API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(applicant_routes.router)
app.include_router(institution_routes.router)
app.include_router(federated_routes.router)
app.include_router(admin_routes.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )


@app.get("/health")
def health():
    from app.ml.train import MODEL_PATH
    return {
        "status": "ok",
        "model_ready": MODEL_PATH.exists(),
        "version": "2.0.0",
    }
