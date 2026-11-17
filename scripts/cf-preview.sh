#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_PATH="$(bash "${SCRIPT_DIR}/cf-config.sh")"
LOCAL_BINDINGS=0

usage() {
  cat <<'EOF'
Usage: bash scripts/cf-preview.sh [--local]

  --local   禁用远程绑定，D1 / R2 / AI 全部使用本地模拟（等价于 PREVIEW_LOCAL=1）
EOF
}

for arg in "$@"; do
  case "${arg}" in
    --local)
      LOCAL_BINDINGS=1
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
  LOCAL_BINDINGS=1
fi

if [[ "${LOCAL_BINDINGS}" == "1" && ( "${PREVIEW_REMOTE:-}" == "1" || "${PREVIEW_REMOTE:-}" == "true" ) ]]; then
  echo "❌ cannot combine local bindings (--local / PREVIEW_LOCAL) with PREVIEW_REMOTE" >&2
  exit 1
fi

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
  echo "==> preview mode: fully local (remote bindings disabled)"
  echo "==> note: D1 uses the local database in .wrangler/state; initialize it with: npm run db:local:init"
  preview_cmd+=(--local)
elif [[ "${PREVIEW_REMOTE:-}" == "1" || "${PREVIEW_REMOTE:-}" == "true" ]]; then
  echo "==> preview mode: remote Cloudflare resources"
  echo "==> warning: this preview can read and write the resources bound in ${CONFIG_PATH}"
  preview_cmd+=(--remote)
else
  echo "==> preview mode: local runtime with binding modes from ${CONFIG_PATH}"
  echo "==> note: bindings marked remote in Wrangler will use live resources; other bindings still use local state"
  echo "==> note: remote bindings open a preview session on *.workers.dev; if that host is blocked,"
  echo "==> note: requests will hang. Use 'npm run preview:local' for an offline preview instead."

  if [[ ! -f "${REPO_ROOT}/.dev.vars" && ( -z "${ADMIN_PASSWORD:-}" || -z "${ADMIN_TOKEN_SALT:-}" ) ]]; then
    echo "==> warning: ADMIN_PASSWORD / ADMIN_TOKEN_SALT are not set in the local shell"
    echo "==> warning: admin login will return 503 in local preview unless you provide these secrets via env or .dev.vars"
  fi
fi

WRANGLER_SEND_METRICS=false "${preview_cmd[@]}"
