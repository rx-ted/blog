#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_PATH="$(bash "${SCRIPT_DIR}/cf-config.sh")"
SCHEMA_PATH="${REPO_ROOT}/db/schema.sql"
SEED_PATH="${REPO_ROOT}/db/seed-template.sql"
RESET=0
FROM_REMOTE=0

usage() {
  cat <<'EOF'
Usage: bash scripts/cf-local-db.sh [--reset] [--from-remote]

初始化 wrangler dev / preview 使用的本地 D1 数据库。

  --reset        删除本地 D1 状态（.wrangler/state/v3/d1）后重新写入 schema 和种子数据
  --from-remote  从远程 D1 导出数据并导入本地（隐含 --reset，会覆盖本地数据）
EOF
}

for arg in "$@"; do
  case "${arg}" in
    --reset)
      RESET=1
      ;;
    --from-remote)
      FROM_REMOTE=1
      RESET=1
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

cd "${REPO_ROOT}"

resolve_db_name() {
  perl -0ne 'print "$1\n" if /"d1_databases"[\s\S]*?"database_name"\s*:\s*"([^"]+)"/' "${CONFIG_PATH}"
}

local_has_table() {
  local table="$1"
  local json
  json="$(npx wrangler d1 execute DB --local -c "${CONFIG_PATH}" --json \
    --command "SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'" 2>/dev/null || true)"
  [[ -n "${json}" ]] || return 1
  node -e '
    let input = ""
    process.stdin.on("data", (chunk) => { input += chunk })
    process.stdin.on("end", () => {
      try {
        const parsed = JSON.parse(input)
        const rows = parsed?.[0]?.results ?? []
        process.exit(rows.length > 0 ? 0 : 1)
      } catch {
        process.exit(1)
      }
    })
  ' <<< "${json}"
}

echo "==> using wrangler config: ${CONFIG_PATH}"

if [[ "${RESET}" == "1" ]]; then
  rm -rf "${REPO_ROOT}/.wrangler/state/v3/d1"
  echo "==> removed local D1 state"
fi

if [[ "${FROM_REMOTE}" == "1" ]]; then
  DB_NAME="$(resolve_db_name)"
  if [[ -z "${DB_NAME}" ]]; then
    echo "❌ cannot find d1 database_name in ${CONFIG_PATH}" >&2
    exit 1
  fi

  TMP_SQL="$(mktemp -t qiaomu-d1-XXXXXX.sql)"
  trap 'rm -f "${TMP_SQL}"' EXIT

  # d1 export 不支持包含 FTS5 等虚拟表的整库导出，这里只导出普通表的数据，
  # schema 仍由 db/schema.sql 写入（含 FTS 虚拟表与同步触发器）。
  TABLES_JSON="$(npx wrangler d1 execute DB --remote -c "${CONFIG_PATH}" --json --command \
    "SELECT name FROM sqlite_master WHERE type='table' AND sql NOT LIKE 'CREATE VIRTUAL TABLE%' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE '%fts%' ORDER BY name")"
  TABLES="$(printf '%s' "${TABLES_JSON}" | node -e '
    let input = ""
    process.stdin.on("data", (chunk) => { input += chunk })
    process.stdin.on("end", () => {
      try {
        const parsed = JSON.parse(input)
        const names = (parsed?.[0]?.results ?? []).map((row) => row.name)
        process.stdout.write(names.join(" "))
      } catch {
        process.exit(1)
      }
    })
  ')"

  if [[ -z "${TABLES}" ]]; then
    echo "❌ failed to list tables of remote D1: ${DB_NAME}" >&2
    exit 1
  fi

  TABLE_ARGS=()
  for table in ${TABLES}; do
    TABLE_ARGS+=(--table "${table}")
  done

  echo "==> exporting remote D1 data: ${DB_NAME}"
  npx wrangler d1 export "${DB_NAME}" --remote --no-schema --skip-confirmation \
    "${TABLE_ARGS[@]}" --output "${TMP_SQL}" -c "${CONFIG_PATH}"

  echo "==> applying db/schema.sql to local D1"
  npx wrangler d1 execute DB --local --yes --file "${SCHEMA_PATH}" -c "${CONFIG_PATH}" >/dev/null

  # schema.sql 会写入默认分类/设置，先清空这些表再导入远程数据，避免主键冲突。
  DELETE_SQL=""
  for table in ${TABLES}; do
    DELETE_SQL+="DELETE FROM \"${table}\";"
  done
  npx wrangler d1 execute DB --local --yes -c "${CONFIG_PATH}" --command "${DELETE_SQL}" >/dev/null

  echo "==> importing remote data into local D1"
  npx wrangler d1 execute DB --local --yes --file "${TMP_SQL}" -c "${CONFIG_PATH}" >/dev/null
elif local_has_table posts; then
  echo "==> local D1 already has schema, skipping db/schema.sql (use --reset to rebuild)"
else
  echo "==> applying db/schema.sql to local D1"
  npx wrangler d1 execute DB --local --yes --file "${SCHEMA_PATH}" -c "${CONFIG_PATH}" >/dev/null
fi

if [[ "${FROM_REMOTE}" != "1" && -f "${SEED_PATH}" ]]; then
  echo "==> applying db/seed-template.sql to local D1"
  npx wrangler d1 execute DB --local --yes --file "${SEED_PATH}" -c "${CONFIG_PATH}" >/dev/null
fi

npx wrangler d1 execute DB --local -c "${CONFIG_PATH}" --json \
  --command "SELECT count(*) AS n FROM posts" | node -e '
    let input = ""
    process.stdin.on("data", (chunk) => { input += chunk })
    process.stdin.on("end", () => {
      try {
        const parsed = JSON.parse(input)
        const count = parsed?.[0]?.results?.[0]?.n ?? 0
        console.log(`✅ local D1 ready: ${count} post(s)`)
      } catch {
        console.log("✅ local D1 ready")
      }
    })
  '
