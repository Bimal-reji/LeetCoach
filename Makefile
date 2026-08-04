# ============================================================
# LeetCoach AI — developer commands
# ============================================================

.PHONY: help install install-backend install-extension install-frontend \
	dev-backend dev-extension dev-frontend build build-extension build-frontend \
	test test-backend test-extension test-frontend lint typecheck \
	db-init db-migrate docker-up docker-down clean

help:
	@echo "LeetCoach AI commands:"
	@echo "  make install           Install everything (backend, extension, frontend)"
	@echo "  make dev-backend       Run FastAPI dev server on :8000"
	@echo "  make dev-frontend      Run dashboard dev server on :5173"
	@echo "  make dev-extension     Build extension in watch mode"
	@echo "  make test-backend      Run backend pytest suite"
	@echo "  make test-extension    Run extension vitest suite"
	@echo "  make test-frontend     Run frontend vitest suite"
	@echo "  make build-extension   Produce loadable unpacked extension in extension/build"
	@echo "  make db-init           Create SQLite db + seed data"
	@echo "  make docker-up         Full stack via docker compose"

install: install-backend install-extension install-frontend

install-backend:
	cd backend && python -m pip install -r requirements.txt -r requirements-dev.txt

install-extension:
	cd extension && npm install

install-frontend:
	cd frontend && npm install

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

dev-extension:
	cd extension && npm run watch

build: build-extension build-frontend

build-extension:
	cd extension && npm run build

build-frontend:
	cd frontend && npm run build

test: test-backend test-extension test-frontend

test-backend:
	cd backend && python -m pytest -q

test-extension:
	cd extension && npm test

test-frontend:
	cd frontend && npm test

lint:
	cd backend && python -m ruff check app tests
	cd extension && npx tsc --noEmit
	cd frontend && npx tsc --noEmit

typecheck:
	cd extension && npx tsc --noEmit
	cd frontend && npx tsc --noEmit

db-init:
	cd backend && python -m app.db.init_db

db-migrate:
	cd backend && alembic upgrade head

docker-up:
	docker compose -f docker/docker-compose.yml up --build

docker-down:
	docker compose -f docker/docker-compose.yml down

clean:
	rm -rf backend/.pytest_cache backend/**/__pycache__ \
		extension/node_modules extension/build extension/dist \
		frontend/node_modules frontend/dist backend/data
