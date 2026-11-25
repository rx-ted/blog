# Markdown 导入与自动保存调整设计

日期：2026-04-12  
状态：用户已确认（方案 2，其他按整理执行）

## 背景与目标

为 `/editor` 与后台管理入口增加本地 Markdown 文章导入能力，并修正编辑器自动保存策略，避免空内容/半空内容被误保存。

关联入口与现状：

- `/editor` 页面：`app/editor/page.tsx` -> `components/NovelEditorClient.tsx` -> `components/NovelEditor.tsx`
- 顶部右侧操作区锚点：`components/NovelEditor.tsx:1718`（目录/复制等按钮所在容器）
- 后台布局导航：`app/dashboard/(protected)/layout.tsx`（“写文章”按钮附近）
- 现有自动保存：`components/NovelEditor.tsx` 中 1.5s 防抖（`AUTOSAVE_DEBOUNCE_MS = 1500`），`onUpdate -> syncEditorContentState -> scheduleDraftSave`，元信息变更通过 `markDirty -> scheduleDraftSave`；`persistDraft` 当前在“标题或正文/媒体”存在时即可保存，标题为空时会归一化为 `无标题`

## 需求范围

### 1. 编辑器内导入本地 Markdown（`/editor`）

- 在 `NovelEditor` 顶部右侧操作区（约 1718 行容器）新增“导入文章/导入 Markdown”按钮。
- 用户选择本地 `.md` 文件后读取文本并解析 frontmatter + 正文。
- 导入行为：**全量覆盖导入内容到对应位置**（标题/slug/描述/标签/封面/分类/正文等可识别字段与正文）。
- 无 frontmatter：将整个文件内容作为正文导入。

### 2. 后台入口导入并跳转

- 在 `app/dashboard/(protected)/layout.tsx` 导航区新增“导入文章”按钮（位于“写文章”按钮旁，Server Component 中通过 Client 子组件实现交互）。
- 点击后选择本地文件，选择完成即跳转到 `/editor`，并在编辑器中加载导入内容完成覆盖。

### 3. 自动保存调整

- 仅当**标题非空且正文非空**（正文文本非空或包含媒体）时才允许自动保存。
- 标题为空或正文为空时，不应触发自动保存，不应因等待而自动创建/更新空或半空草稿。
- 自动保存机制默认改为 **方案 2：停止编辑 5 分钟后防抖保存**（将原 1.5s 防抖间隔调整为 5 分钟）。

## 详细设计

### A. Markdown 解析与字段映射

#### A1. 解析方式

- 使用已存在依赖 `gray-matter` 解析 Markdown。
- 解析结果：`data`（frontmatter）+ `content`（正文）。
- 若无 frontmatter 或 frontmatter 为空：`data = {}`，正文为原始文件全文（去除可能的 BOM/按需规范化换行，保持内容语义）。

#### A2. 标题解析规则（已确认）

- 优先级：`frontmatter.title`（trim 后非空） -> 正文中的第一个一级标题 `# ...`。
- 不使用文件名作为标题回退。
- 若两者均未解析到标题：**保留编辑器当前标题值**（不覆盖）。

#### A3. 字段映射与覆盖规则（已确认）

- 导入为“全量覆盖”语义，但 **frontmatter 未提供的字段保留编辑器当前值**（不清空、不用默认空值覆盖未提供项）。
- 仅对 frontmatter 中可识别且提供的字段进行覆盖；正文按 A4 规则覆盖。

建议兼容映射：

- `title`: `title`
- `slug`: `slug`
- `description`: `description | desc | summary | excerpt`
- `tags`: `tags | tag`
  - 数组：转字符串、trim、过滤空值、去重（保持顺序）
  - 字符串：按逗号/顿号/换行等常见分隔符拆分后同样规范化
- `coverImage`(编辑器状态) / `cover_image`: `cover | cover_image | coverImage | image | banner`
- `category`: `category | categories`（`categories` 为数组时取首个非空值）

未在 frontmatter 提供的上述字段：保留当前编辑器状态中的对应值（如当前 `slug/tags/description/coverImage/category`）。

#### A4. 正文导入规则

- 有 frontmatter：使用解析出的 `content` 作为正文 Markdown。
- 无 frontmatter：使用原始文件全文作为正文 Markdown。
- 正文导入后需更新编辑器文档内容、`previewHtml`、字符数、目录（TOC）等派生状态。
- 若正文首个一级标题被用于标题提取：是否从正文中移除该标题行由实现时按编辑器现有行为与内容一致性选择（优先避免标题重复显示；如保留需确保不产生明显重复，推荐在用于标题且位于正文开头时剥离该 heading 行）。

#### A5. 统一实现

- 抽取统一解析/应用辅助逻辑（建议 `lib/` 下新增模块，如 `lib/import-markdown-post.ts`），供：
  - `NovelEditor` 内文件选择导入
  - Dashboard 跳转后的编辑器导入消费
    复用同一套解析与字段归一化规则，避免行为不一致。

### B. 编辑器内导入交互（`components/NovelEditor.tsx`）

