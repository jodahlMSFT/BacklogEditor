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

> **`BacklogEditor-ADO.html`** is an experimental variant that layers the ADO
> integration on top of the stock editor — the original `BacklogEditor.html` stays
> clean and dependency-free. Phase 1 ("Deciding") is implemented against a **mock**
> ADO client: select items → **🔗 Commit to ADO** → choose a **parent level +
> parent** → preview → create. The backlog's shape is mirrored into ADO: **buckets
> become one level below the parent, items the level below that** (e.g. parent =
> Scenario Group → buckets = Scenarios, items = Deliverables). Committed buckets and
> items show a faint `🔗 #id` link chip and store an invisible `<!-- ado:NNN -->`
> marker in the Markdown; items tagged `[no-ado]` are excluded.
> Phase 3 ("Tracking-lite") is also prototyped as **two deliberately separate
> checks** — clarity = subtraction:
> - **⟳ Check updates** — the safe, everyday one. Surfaces only state changes on
>   items you already track (**🟢 Closed** → strike from backlog, **🟡 Modified** →
>   whisper). It never adds anything, so run it without fear.
> - **🆕 Check for new** — the discovery one. First asks *where* to look: under your
>   already-committed buckets, or under a specific parent you pick (level + parent, e.g.
>   a Scenario Group). Either way it surfaces only the **direct children** one level
>   below that aren't in the backlog yet (strictly opt-in, nothing auto-imports). In
>   parent scope, adding an item materializes that parent as a bucket.
> - **⇩ Pull by ID** — bring an arbitrary existing ADO item in by work-item id: it
>   becomes a bucket and you pick which of its children come along as items.
>
> Review sections are collapsed by default with counts (expand on click), states are
> color-coded to match ADO's own state categories, and your acknowledgements persist
> in an invisible `<!-- ado-meta: … -->` block so re-checks don't re-surface things
> you've already seen. Nothing is applied automatically. See
> `docs/ado-integration-design.md` for the full design and build sequence.

### Going live against real ADO

The page talks to ADO through a tiny **local proxy** (`ado-proxy.js`) that holds your
PAT and forwards REST calls — the token never lives in the HTML. Zero dependencies,
just Node.

1. Create a **Personal Access Token** in ADO with **Work Items (Read & Write)** scope.
2. Save it to a git-ignored file next to the HTML:
   ```bash
   echo "YOUR_PAT_HERE" > .ado-pat      # (or put ADO_PAT=... in .env)
   ```
3. Start the proxy (defaults: org `msdyneng`, project `FinOps`, port `7777`):
   ```bash
   node ado-proxy.js
   # override via env: ADO_ORG, ADO_PROJECT, ADO_ORG_URL, ADO_PROXY_PORT
   ```
4. Open **`BacklogEditor-ADO.html`**. The status pill in the toolbar shows
   **● ADO: org/project** when the proxy is reachable, or **● ADO: demo (mock)** when
   it isn't — in which case everything still works against the in-memory mock, so you
   can explore the flows offline. The page auto-detects on load and degrades gracefully.

> Full step-by-step (PAT scopes, `.env` config, endpoint reference, troubleshooting):
> **[`docs/ado-live-setup.md`](docs/ado-live-setup.md)**.

> The work-item **type names** the integration creates are `Scenario Group → Scenario
> → Deliverable → Task`. If your project uses different type names, adjust `ADO_LADDER`
> in `BacklogEditor-ADO.html`; reads work regardless of type names.

---

Built by [@jodahlMSFT](https://github.com/jodahlMSFT) with GitHub Copilot.
