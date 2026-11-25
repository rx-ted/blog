#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-full}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "==> clean build artifacts"
rm -rf .next .open-next

echo "==> pnpm lint"
pnpm lint

echo "==> pnpm test:run"
pnpm test:run

if [[ "${MODE}" == "full" ]]; then
  echo "==> npx @opennextjs/cloudflare@latest build"
  npx @opennextjs/cloudflare@latest build
else
  echo "==> pnpm build"
  pnpm build
fi

echo "Verification complete (${MODE})."
