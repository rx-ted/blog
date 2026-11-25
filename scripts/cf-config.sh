#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${1:-}"

resolve_config() {
  local file="$1"
  if [[ -f "${REPO_ROOT}/${file}" ]]; then
    printf '%s\n' "${REPO_ROOT}/${file}"
    return 0
  fi
  return 1
}

case "${MODE}" in
  local)
    resolve_config "wrangler.local.jsonc" || {
      echo "❌ Missing wrangler.local.jsonc. Run: pnpm cf:local:init" >&2
      exit 1
    }
    ;;
  prod)
    resolve_config "wrangler.prod.jsonc" || resolve_config "wrangler.local.jsonc" || {
      echo "❌ Missing wrangler.prod.jsonc (or wrangler.local.jsonc fallback)." >&2
      echo "   Create wrangler.prod.jsonc from wrangler.jsonc template." >&2
      exit 1
    }
    ;;
  "")
    # Backward-compatible default: local -> prod -> template
    if resolve_config "wrangler.local.jsonc"; then
      exit 0
    fi
    if resolve_config "wrangler.prod.jsonc"; then
      exit 0
    fi
    if [[ -f "${REPO_ROOT}/wrangler.local.toml" ]]; then
      echo "⚠️  检测到旧版 wrangler.local.toml，现已改用 wrangler.local.jsonc；请重新运行 pnpm cf:local:init" >&2
    fi
    printf '%s\n' "${REPO_ROOT}/wrangler.jsonc"
    ;;
  *)
    echo "Usage: bash scripts/cf-config.sh [local|prod]" >&2
    exit 1
    ;;
esac
