# ByteGo 生图 Web（bytego-paint）设计

## 目标

独立静态站点（Cloudflare Pages），让用户在浏览器打开后获得与 Cherry Studio「绘画」Tab 布局一致的生图体验；自备 ByteGo API Key，使用预设模板与三个固定模型出图。

## 已确认决策

| 项 | 选择 |
|----|------|
| 位置 | 独立仓 `/Users/lukeliou/my-doc/github/bytego-paint`，与 `bytego-docs` 同级 |
| 保真度 | 布局/交互尽量 1:1 对齐 Cherry 绘画页 |
| 技术栈 | React + Vite + TypeScript + Tailwind |
| API 调用 | Cloudflare Pages Function 同源代理 |
| 历史 | 浏览器 IndexedDB（含缩略图/结果图），可丢 |
| 模板 | 移植 Cherry `painting-templates` |
| 语言 | 中文 UI |
| 模型 | `gpt-image-2` / `gpt-image-2.5-flare` / `gpt-image-2.5-sunburst` |
| 视觉 | Cherry 布局 + AI补给站 / ByteGo 品牌皮 |
| Logo | 「AI补给站」官方图 |

## 非目标（首版）

- 多 Provider / Cherry 账号 / SQLite / DataApi
- 图生图、参考图上传链路
- 英文 UI / i18n 切换
- 服务端持久化用户 Key 或历史
- 改动 `cherry-studio` 主仓

## 产品壳

- 顶栏：AI补给站 Logo +「ByteGo 生图」+ API Key 设置入口
- 历史条：本机记录缩略图、新建、删除、选中（PC 左侧；窄屏顶部横滑）
- 中央：空态模板轮盘 + 标题「给你的下一幅杰作，留一个位置。」；有结果则 Artboard
- 底部 Composer：模型选择、prompt、尺寸、生成/取消；有图后可折叠
- 无 Key：温馨提示对话框；禁止生成

## API

- 浏览器：`POST /api/images/generations`，Header `Authorization: Bearer <user-key>`
- Function 转发：`https://www.bytego.team/v1/images/generations`
- Body（OpenAI images 形）：`{ model, prompt, n: 1, size }`
- 响应：优先取 `data[].b64_json`，否则 `data[].url` 再拉取（由 Function 或前端处理 url）
- Key 仅经请求头传递，不写入 Cloudflare 环境变量、不落盘

## 存储

- `localStorage`：`bytego-paint.apiKey`、当前选中 id、UI 偏好
- IndexedDB `bytego-paint`：paintings 列表（id、prompt、model、size、createdAt、imageDataUrl/blob）

## 部署

- 构建：`pnpm build` → `dist/`
- `wrangler.toml`：`pages_build_output_dir = "dist"`
- `functions/api/images/generations.ts`：Pages Function
- 部署：`wrangler pages deploy`（项目名 `bytego-paint`）

## 成功标准

1. 手机与桌面可完成：填 Key → 选模板 → 选模型 → 出图 → 下载
2. 无 Key 时有中文温馨提示且无法生成
3. 刷新后本机历史与 Key 仍在（同浏览器）
4. 静态资源 + Function 可部署到 Cloudflare Pages
