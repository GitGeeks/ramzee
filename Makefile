.PHONY: help install dev build test clean docker-up docker-down db-migrate db-generate db-studio

# Default target
help:
	@echo "Ramzee Development Commands"
	@echo "============================"
	@echo ""
	@echo "Setup:"
	@echo "  make install      - Install all dependencies"
	@echo "  make docker-up    - Start Docker services (Postgres, Redis, etc.)"
	@echo "  make docker-down  - Stop Docker services"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development servers"
	@echo "  make build        - Build all packages"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "Database:"
	@echo "  make db-generate  - Generate migrations from schema"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-studio    - Open Drizzle Studio"
	@echo ""

# Setup
install:
	pnpm install

# Docker
docker-up:
	docker compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@echo "Services are ready!"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis:      localhost:6379"
	@echo "  Kafka:      localhost:9092"
	@echo "  MinIO:      localhost:9000 (console: localhost:9001)"
	@echo "  Mailhog:    localhost:8025"

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-reset:
	docker compose down -v
	docker compose up -d

# Development
dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

clean:
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf apps/*/dist
	rm -rf packages/*/dist
	rm -rf .turbo

# Database
db-generate:
	pnpm --filter @ramzee/database db:generate

db-migrate:
	pnpm --filter @ramzee/database db:migrate

db-studio:
	pnpm --filter @ramzee/database db:studio