- 在约 1718 行右侧操作区新增导入按钮（图标 + tooltip/文案），样式与现有头部按钮一致。
- 增加隐藏文件输入：`accept=".md,.markdown,text/markdown,text/plain"`，单文件导入。
- 流程：点击按钮 -> 触发文件选择 -> 读取文本（`FileReader`/`file.text()`）-> 调用统一解析 -> 应用到编辑器状态与内容 -> 成功/失败反馈（toast/feedback）。
- 异常处理：读取失败、空文件或解析异常时提示错误，不应清空/破坏用户当前正在编辑的内容。
- 导入后将相关字段与正文变更纳入编辑器状态；自动保存是否触发遵循新的自动保存门禁与 5 分钟防抖策略（不做额外立即保存的特殊绕过，除非实现中为一致性明确需要）。

### C. Dashboard 导入按钮与跨页传递

#### C1. 布局改动

- `app/dashboard/(protected)/layout.tsx` 为 Server Component，保留现有结构。
- 在导航中“写文章”按钮旁新增 Client Component（如 `app/dashboard/(protected)/ImportArticleButton.tsx` 或等价命名）渲染“导入文章”按钮。

#### C2. 选择与跳转

- Client 组件内使用隐藏 file input 选择 `.md` 文件。
- 选择完成后读取文本内容，写入 `sessionStorage` 一次性键（例如 `qmblog:pending-editor-import-markdown`，可包含 `{ markdown, name, createdAt }` JSON 字符串）。
- 随后 `router.push('/editor?import=pending')`（或包含 `new=1` 的等价形式，确保进入可编辑新建上下文并由导入逻辑覆盖）。

#### C3. 编辑器消费

- `NovelEditor` 在初始化完成且 `draftReady` 后检查导入标记（URL 参数与/或 sessionStorage）。
- 若存在待导入数据：读取并解析 -> 应用导入覆盖 -> **立即移除 sessionStorage 键** -> 清理 URL 参数（`replaceState`）防止刷新重复导入。
- 若数据缺失/损坏：提示失败并清理标记，不影响正常编辑器使用。

### D. 自动保存调整（方案 2）

#### D1. 保存门禁

- 自动保存仅在同时满足以下条件时允许执行实际持久化：
  - `title.trim().length > 0`
  - 正文非空：`plainText.trim().length > 0` 或存在媒体内容（如 `<img|video|audio|iframe>` / 编辑器媒体节点）
- 不满足门禁时：
  - 不调用 `POST/PATCH /api/posts` 自动保存
  - 不应将空/半空状态作为有效草稿自动创建
  - UI 状态应合理反映“未满足自动保存条件”（避免误导为已保存空内容）；具体文案/状态实现时与现有 `saveState` 逻辑保持一致性

#### D2. 5 分钟防抖（方案 2，已确认）

- 将自动保存触发改为：**自最后一次编辑变更后停止编辑 5 分钟再保存**。
- 实现方向：`AUTOSAVE_DEBOUNCE_MS` 调整为 `5 * 60 * 1000`（或等价值常量），继续复用现有 `scheduleDraftSave` 的“清理旧定时器 + 重新计时”机制与请求去重/中止/重试逻辑。
- 任何会触发 `scheduleDraftSave/markDirty` 的内容或元信息变更都应重置 5 分钟计时；持续编辑会持续推迟保存。

#### D3. 与现有逻辑的兼容

- `persistDraft` 内现有 `hasMeaningfulContent` 判定与标题归一化（`无标题`）需按新门禁调整，避免“仅标题”或“仅正文”场景下自动保存。
- 快照去重、并发请求序号控制、失败重试机制保留。
- 手动保存/发布（`handleSave` 等显式用户操作）行为保持现有语义，除非实现时发现必须与门禁一致才能避免错误（本需求明确要求调整的是自动保存）。

## 涉及文件（预估）

- `components/NovelEditor.tsx`：导入按钮与文件读取、导入应用、初始化消费 dashboard handoff、自动保存门禁与 5 分钟防抖常量/行为调整
- `app/dashboard/(protected)/layout.tsx`：新增“导入文章”入口挂载
- `app/dashboard/(protected)/ImportArticleButton.tsx`（新建，Client Component）：选文件、写入 handoff、跳转 `/editor`
- `lib/import-markdown-post.ts`（新建，建议）：frontmatter 解析、字段归一化、标题提取辅助
- （如需要）`lib/editor-markdown.ts` 或现有编辑器工具：复用 Markdown -> 编辑器内容的转换/插入能力

## 验收要点

- `/editor` 顶部操作区可导入本地 `.md`，解析 frontmatter 并覆盖到标题/slug/描述/标签/封面/分类/正文对应位置；无 frontmatter 时正文完整导入。
- Dashboard 导航中可点击“导入文章”，选文件后跳转 `/editor` 并自动加载覆盖。
- 标题取 `frontmatter.title` 或正文首个 `#` 标题；未提供的 frontmatter 字段保留编辑器当前值。
- 标题或正文任一为空时不自动保存；标题和正文均非空时，停止编辑 5 分钟后才触发自动保存（持续编辑会推迟）。
- 导入失败不破坏当前编辑内容；dashboard handoff 仅消费一次且不因刷新重复导入。
