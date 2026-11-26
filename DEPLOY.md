# 部署指南

Qiaomu Blog Open Source 的正式部署方式是 `OpenNext + Cloudflare Workers`。

## 首次部署

### 1. 安装依赖和环境变量

```bash
pnpm install
cp .env.example .env.local
```

至少填写：

```env
ADMIN_PASSWORD=change-me
ADMIN_TOKEN_SALT=change-me-to-a-random-string
AI_CONFIG_ENCRYPTION_SECRET=change-me-to-another-random-string
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 初始化资源

```bash
pnpm cf:init -- --site-url=https://your-domain.com
```

如果还要启用公共缓存 KV：

```bash
pnpm cf:init -- --site-url=https://your-domain.com --with-kv
```

这一步会生成本地的 `wrangler.local.jsonc`，并自动写入真实 D1 / R2 / KV 绑定。

### 4. 设置 secrets

```bash
npx wrangler secret put ADMIN_PASSWORD -c wrangler.local.jsonc
npx wrangler secret put ADMIN_TOKEN_SALT -c wrangler.local.jsonc
npx wrangler secret put AI_CONFIG_ENCRYPTION_SECRET -c wrangler.local.jsonc
```

如需外部 AI：

```bash
npx wrangler secret put AI_API_KEY -c wrangler.local.jsonc
```

### 5. 生成类型并部署

```bash
pnpm cf:types
pnpm build
pnpm deploy
```

## 本地 Worker 预览

```bash
pnpm preview:local
```

脚本会优先读取 `wrangler.local.jsonc`。模板仓库里的 `wrangler.jsonc` 不带真实资源绑定，不能直接拿来部署生产。

默认预览遵循 `wrangler.local.jsonc` 里每个绑定自己的 `remote` 设置。`cf:init` 会把 D1 标记为 `"remote": true`，此时 `wrangler dev` 需要在 `*.workers.dev` 上建立远程预览会话；如果该域名被网络屏蔽或无法访问，请求会长时间卡住（每个 D1 查询约 75 秒后报 `internal error`）。

网络访问不了 `*.workers.dev` 时，改用纯本地预览：

```bash
pnpm cf:local:init    # 首次：写入 db/schema.sql 和种子数据到本地 D1
pnpm preview:local    # 所有绑定使用本地模拟，不再访问 Cloudflare
```

`cf:local:init` 也可以拉取线上数据到本地：

```bash
pnpm cf:local:init -- --from-remote   # 会覆盖本地 D1 数据
```

本地 D1 数据保存在 `.wrangler/state/v3/d1`，删除或加 `--reset` 即可重建。

## 日常更新

```bash
git pull
pnpm install
pnpm check && pnpm typecheck && pnpm test:run && pnpm build
pnpm deploy
```

## 常见问题

### `pnpm deploy` 报缺少 D1 或 R2

先执行：

```bash
pnpm cf:init -- --site-url=https://your-domain.com
```

### 后台登录提示鉴权未配置完成

至少补齐：

```bash
npx wrangler secret put ADMIN_PASSWORD -c wrangler.local.jsonc
npx wrangler secret put ADMIN_TOKEN_SALT -c wrangler.local.jsonc
```

### AI Provider 已保存的 Key 无法解密

通常是 `AI_CONFIG_ENCRYPTION_SECRET` 或 `ADMIN_TOKEN_SALT` 被改了。建议固定 `AI_CONFIG_ENCRYPTION_SECRET`，不要和 token salt 复用。

### RSS / sitemap / canonical 指向错域名

检查：

- `.env.local`
- `wrangler.local.jsonc`

两处的 `NEXT_PUBLIC_SITE_URL` 必须一致。
