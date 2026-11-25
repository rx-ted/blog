#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-local}"
CONFIG_PATH="$(bash "${SCRIPT_DIR}/cf-config.sh" "${MODE}")"

echo "==> using wrangler config: ${CONFIG_PATH}"
npx wrangler types --env-interface CloudflareEnv -c "${CONFIG_PATH}"

