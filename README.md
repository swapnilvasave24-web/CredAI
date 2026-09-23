# CredAI — Privacy-Preserving Federated Credit Scoring

CredAI is a working prototype that predicts credit risk from a mix of
traditional and alternative financial data, using a model trained with
Federated Learning across three simulated financial institutions, with
SHAP-based explanations and a fairness audit.

**Read this before anything else:** see [Honesty & Scope](#honesty--scope)
below. This is a research prototype, not a production lending system.

---

## 1. What's real vs. simulated

| Component | Status |
|---|---|
| XGBoost centralized model, trained & evaluated | **Real** — trained on-disk, real ROC-AUC/precision/recall/F1 |
| SHAP explanations | **Real** — computed per-prediction from the trained model, no templated text |
| Federated Learning (FedAvg) | **Real** — genuine weight averaging across 3 clients over N rounds, using a from-scratch NumPy logistic-regression client so weights average meaningfully |
| Fairness evaluation | **Real** — computed from actual model predictions on held-out data, grouped by `CODE_GENDER` (the one demographic attribute present in the schema) |
| Authentication / RBAC | **Real** — bcrypt password hashing, JWT sessions, server-enforced role checks |
| Database | **Real** — SQLAlchemy ORM; SQLite for local dev, Postgres via Docker Compose |
| **Dataset** | **Synthetic, clearly labeled** — see below |
| Docker / Compose | Written correctly per spec; **not build-tested** here (no Docker daemon in this sandbox) |

### Dataset — the most important caveat

This app does **not** ship the real Kaggle "Home Credit Default Risk"
dataset (it's 2+ GB and requires a Kaggle account). Instead:

- `scripts/generate_homecredit_like_data.py` generates a **synthetic dataset
  with the exact same column names and realistic statistical relationships**
  as the real Home Credit files, so every downstream step (preprocessing,
  training, SHAP, fairness, federated learning) runs against real code paths
  and produces real (non-hardcoded) numbers.
- `scripts/download_data.py` downloads the **real** dataset if you provide
  Kaggle API credentials — after that, `scripts/prepare_data.py` builds the
  identical processed schema from real data with zero code changes elsewhere.
- The "alternative data" layer (UPI transactions, utility-payment
  reliability, etc.) is **always synthetic** — Home Credit doesn't contain
  this data, and no data source does at this fidelity for a public
  prototype. It is labeled `"Synthetic Prototype Data"` everywhere it
  appears in the UI, API responses (`is_synthetic: true` on SHAP
  contributors), and docs.

Full details: [`data/README.md`](data/README.md).

---

## 2. Architecture

```
credai/
├── backend/            FastAPI app (auth, ML, federated learning, fairness, SHAP)
│   └── app/
│       ├── api/            REST routes per role (auth, applicant, institution, admin, federated)
│       ├── auth/            JWT + bcrypt
│       ├── database/        SQLAlchemy engine/session
│       ├── models/          ORM entities
│       ├── schemas/         Pydantic request/response models
│       ├── ml/               preprocessing, XGBoost training, credit score/recommendation logic
│       ├── federated/        NumPy logistic-regression client + FedAvg server
│       ├── explainability/   SHAP wrapper
│       └── fairness/         group fairness metrics
├── frontend/           React + TypeScript + Tailwind (Vite)
├── data/               raw / processed / federated data + data/README.md
├── models/             trained model artifacts, preprocessing pipeline, metrics JSON
├── scripts/            data generation, preparation, training, seeding pipeline
├── tests/              pytest suite (59 tests: auth, authz, ML, fairness, federated, API)
├── docker-compose.yml
└── .env.example
```

### Why a NumPy logistic-regression client for Federated Learning (not XGBoost)?

FedAvg averages **model parameters**. XGBoost's parameters are decision
trees, which do not average into a meaningful model (`mean(tree_A, tree_B)`
is not a tree). To implement **genuine** FedAvg rather than a fake
"simulate 3 clients then just retrain centrally" shortcut, the federated
system uses a small from-scratch logistic-regression model
(`app/federated/local_model.py`) whose weight vectors *do* average
correctly. The centralized baseline (which is the model actually used for
applicant-facing SHAP explanations) is XGBoost, as required. The federated
global model is evaluated and reported separately for the
centralized-vs-federated comparison (Admin Dashboard).

---

## 3. Three roles

| Role | Can do | Cannot do |
|---|---|---|
| **Applicant** | register/login, complete profile, submit assessment, view own score/SHAP/history | see other applicants' data, institution data, or admin controls |
| **Institution** (Bank A / Bank B / FinTech C) | view own local dataset stats, own model metrics, federated round history | see another institution's raw data, start federated training, access admin |
| **Admin** | view platform stats, start federated training, view fairness + model metrics | — |

All of these boundaries are enforced **server-side** (not just hidden UI)
and covered by `tests/test_authorization.py`.

---

## 4. Running locally (no Docker)

### Backend

```bash
cd credai
pip install -r backend/requirements.txt   # or install individually, see below

# 1. Generate demo data (synthetic, Home-Credit-schema) — or run
#    scripts/download_data.py first if you have Kaggle credentials
python scripts/generate_homecredit_like_data.py
python scripts/prepare_data.py
python scripts/generate_synthetic_data.py
python scripts/create_federated_clients.py

# 2. Train the centralized baseline model (writes to models/)
python scripts/train_baseline.py

# 3. (Optional) run a federated training round from the CLI
python scripts/train_federated.py --rounds 5 --local-epochs 20

# 4. Seed demo accounts (applicant/institution/admin)
python scripts/seed_demo_data.py

# 5. Start the API
cd backend
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger UI) are then at `http://localhost:8000/docs`.

**Demo accounts** (local dev only — see `scripts/seed_demo_data.py`):
- Applicant: `applicant@demo.credai.app` / `DemoPass123!`
- Bank A / B, FinTech C: `banka@demo.credai.app` / `bankb@demo.credai.app` / `fintechc@demo.credai.app`, all `DemoPass123!`
- Admin: `admin@demo.credai.app` / `DemoPass123!`

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Visit `http://localhost:5173`. The dev server proxies `/api/*` to
`http://localhost:8000` (see `vite.config.ts`).

### Running tests

```bash
cd credai
python -m pytest tests/ -v
```

All 59 tests pass in this environment, covering auth, role-based
authorization (including cross-tenant access attempts), ML/SHAP output
shape and sanity, fairness computation, and FedAvg correctness
(weighted-average math, loss-reduction-after-training, global-model ≠
any single client).

---

## 5. Running with Docker

```bash
cp .env.example .env    # edit secrets before any non-local use
docker compose up --build
```

This starts three services: `db` (Postgres), `backend` (FastAPI, runs the
data/training pipeline on first boot if no model is found, then serves the
API), and `frontend` (nginx serving the built React app, proxying `/api` to
the backend).

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Postgres: `localhost:5432`

**Note:** the Docker/Compose files were written to the Docker Compose v2
spec and reviewed carefully, but could not be build-tested in this sandbox
(no Docker daemon available). If something doesn't build cleanly on your
machine, the most likely culprits are dependency version pins in
`backend/requirements.txt` — check the error and adjust versions as needed.

---

## 6. Methodology summary

- **Target:** `TARGET` from Home Credit's `application_train.csv` — a proxy
  for "had payment difficulty," not a legal/regulatory default definition.
- **Model:** XGBoost binary classifier, class-weighted for imbalance,
  evaluated on a held-out stratified test split (ROC-AUC, PR-AUC,
  precision/recall/F1, confusion matrix — see `models/baseline_metrics.json`
  after training).
- **CredAI Credit Score:** default probability is linearly mapped to a
  300–900 score band (configurable in `app/ml/credit_score.py`); NOT a
  CIBIL/FICO score.
- **Risk levels / recommendation thresholds:** configurable constants in
  the same file — documented there, not hidden magic numbers.
- **SHAP:** `TreeExplainer` on the trained XGBoost model, per-instance
  contributions mapped to human-readable labels, `is_synthetic` flag
  preserved through to the API/UI.
- **Fairness:** demographic parity difference and equal-opportunity
  difference computed on `CODE_GENDER` groups from actual held-out
  predictions — reported as numbers, never as a bare "model is fair" claim.
- **Federated Learning:** Flower-style client/server round structure
  (init → local train → send weights → FedAvg → broadcast → repeat),
  implemented directly in NumPy for portability (see architecture note
  above); 3 non-IID client partitions (Bank A, Bank B, FinTech C).

---

## 7. Honesty & Scope

This is a prototype built to demonstrate an architecture and methodology,
not a production lending system. Specifically:

- The **CredAI Credit Score is not an official credit-bureau score** (not
  CIBIL, not FICO, not any regulator-recognized score).
- The **Loan Recommendation is an AI suggestion**, not a binding approval —
  no real loan is issued or guaranteed by this system.
- The dataset is **synthetic** (Home-Credit-schema) unless you provide your
  own Kaggle-downloaded data via `scripts/download_data.py`.
- The **alternative-data layer (UPI/utility/savings) is always synthetic** —
  no real transaction data of this kind is used or claimed.
- Federated Learning here demonstrates the **mechanism** (raw data stays
  local, only parameters are exchanged) but this prototype makes **no
  claim of formal privacy guarantees** (e.g., no differential privacy, no
  secure aggregation) and **no regulatory compliance claim** (GDPR, RBI,
  GLBA, etc.).
- Fairness metrics are reported as numbers for a demonstration attribute
  (`CODE_GENDER`) — this is not a certification that the model is fair in
  any legal sense, and production fairness auditing would need domain and
  legal review of which attributes to evaluate and what thresholds matter.

### What would be needed for production

Regulatory compliance review, an information-security audit, differential
privacy / secure aggregation for the federated layer, real (not synthetic)
alternative-data partnerships with proper consent flows, model-risk
management and monitoring, a human-in-the-loop credit-decision process, and
real financial-institution integrations.

---

## 8. Known limitations of this build

- Ran and tested in a sandboxed environment without Kaggle or Docker
  access — dataset is synthetic and Docker Compose is untested against a
  real daemon (see above).
- The federated model (NumPy logistic regression) is intentionally simpler
  than the centralized XGBoost model; this is a real architectural
  trade-off of FedAvg, not a shortcut — see the architecture note above.
- SQLite is the default local database; Postgres is used only in the
  Docker Compose path. Both use the same SQLAlchemy models.
- `tests/` covers backend behavior; there is no frontend end-to-end test
  suite (e.g., Playwright/Cypress) in this build.
