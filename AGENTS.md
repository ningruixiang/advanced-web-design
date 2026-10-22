# AGENTS.md

Static HTML/CSS course-practice repo (《高级网页设计》student exercises). No build system, no package manager, no tests, no linter — verification means opening the file in a browser.

## Conventions

- Pure native HTML/CSS/JS only. No CDN, no external libraries — every page must be self-contained (opening files offline is the expected use).
- Flat layout: each lesson is one root-level `N-M.html` file (Chinese chars allowed in filenames, e.g. `5-1层叠与继承.html`).
- `index.html` is a hub page with a card grid linking every exercise. When adding a new exercise page, add a matching card (class `card reveal`, with `href`, `.num`, title, `.file`, description) to `index.html` — the numbering/order is course-chapter order.
- Shared assets: `css.css` (tiny external stylesheet, only referenced by `5-1层叠与继承.html` for a cascade demo) and `img/` (images 1–9 for `9-1transtion.html`).
- Language: page content and titles are zh-CN (`<html lang="zh-CN">`).

## Mandatory rules (实训硬性要求)

### Naming prefix `yl_`

- In ALL newly created HTML/CSS/JS code, every CSS class name, `id`, and JavaScript variable/function name MUST begin with the prefix `yl_` (e.g. `.yl_card`, `#yl_box`, `let yl_index = 0`, `function yl_init()`).（自 2026-10-22 起由原 `yuan_` 前缀变更而来，仅约束新写代码。）
- Existing exercise files and `index.html` keep their current class/id/variable names — never rename existing code; the prefix rule applies to newly written code only.
- When adding cards to `index.html`, reuse its existing markup and class names verbatim (no new CSS classes needed there).

### Page header comment (页面头注释)

- Every newly created HTML page MUST include an HTML comment immediately after the `<body>` opening tag, containing the student's name, date, student ID, and the page's function name:

```html
<!--
  姓名：宁瑞祥
  学号：2001010503
  日期：YYYY-MM-DD（创建当天）
  功能：<该页面的功能名称，如“移动端底部导航栏”>
-->
```

### Prompt log `yuan_prompt.md`

- BEFORE executing any user prompt or task, append exactly one record to `yuan_prompt.md` at the repo root (create the file with a `# 提示词记录` heading if it does not exist). Always APPEND at the end — never overwrite, truncate, or reorder previous records.
- This append must happen before any other tool call for that task (including reads/edits).
- Each record contains: local timestamp (`YYYY-MM-DD HH:mm:ss`), the model id currently in use (e.g. `deepseek/deepseek-v4-pro`), and the user's full prompt text verbatim, in this format:

```
## YYYY-MM-DD HH:mm:ss
- 模型：<model id>
- 提示词：
  > <full user prompt text>

```

### New page registration

- Every newly created exercise HTML file MUST be linked from `index.html` in the same batch of work: append one card (existing `card reveal` markup, next sequential `.num`, correct `href`/`.file`/title/description) at the end of the grid. Never leave a new exercise page unlinked.

## Gotchas

- Do not rename exercise files; `index.html` links and relative `img/` paths depend on exact names.
- `opencode.json` sets `"permission": "allow"` — no tool-use prompts for this workspace.
