# BacklogEditor

A single-file, zero-dependency interactive backlog editor. Dark-themed HTML app with drag-and-drop buckets, per-item priority, markdown import/export, and live editing — no build step, no server required.

## Features

- **Priority buckets** — 🔴 Critical / 🟡 Medium / 🔵 Low, with drag-and-drop reordering between and within buckets
- **Per-item priority** — each line item carries its own 🔴/🟡/🔵/⬜ (N/A) priority dropdown; N/A items are visually dimmed
- **Inline editing** — double-click or ✎ button to edit any item; rename buckets in place
- **Add / delete** — add new items per bucket, add new buckets, delete items or entire buckets
- **Cross-bucket drag** — drag items between buckets via the ⠿ handle
- **Markdown import** — load any `.md` file; bucket headings and item bullets are parsed automatically
- **Markdown export** — save to a new `.md` file with emoji-prefixed priority per item
- **Dark theme** — easy on the eyes

## Usage

Open `BacklogEditor.html` directly in any modern browser — no server, no install.

### Loading a markdown file
Click **📂 Load MD** and select any `.md` file. Expected format:

```markdown
## 🔴 Bucket Title

- 🔴 Critical item text
- 🟡 Medium item text
- 🔵 Low item text
```

Bucket numbers (`BUCKET 1:`), priority labels (`— CRITICAL PRIORITY`), and leading emoji/symbols are stripped automatically on load.

### Saving
Click **💾 Save MD** to download the current state as a new markdown file.

## Keyboard / interaction tips

| Action | How |
|--------|-----|
| Edit item | Double-click text or click ✎ |
| Confirm edit | Enter or click away |
| Cancel edit | Escape |
| Reorder items | Drag ⠿ handle |
| Reorder buckets | Drag bucket header |
| Rename bucket | Double-click bucket title |

---

Built by [@jodahlMSFT](https://github.com/jodahlMSFT) with GitHub Copilot.
