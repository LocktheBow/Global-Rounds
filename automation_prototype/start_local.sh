#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VENV_DIR="${ROOT_DIR}/.venv"
PYTHON_BIN="${PYTHON:-python3}"
PORT="${PORT:-8001}"
AS_OF="${AS_OF:-2024-09-01}"
SKIP_INFRA="${SKIP_INFRA:-0}"
SKIP_PIP="${SKIP_PIP:-0}"
RELOAD="${RELOAD:-1}"

if [ ! -d "$VENV_DIR" ]; then
  echo "[setup] Creating virtual environment at $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

if [ -f "$ROOT_DIR/.env" ]; then
  echo "[setup] Loading environment variables from .env"
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "[warn] ANTHROPIC_API_KEY is not set. Ask the Dashboard will fall back to offline summaries."
else
  echo "[setup] Anthropic API key detected for Ask the Dashboard."
fi

if [ -n "${DASHBOARD_LLM_MODEL:-}" ]; then
  echo "[setup] Using LLM model: $DASHBOARD_LLM_MODEL"
fi

if [ "$SKIP_PIP" != "1" ]; then
  echo "[setup] Installing Python dependencies"
  python -m pip install --disable-pip-version-check --upgrade pip >/dev/null
  python -m pip install --disable-pip-version-check -r backend/requirements.txt >/dev/null
else
  echo "[setup] Skipping dependency installation (SKIP_PIP=1)"
fi

if [ "$SKIP_INFRA" != "1" ]; then
  echo "[setup] Seeding synthetic infrastructure (AS_OF=$AS_OF)"
  python cli.py infrastructure --as-of "$AS_OF"
else
  echo "[setup] Skipping infrastructure seeding (SKIP_INFRA=1)"
fi

UVICORN_CMD=(uvicorn backend.app:app --host 0.0.0.0 --port "$PORT")
if [ "$RELOAD" = "1" ]; then
  UVICORN_CMD+=(--reload --reload-dir backend --reload-dir automation --reload-dir portal --reload-dir dashboard --reload-exclude '.venv/*')
fi

echo "[run] Starting FastAPI server on port $PORT"
echo "[hint] Set SKIP_INFRA=1 to skip reseeding, RELOAD=0 to disable auto-reload, SKIP_PIP=1 to keep existing deps, or RELOAD=0 for a stable server."
exec "${UVICORN_CMD[@]}"
