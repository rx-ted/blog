#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${REPO_ROOT}/wrangler.local.jsonc" ]]; then
  printf '%s\n' "${REPO_ROOT}/wrangler.local.jsonc"
else
  if [[ -f "${REPO_ROOT}/wrangler.local.toml" ]]; then
    echo "⚠️  检测到旧版 wrangler.local.toml，现已改用 wrangler.local.jsonc；请重新运行 npm run cf:init" >&2
  fi
  printf '%s\n' "${REPO_ROOT}/wrangler.jsonc"
fi
