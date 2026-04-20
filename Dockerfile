# =============================================================================
# Multi-stage Dockerfile for ERP SaaS
# Stage 1: Build frontend static files
# Stage 2: Run backend (serves API + frontend static)
# =============================================================================

# ── Stage 1: Frontend build ─────────────────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

COPY frontend/ ./

ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

RUN yarn build

# ── Stage 2: Backend + serve static frontend ────────────────────────────────
FROM python:3.11-slim

# System deps for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /build/build /app/static

# Cleanup gcc after psycopg2 is built
RUN apt-get purge -y gcc && apt-get autoremove -y

EXPOSE 8001

CMD ["gunicorn", "server:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "2", \
     "--bind", "0.0.0.0:8001", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
