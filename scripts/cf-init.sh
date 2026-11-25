#!/usr/bin/env bash

# TODO(Ben): 远程资源初始化/改写/删除等运维命令暂不完整实现，后续统一纳入 cf:*。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_PATH="${REPO_ROOT}/wrangler.jsonc"
LOCAL_CONFIG_PATH="${REPO_ROOT}/wrangler.local.jsonc"
DB_NAME="${CF_D1_NAME:-qiaomu-blog-db}"
R2_NAME="${CF_R2_NAME:-qiaomu-blog-images}"
KV_NAME="${CF_KV_NAME:-qiaomu-blog-cache}"
SITE_URL="${SITE_URL:-${NEXT_PUBLIC_SITE_URL:-https://your-domain.com}}"
WITH_KV=0

for arg in "$@"; do
  case "$arg" in
    --with-kv)
      WITH_KV=1
      ;;
    --site-url=*)
      SITE_URL="${arg#*=}"
      ;;
    --db-name=*)
      DB_NAME="${arg#*=}"
      ;;
    --r2-name=*)
      R2_NAME="${arg#*=}"
      ;;
    --kv-name=*)
      KV_NAME="${arg#*=}"
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      echo "Usage: pnpm cf:init -- [--with-kv] [--site-url=https://your-domain.com] [--db-name=qiaomu-blog-db] [--r2-name=qiaomu-blog-images] [--kv-name=qiaomu-blog-cache]" >&2
      exit 1
      ;;
  esac
done

cd "${REPO_ROOT}"

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "❌ 未登录 Cloudflare，请先运行: pnpm exec wrangler login"
  exit 1
fi

if [[ ! -f "${LOCAL_CONFIG_PATH}" ]]; then
  cp "${TEMPLATE_PATH}" "${LOCAL_CONFIG_PATH}"
  echo "==> created local config: ${LOCAL_CONFIG_PATH}"
else
  echo "==> reusing local config: ${LOCAL_CONFIG_PATH}"
fi

site_url_override="${SITE_URL}" perl -0pi -e 's/("NEXT_PUBLIC_SITE_URL"[[:space:]]*:[[:space:]]*)"[^"]*"/$1"$ENV{site_url_override}"/g' "${LOCAL_CONFIG_PATH}"

if ! rg -q '"database_id"[[:space:]]*:[[:space:]]*"[^"]+"' "${LOCAL_CONFIG_PATH}"; then
  npx wrangler d1 create "${DB_NAME}" \
    --binding DB \
    --use-remote \
    --update-config \
    -c "${LOCAL_CONFIG_PATH}"
fi

if ! rg -q '"bucket_name"[[:space:]]*:[[:space:]]*"[^"]+"' "${LOCAL_CONFIG_PATH}"; then
  npx wrangler r2 bucket create "${R2_NAME}" \
    --binding IMAGES \
    --update-config \
    -c "${LOCAL_CONFIG_PATH}"
fi

if [[ "${WITH_KV}" == "1" ]] && ! rg -q '"kv_namespaces"[[:space:]]*:' "${LOCAL_CONFIG_PATH}"; then
  npx wrangler kv namespace create "${KV_NAME}" \
    --binding CACHE \
    --update-config \
    -c "${LOCAL_CONFIG_PATH}"
fi

npx wrangler d1 execute DB \
  --remote \
  --file="${REPO_ROOT}/db/schema.sql" \
  -c "${LOCAL_CONFIG_PATH}"

cat <<EOF
✅ Cloudflare 基础资源初始化完成

当前配置文件:
  ${LOCAL_CONFIG_PATH}

下一步:
  1. 配置本地环境变量: cp .env.example .env.local
  2. 设置线上 secrets:
     npx wrangler secret put ADMIN_PASSWORD -c ${LOCAL_CONFIG_PATH}
     npx wrangler secret put ADMIN_TOKEN_SALT -c ${LOCAL_CONFIG_PATH}
     npx wrangler secret put AI_CONFIG_ENCRYPTION_SECRET -c ${LOCAL_CONFIG_PATH}
     npx wrangler secret put AI_API_KEY -c ${LOCAL_CONFIG_PATH}   # 如果你要启用 AI
  3. 首次初始化已写入默认主题、字体和导航
  4. 生成类型: pnpm cf:types
  5. 部署: pnpm deploy
EOF
