# Copilot instructions for BacklogEditor

## What this is

A **single-file, zero-build** browser app. Essentially all application code — HTML,
CSS, and JavaScript — lives in `BacklogEditor.html` (~1900 lines). There is no
bundler, no server, no framework, and no compile step. To run it, open
`BacklogEditor.html` directly in a modern browser (`file://`).

`BacklogEditor-ADO.html` is an **experimental variant** (a full copy of the stock
file plus the ADO-integration layer). The stock `BacklogEditor.html` is kept
pristine on purpose; ADO work goes into the `-ADO` variant. Shared code changes may
need to be applied to both files.

The only runtime dependency is **SortableJS**, loaded from a CDN `<script>` tag in
the file head (drag-and-drop). `package.json` dependencies (`puppeteer`, `xlsx`)
are **tooling only** — used by `screenshot.js`, not shipped to the browser.

## Commands

There is no build/lint/test suite. The only script is a screenshot generator:

```bash
npm install                # installs puppeteer (for screenshot.js only)
node screenshot.js         # renders backlog.md into backlog-screenshot.png headlessly
```

`screenshot.js` loads `BacklogEditor.html` in headless Chrome and calls the app's
own global `parseMarkdown()` / `render()` functions via `page.evaluate` — so it
depends on those staying globally accessible on `window`.

## Architecture (the big picture)

- **Single source of truth:** a module-level `let buckets = []` array. Each bucket is
  `{ id, title, priority, expanded, items[], tags[] }`; each item is
  `{ id, text, priority, tags[] }`. IDs come from the `uid()` counter.
- **Render model:** plain DOM built imperatively (`createElement` + `innerHTML`), no
  virtual DOM. `renderAll()` rebuilds the buckets container; `renderPriorityView()`
  and `renderTimelineView()` are alternate views selected by `setView(view)`
  (`'buckets' | 'priority' | 'timeline'`). After (re)rendering, `initSortables()`
  wires SortableJS onto the fresh nodes.
- **Persistence = Markdown files** via the **File System Access API**
  (`showOpenFilePicker` / `showSaveFilePicker`). The loaded file handle is retained
  so **💾 Save** overwrites in place; **Save As…** re-prompts. There is no
  localStorage/state store — the `.md` file *is* the state.
- **Snapshot export** (`exportSnapshot()`) builds a **second, self-contained HTML
  document as a template string** (its own `<style>`/`<script>` around line 1597+)
  and downloads it — a read-only viewer. When you change the main view's visual
  design, the snapshot template must be updated separately; it does not share CSS.
- **Round-trip contract:** `generateMarkdown()` (serialize) and `parseMarkdown()`
  (deserialize) are inverses and must stay in sync. Any change to the data model or
  the Markdown format needs edits to *both*.

## Key conventions

- **Priority is a 4-value enum string:** `'critical' | 'medium' | 'low' | 'na'`,
  represented in Markdown by leading emoji `🔴 / 🟡 / 🔵 / ⬜`. `🟢` is also parsed
  as `low` (legacy). `na` items exist for items but buckets only use the first three.
  Keep the emoji↔key maps consistent across `generateMarkdown`, `parseMarkdown`,
  and the view renderers.
- **Markdown format:** buckets are `## <emoji> BUCKET N: Title [tag]`, items are
  `- <emoji> text [tag]`. `parseMarkdown` is intentionally lenient (strips
  `BUCKET N:` prefixes, trailing ` — PRIORITY` labels, and leading emoji junk) so it
  can ingest hand-written or legacy files. See `backlog.md` for a real example.
- **Tags** are `[token]` substrings inside item/bucket text, split out by
  `extractTags()` and re-emitted by `tagsStr()`. The timeline/roadmap view groups by
  tag; per-tag metadata (dates/order) is round-tripped through a hidden
  `<!-- tag-meta: {json} -->` HTML comment appended by `generateMarkdown`.
- **Global functions:** UI handlers are plain globals called from inline
  `onclick="..."` attributes and referenced by `screenshot.js`. Keep new handlers
  global (do not wrap the whole script in a module/IIFE that hides them).
- **Emoji in source:** the file relies on literal Unicode emoji in JS string
  comparisons (e.g. `text.startsWith('🔴 ')`). Preserve UTF-8 encoding when editing.

## Related docs

- `README.md` — user-facing feature list, Markdown format, interaction table.
- `docs/ado-integration-design.md` — design for a *planned, not yet built* Azure
  DevOps push/pull integration (work-item IDs stored as `<!-- ado:NNN -->` comments).
  Treat as forward-looking spec, not current behavior.
