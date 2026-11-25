#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_MODE="${CF_PREVIEW_MODE:-}"
LOCAL_BINDINGS=0
REMOTE_PREVIEW=0

usage() {
  cat <<'EOF'
Usage: bash scripts/cf-preview.sh [--local|--prod]

  --local   使用 wrangler.local.jsonc，本地模拟资源预览
  --prod    使用 wrangler.prod.jsonc，连接远程生产资源预览（不部署）
EOF
}

for arg in "$@"; do
  case "${arg}" in
    --local)
      CONFIG_MODE="local"
      LOCAL_BINDINGS=1
      ;;
    --prod|--remote)
      CONFIG_MODE="prod"
      REMOTE_PREVIEW=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "${PREVIEW_LOCAL:-}" == "1" || "${PREVIEW_LOCAL:-}" == "true" ]]; then
  CONFIG_MODE="local"
  LOCAL_BINDINGS=1
fi

if [[ "${PREVIEW_REMOTE:-}" == "1" || "${PREVIEW_REMOTE:-}" == "true" ]]; then
  CONFIG_MODE="prod"
  REMOTE_PREVIEW=1
fi

if [[ "${LOCAL_BINDINGS}" == "1" && "${REMOTE_PREVIEW}" == "1" ]]; then
  echo "❌ cannot combine local bindings with remote/production preview" >&2
  exit 1
fi

if [[ -z "${CONFIG_MODE}" ]]; then
  CONFIG_MODE="local"
  LOCAL_BINDINGS=1
fi

CONFIG_PATH="$(bash "${SCRIPT_DIR}/cf-config.sh" "${CONFIG_MODE}")"

cd "${REPO_ROOT}"

echo "==> using wrangler config: ${CONFIG_PATH}"
bash "${SCRIPT_DIR}/cf-validate-config.sh" "${CONFIG_PATH}"

pkill -9 -f wrangler 2>/dev/null || true
pkill -9 -f workerd 2>/dev/null || true
sleep 1

rm -rf .next .open-next
npx opennextjs-cloudflare build

preview_cmd=(npx opennextjs-cloudflare preview -c "${CONFIG_PATH}")

if [[ "${LOCAL_BINDINGS}" == "1" ]]; then
  echo "==> preview mode: local (${CONFIG_PATH})"
  echo "==> note: D1 uses the local database in .wrangler/state; initialize it with: pnpm cf:local:init"
  preview_cmd+=(--local)
elif [[ "${REMOTE_PREVIEW}" == "1" ]]; then
  echo "==> preview mode: production resources (${CONFIG_PATH})"
  echo "==> warning: this preview can read and write the resources bound in ${CONFIG_PATH}"
  preview_cmd+=(--remote)
else
  echo "==> preview mode: local runtime with binding modes from ${CONFIG_PATH}"
  echo "==> note: bindings marked remote in Wrangler will use live resources; other bindings still use local state"

  if [[ ! -f "${REPO_ROOT}/.dev.vars" && ( -z "${ADMIN_PASSWORD:-}" || -z "${ADMIN_TOKEN_SALT:-}" ) ]]; then
    echo "==> warning: ADMIN_PASSWORD / ADMIN_TOKEN_SALT are not set in the local shell"
    echo "==> warning: admin login will return 503 in local preview unless you provide these secrets via env or .dev.vars"
  fi
fi

WRANGLER_SEND_METRICS=false "${preview_cmd[@]}"
