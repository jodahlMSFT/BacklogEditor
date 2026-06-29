# BacklogEditor

A single-file, zero-dependency interactive backlog editor. Dark-themed HTML app with drag-and-drop buckets, per-item priority, markdown import/export, live editing, and a read-only shareable snapshot — no build step, no server required.

## Features

- **Priority buckets** — 🔴 Critical / 🟡 Medium / 🔵 Low, with drag-and-drop reordering between and within buckets
- **Per-item priority** — each line item carries its own 🔴/🟡/🔵/⬜ (N/A) priority dropdown; N/A items are visually dimmed
- **Inline editing** — double-click or ✎ button to edit any item; rename buckets in place
- **Add / delete** — add new items per bucket, add new buckets, delete items or entire buckets
- **Cross-bucket drag** — drag items between buckets via the ⠿ handle
- **Priority view** — flat cross-bucket list ranked by item priority (🔴→🟡→🔵→⬜), with bucket tags on each item
- **Live search** — filter items across all buckets in real time
- **Tagging** — add `[tag]` tokens to items; filter by tag
- **Markdown import** — load any `.md` file via the File System Access API (retains file handle for direct save)
- **Markdown save** — 💾 Save overwrites the loaded file directly; **Save As…** for a new location
- **Snapshot export** — 📤 exports a self-contained read-only HTML file with both Buckets and Priority views, suitable for sharing via SharePoint or Teams
- **Expand / Collapse all** — works in both Bucket and Priority views
- **Dark theme** — easy on the eyes

## Usage

Open `BacklogEditor.html` directly in any modern browser — no server, no install.

### Loading a file
Click **📂 Load** and select any `.md` file. The editor starts empty — you must load a file to see content.

### Saving
- **💾 Save** — writes directly back to the file you loaded (no dialog after first load)
- **Save As…** — pick a new file location

### Sharing
Click **📤 Share snapshot** to export a standalone read-only HTML file. Upload to SharePoint and share the link, or pin as a Website tab in Microsoft Teams.

### Markdown format
```markdown
## 🔴 Bucket Title

- 🔴 Critical item text
- 🟡 Medium item text [tag]
- 🔵 Low item text
- ⬜ N/A item text
```

## Keyboard / interaction tips

| Action | How |
|--------|-----|
| Edit item | Double-click text or click ✎ |
| Confirm edit | Enter or click away |
| Cancel edit | Escape |
| Reorder items | Drag ⠿ handle |
| Reorder buckets | Drag bucket header |
| Rename bucket | Double-click bucket title |
| Search | Type in search box in toolbar |
| Filter by tag | Click a tag chip or type `#tagname` in search |

## ADO Integration (planned)

The editor is designed to work alongside Azure DevOps:
- **Backlog as thinking space** — lightweight, fast, opinionated
- **ADO as execution space** — structured, tracked, accountable
- Planned: push selected items to ADO as Deliverables; pull a diff of ADO changes back as a review

---

Built by [@jodahlMSFT](https://github.com/jodahlMSFT) with GitHub Copilot.
