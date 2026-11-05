# ByteGo 生图 Web Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship a Cloudflare Pages React app that mirrors Cherry Studio’s Paintings tab for ByteGo image generation.

**Architecture:** Vite SPA + Pages Function proxy; IndexedDB history; Cherry templates under `public/templates`.

**Tech Stack:** React 19, Vite 6, TypeScript, Tailwind CSS 4, Wrangler Pages Functions

## Global Constraints

- Chinese UI only; brand = AI补给站 + ByteGo 生图
- Models fixed to `gpt-image-2`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`
- Upstream `https://www.bytego.team/v1/images/generations`
- Never persist API keys server-side
- Do not modify `cherry-studio` repo

---

## Task 1: Scaffold project

- [x] Create Vite React-TS app with Tailwind
- [x] Add wrangler + Pages Function stub
- [x] Copy logo to `public/logo.png`
- [x] Verify `pnpm build` succeeds

## Task 2: Domain model + storage

- [x] Define Painting record + model catalog
- [x] API key localStorage helpers
- [x] IndexedDB CRUD for paintings

## Task 3: Pages Function proxy

- [x] Forward POST + Authorization to ByteGo
- [x] Map errors to JSON `{ error: string }`
- [x] Dev: Vite middleware mirrors Function

## Task 4: UI shell (1:1 layout)

- [x] Top bar with logo + API key dialog (温馨提示)
- [x] History strip (responsive)
- [x] Artboard + template showcase
- [x] Composer (model, size, prompt, generate/cancel)

## Task 5: Generate flow

- [x] Guard on missing key
- [x] Call `/api/images/generations`
- [x] Persist result to IndexedDB + show on Artboard
- [x] Download button

## Task 6: Polish + deploy docs

- [x] Mobile layout classes
- [x] README: dev / build / deploy
- [x] `pnpm build` succeeds
