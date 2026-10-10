# Shortcuts for the npm scripts in package.json and the helpers in scripts/.
# Every target only calls one of those, so `npm run …` stays the real interface
# (CI uses it, and it works without make). Run `make` to list the targets.

.DEFAULT_GOAL := help

APP ?= doctor
SERVICE ?= patient

.PHONY: help run images up down build-backends smoke \
	install dev dev-service build build-shared build-portals \
	lint lint-fix lint-portals test test-e2e typecheck \
	db-up migrate db-revert db-generate db-check seed

help: ## list the targets
	@awk 'BEGIN { FS = ":.*## " } \
		/^##@/ { printf "\n%s\n", substr($$0, 5) } \
		/^[a-z][a-z0-9-]*:.*## / { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo

##@ Docker stack

run: ## build images one at a time, then start the stack (S="curo-doctor curo-nurse" for some)
	bash scripts/docker-rebuild.sh $(S)

images: ## build images one at a time without starting anything (S="…" for some)
	bash scripts/docker-rebuild.sh --no-up $(S)

up: ## start the stack from the images already built
	npm run docker:up

down: ## stop the stack
	npm run docker:down

build-backends: ## build the backend images through a local npm registry cache
	npm run docker:build:backends

smoke: ## end-to-end API check against the running stack (changes its data)
	bash scripts/smoke-e2e.sh

##@ Develop

install: ## install every workspace's dependencies
	npm install

dev: ## run a portal with hot reload (APP=doctor)
	npm run dev -w apps/$(APP)

dev-service: ## run a backend in watch mode (SERVICE=patient)
	npm run start:dev -w services/$(SERVICE)

build: ## build @curo/shared and every backend
	npm run build

build-shared: ## build @curo/shared (backends import the built package)
	npm run build:shared

build-portals: ## build every portal
	npm run build:portals

##@ Check

lint: ## lint without changing anything (what CI runs)
	npm run lint

lint-fix: ## lint, fix and format
	npm run lint:fix

lint-portals: ## lint every portal and @curo/web
	npm run lint:portals

test: ## unit tests
	npm test

test-e2e: ## API tests (needs Postgres and a built @curo/shared)
	npm run test:e2e

typecheck: ## type-check every workspace and database/
	npm run typecheck

##@ Database

db-up: ## start only Postgres, for running code from source
	docker compose up -d postgres

migrate: ## apply pending migrations
	npm run db:migrate

db-revert: ## undo the most recent migration
	npm run db:revert

db-generate: ## write a migration from entity changes (NAME=AddPatientNickname)
	@test -n "$(NAME)" || { echo 'usage: make db-generate NAME=AddPatientNickname' >&2; exit 1; }
	npm run db:generate -- migrations/$(NAME)

db-check: ## fail if the entities and the database schema differ
	npm run db:check

seed: ## load dev data; safe to re-run
	npm run seed
