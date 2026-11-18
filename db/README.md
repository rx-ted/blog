# db 目录说明（D1 / SQLite）

本目录存放 Cloudflare D1（SQLite）相关的 **表结构与种子 SQL**。项目主要通过 Wrangler 对 D1 执行这些文件。

## 文件结构

```
db/
├── README.md              # 本说明
├── schema.sql             # 当前「全量」表结构快照 + 默认种子数据（见下文）
└── migrations/            # 历史增量迁移 SQL（按文件名顺序编号）
    ├── 001_add_hidden_and_deleted_at.sql
    ├── 002_add_ai_actions.sql
    ├── 003_add_cover_image.sql
    ├── 004_add_ai_provider_profiles.sql
    ├── 005_add_post_slug_aliases.sql
    ├── 006_add_media_assets.sql
    ├── 007_add_ai_research_resources.sql
    └── 008_add_memos.sql
```

### `schema.sql` 是什么？

- 包含**表结构**（`CREATE TABLE` / 索引 / 触发器 / FTS 等）。
- 也包含**默认数据写入**（已合并原 `seed-template.sql` 的内容），例如：
  - `ai_actions` 的内置预设
  - `ai_post_generators` 的默认配置
  - 默认分类
  - `site_settings` 的默认主题/字体/导航等（使用 `INSERT OR IGNORE`）
- **不包含**你博客里的真实文章正文数据（`posts` 等业务内容不会整库导出在此）。
- `scripts/cf-init.sh`、`scripts/cf-deploy.sh` 以及本地初始化流程会执行 `db/schema.sql`（以脚本当前实现为准）。

### `migrations/*.sql` 是什么？

- 历史上的**增量变更**记录（如 `ALTER TABLE ... ADD COLUMN ...`、补建表等）。
- 当前仓库里 **`cf-init.sh` / `cf-local-db.sh` 并不会自动遍历执行 `migrations/`**；是否执行取决于你当时的运维流程（手动 `wrangler d1 execute --file ...` 等）。
- 因此容易出现：**`schema.sql` 已包含某些变更，而迁移文件仍保留在仓库**（历史归档），或反之导致不一致。维护时需注意对齐。

---

## 当前需要注意的点（请阅读）

1. **`schema.sql` 已包含 `memos` 表**（与 `migrations/008_add_memos.sql` 对齐）。全新库执行 `schema.sql` 即包含该表。
2. **`ai_provider_profiles.max_tokens` 默认值已统一为 `2000`**（`schema.sql` 与 `migrations/004_add_ai_provider_profiles.sql` 保持一致）。
3. **`ai_actions.profile_id`**：以 `schema.sql` 为准，全新初始化已包含该列。
4. **`*.sql` 是否「没问题」**  
   - 语法上多为常见 SQLite/D1 写法，但**是否可无脑叠加执行**取决于目标库是否已应用过旧迁移（例如 `ALTER TABLE ... ADD COLUMN` 重复执行会报错）。  
   - **是否需要合并**：建议策略二选一并写死在团队约定里：  
     - **策略 A（推荐长期维护）**：以 `schema.sql` 作为「从零初始化的权威结构快照」，每次结构变更时同时更新 `schema.sql`；`migrations/` 仅保留历史或逐步废弃，并在 README 注明。  
     - **策略 B**：保留「纯迁移」流程，`schema.sql` 退化为由迁移拼装或仅作参考，此时必须有明确的「按顺序 apply migrations」步骤并脚本化。  
   当前仓库更接近 **策略 A**（`cf-init` / 本地初始化依赖 `schema.sql`）。以后改结构时请同步更新 `schema.sql` 与必要的迁移说明。

---

## 如何修改表结构（建议流程）

1. **优先修改 `db/schema.sql`**，使其反映「新库应有的完整结构」（包括索引、触发器、FTS 等）。
2. **创建对象时优先使用“可重复执行”写法（幂等）**：
   - 表：`CREATE TABLE IF NOT EXISTS ...`
   - 普通/唯一索引：`CREATE INDEX IF NOT EXISTS ...` / `CREATE UNIQUE INDEX IF NOT EXISTS ...`（SQLite/D1 支持）
   - FTS 虚拟表：`CREATE VIRTUAL TABLE IF NOT EXISTS ...`（视版本支持，当前项目按此书写）
   - 触发器：SQLite **不支持** `CREATE TRIGGER IF NOT EXISTS`。推荐写法：`DROP TRIGGER IF EXISTS name;` 再 `CREATE TRIGGER name ...;`
   - 默认种子数据：对有唯一约束的插入可用 `INSERT OR IGNORE ...`；或先判断再插，避免重复。
3. **`ALTER TABLE` 的限制（重要）**：
   - SQLite **不支持** `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`。若要对**已存在的库**做增量变更，通常需要：
     - 在迁移 SQL 里直接写 `ALTER TABLE ... ADD COLUMN ...`，并在说明中注明“仅当列不存在时执行”（人工/流程保证），或
     - 通过应用启动时的兼容逻辑补列（项目中已有类似做法，见迁移注释），或
     - 采用“新表 + 迁移数据 + 重命名”的重建方式（成本高，谨慎使用）。
   - 因此：**新库**以更新后的 `schema.sql` 为准；**老库**用 `migrations/*.sql`（或约定脚本）增量升级，并在 PR 说明中写清执行顺序与是否可重复执行。
