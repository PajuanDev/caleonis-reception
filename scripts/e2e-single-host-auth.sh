#!/usr/bin/env bash
# Called by e2e-local.sh AFTER its ordinary, staging-disabled test suite.
# Uses the same disposable database; no provider worker or deployed service.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
export P1_SINGLE_HOST_STAGING=true
export P1_SINGLE_HOST_ENVIRONMENT=certification
export RAILWAY_ENVIRONMENT_NAME=certification
export APP_BASE_URL="${PLAYWRIGHT_BASE_URL:?Disposable public origin required}"
export AUTH_TRUSTED_ORIGINS="$APP_BASE_URL"
node scripts/p1-single-host-auth-server.mjs --check
node --test scripts/p1-single-host-auth-server.test.mjs
# NEXT_PUBLIC routing is compiled, so never reuse the ordinary fixture build.
pnpm --filter @lobbystack/admin build
pnpm --filter @lobbystack/admin exec playwright test --config playwright.single-host-auth.config.ts
