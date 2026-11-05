# ByteGo 生图 · AI补给站

网页版绘画工作台：布局对齐 Cherry Studio「绘画」页，调用 ByteGo `images/generations`，部署到 Cloudflare Pages。

## 功能

- 填入自有 API Key（仅存本机；经 Pages Function 代理）
- 三个模型：`gpt-image-2` / `gpt-image-2.5-flare` / `gpt-image-2.5-sunburst`
- Cherry 预设模板轮盘
- 本机 IndexedDB 历史、下载结果图
- 响应式：桌面侧栏历史 + 移动端顶栏横滑

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:8789/`。开发态由 Vite 中间件代理 `/api/images/generations` → ByteGo。

## 构建与部署

```bash
pnpm build
pnpm deploy
```

或连接 Cloudflare Pages：构建命令 `pnpm build`，输出目录 `dist`，Functions 目录 `functions/`。

## 设计文档

- [设计说明](docs/superpowers/specs/2026-11-05-bytego-paint-design.md)
- [实现计划](docs/superpowers/plans/2026-11-05-bytego-paint.md)