4. 若还有**已经跑在远程/他人环境的 D1**，为该次变更新增 `migrations/00X_描述.sql`（编号递增），并在说明里写明：新库跑 `schema.sql` 即可，老库需执行该迁移。
5. 修改后建议：
   - 本地：`npm run db:local:init -- --reset` 重建本地库验证。
   - 远程：先在测试/预览环境验证，再上线；操作前建议 `wrangler d1 export ... --remote` 备份。

---

## 如何写入 D1（应用 SQL）

所有示例假设在仓库根目录执行。配置文件以 `wrangler.local.jsonc` 为例（由 `npm run cf:init` 生成）；模板为 `wrangler.jsonc`（不含真实 id，不可直接用于生产写入真实库）。

### 本地开发库（Miniflare / `.wrangler/state/...`）

使用项目脚本（推荐）：

```bash
# 首次：按 schema.sql（及脚本逻辑）初始化本地 D1
npm run db:local:init

# 本地库删掉重建（会清空本地 D1 数据）
npm run db:local:init -- --reset

# 从远程 D1 导出数据覆盖本地（隐含 --reset；注意导出对 FTS 等虚拟表有限制，脚本内有说明）
npm run db:local:init -- --from-remote
```

手动对本地库执行单个 SQL 文件：

```bash
npx wrangler d1 execute DB --local --yes --file db/schema.sql -c wrangler.local.jsonc
```

执行单条 SQL（示例）：

```bash
npx wrangler d1 execute DB --local -c wrangler.local.jsonc --command "SELECT COUNT(*) AS n FROM posts;"
```

### 远程 D1（生产/远程预览所绑定的库）

> **高风险操作**（会影响线上数据）。建议先备份/导出。

执行单个 SQL 文件：

```bash
npx wrangler d1 execute DB --remote --yes --file db/schema.sql -c wrangler.local.jsonc
```

执行迁移文件示例：

```bash
npx wrangler d1 execute DB --remote --yes --file db/migrations/008_add_memos.sql -c wrangler.local.jsonc
```

使用 `cf-init.sh` 的「首次初始化远程库」流程（会创建资源、写回配置，并对远程执行 `db/schema.sql`）：

```bash
npm run cf:init -- --site-url=https://你的域名
```

（若仓库脚本行为与上述描述不一致，以 `scripts/cf-init.sh`、`scripts/cf-local-db.sh` 当前实现为准。）

### 导出远程库为 SQL（备份）

```bash
npx wrangler d1 export qiaomu-blog-db --remote --output ./backup.sql -c wrangler.local.jsonc
```

若库已损坏，导出可能失败；此时优先考虑新建库并从可用备份恢复。

---

## 如何读取 / 查询 D1

### 命令行（推荐排查）

本地：

```bash
npx wrangler d1 execute DB --local -c wrangler.local.jsonc --command "SELECT id, slug, title FROM posts ORDER BY published_at DESC LIMIT 10;"
```

远程：

```bash
npx wrangler d1 execute DB --remote -c wrangler.local.jsonc --command "SELECT COUNT(*) AS posts FROM posts;"
```

需要 JSON 输出时加 `--json`（便于脚本解析），例如：

```bash
npx wrangler d1 execute DB --local -c wrangler.local.jsonc --json --command "SELECT key, value FROM site_settings;"
```

### 在应用代码里读取

- 运行在 Cloudflare Workers / OpenNext 环境中时，通过绑定 **`DB`**（见 `wrangler*.jsonc` 中的 `d1_databases`）使用 D1 API（`env.DB.prepare(...).bind(...).all()/first()/run()` 等），具体以项目内 `lib/` 下封装为准。
- 本地 `wrangler dev` / `npm run preview` 时，行为取决于该 binding 的 `remote` 设置（以当前 `wrangler.local.jsonc` 为准）。

---

## 快速检查清单（改库前后）

- [ ] 新库从零创建：是否只依赖 `db/schema.sql` 就够？若不够，把缺失项补齐进 `schema.sql`。
- [ ] 老库升级：是否准备了对应 `migrations/*.sql`，并在真实环境演练过？
- [ ] 是否避免在生产对损坏库做「只 DELETE」式抢修？优先评估导出与重建方案。
- [ ] 敏感操作前是否已导出备份（`wrangler d1 export ... --remote`）？

---

## 相关脚本速查

- `scripts/cf-init.sh`：初始化 Cloudflare 资源并写入 `wrangler.local.jsonc`，远程执行 `db/schema.sql`。
- `scripts/cf-local-db.sh`：初始化/重置/从远程导入到本地 D1（见脚本内 `--help`）。
- `scripts/cf-deploy.sh`：部署流程中会对远程执行 `db/schema.sql`（以脚本内容为准）。
