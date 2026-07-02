# ADO Integration Design

> **Status:** Planned — not yet implemented.
> Last updated: 1 July 2026

---

## 1. Vision

The backlog editor is the **thinking space** — lightweight, fast, portable. ADO is the **execution space** — structured, tracked, accountable. The integration bridges them without making the editor feel like a heavy ADO client.

Key principle: the editor stays fully usable offline/standalone. ADO is opt-in.

### Guiding principle: clarity = subtraction

The backlog is not an ADO mirror; it is a **place of clarity**. ADO holds *everything*
(every task, bug, state, assignee) and its failure mode is noise. The backlog holds
only **what matters and why** — one line each. The single rule that governs every
integration decision:

> **The backlog must never get bigger or noisier because of ADO. Every sync should
> leave it clearer than before.**

Consequences of that rule:

- **Asymmetric ownership — no two-way field merge, ever.**
  - Backlog owns: *wording, priority, what deserves attention* (human judgment).
  - ADO owns: *state, assignment, iteration* (execution bookkeeping).
  - They never conflict because they never overlap.
- **Pull is biased toward removal.** The highest-value ADO→backlog signal is
  "this shipped → strike it." Celebrate items *leaving* the backlog.
- **Push is a commitment ritual, not a bulk export.** You push only what you've
  *decided* to execute; that act is a moment of clarity.
- **ADO status is a whisper, not a column.** Linked items may show a faint state
  hint (e.g. `▸ Active`); never ADO's full field set or hierarchy on screen.
- **The backlog stays lossy and portable on purpose.** Fully usable with zero ADO
  connection. ADO is an optional lens, never a dependency.

---

## 1a. Build sequence

Three lenses, added one at a time; each adds meaning without adding noise.

1. **Deciding (push-first)** — the commitment ritual. Select items → "Commit to ADO"
   → preview → create Deliverable → write back the invisible `<!-- ado:NNN -->` link.
   Milestone templates set the target; `[no-ado]` keeps items local forever. Nothing
   auto-pushes; linked items get a faint "committed" affordance so *decided* vs
   *still-thinking* is visible at a glance. **This phase gates the deployment choice
   (see §6).**
2. **Framing (narrative/roadmap)** — nearly free: the app already has `[tag]`s and a
   timeline view. Collapse three vocabularies into one — a `[PP2]` tag = a milestone
   template = an ADO parent scenario. The story is authored *here* and drives
   grouping, the roadmap timeline, and the push target. Never reconstructed from
   ADO's hierarchy.
3. **Tracking-lite (pull-first)** — the pull-diff (§5), reweighted for clarity:
   **Closed** is the star (subtraction), **Modified** is a whisper on the linked item,
   **New** defaults to *ignored* — shown, never auto-imported, so the backlog can't
   bloat back into a work-item list.

---

## 2. Core Workflows

### Push (editor → ADO)
- Select one or more items and push them as ADO Deliverables
- Used when you've decided to actually execute on something
- Not everything in the backlog should go to ADO — aspirational/strategic items stay local
- Items can be explicitly marked `[no-ado]` to exclude them from any push operation

### Pull diff (ADO → editor)
- **Two separate on-demand checks** (clarity = subtraction — see §7a):
  - **⟳ Check updates** — the safe, everyday check. Only state changes on already-linked
    **buckets and items**. Surfaces 🟢 **Closed** (shipped/cut — strike from backlog) and
    🟡 **Modified** (a *whisper* — review, rarely act; includes title and re-parent
    changes). Adds nothing, so it can be run without worry. Linked buckets are compared too,
    not just items - so a bucket relinked to a differently-named ADO item shows a title
    reconciliation (**Use ADO title** / **Got it**). On link/relink the baseline title is
    seeded from the entry's *own* current name, so any mismatch with the ADO title surfaces
    once for reconciliation; matching names flag nothing.
  - **🆕 Check for new** — the discovery check. First asks *where* to look: under your
    committed buckets, or under a single parent you pick (any level in ADO_PARENTS, e.g.
    a Scenario Group). Surfaces only the **direct children one level below** that scope
    which aren't in the backlog — **default to ignored**, opt-in only, never
    auto-imported. In parent scope, adding an item materializes the picked parent as a
    bucket.
- **⇩ Pull by ID** — bring an arbitrary existing ADO work item in: it becomes a bucket
  and the user selects which children come along as items (dedupes already-linked ids).
- **🔗 Link to ADO** (per bucket / per item) — associate a backlog entry you *already*
  have with an existing ADO work item **without creating anything**. The 🔗 button on a
  bucket header or item row opens the link modal; on confirm the entry gains the
  same ADO link a commit would give it (so it tracks state/title/parent changes and is
  skipped by future commits). The same modal **unlinks** or **re-links** an entry. An id
  already linked elsewhere is rejected.
  - **Finding the item to link: search or paste, scoped.** The modal accepts a **title
    search** (WIQL `CONTAINS`) or a **pasted id** (direct fetch, fast). Because a
    whole-project title scan is slow (~10s), the search is **scoped under a chosen
    Scenario Group or Scenario** (the `Search under` selector, populated from
    `ADO_PARENTS`, remembered per browser) - a recursive tree query that returns in ~2-3s.
    An `Entire project (slower)` option remains for the rare cross-scope case. Results
    render as a pickable list showing type · state · parent; the row already linked
    elsewhere is shown disabled. This is how you *browse* to the right item when you don't
    know the id - e.g. an auto-generated ADO item duplicates one that already exists **with
    history**, and you want to repoint the backlog entry to the item worth keeping.
  - **The ADO chip is a menu.** Clicking the always-visible `🔗 #NNN` chip on any linked
    bucket/item opens a small popover: **Open in ADO ↗ / Relink to another item… / Unlink**,
    so fixing a wrong or duplicate link is discoverable without hovering for the 🔗 button.
- Scope for "new" is chosen per-check: every committed bucket, or one picked parent —
  always just the direct children one level below (never a deep tree walk).
- Review sections are **collapsed by default with counts**, states are **color-coded to
  ADO's own state categories**, and acknowledgements **persist** in an invisible
  `<!-- ado-meta: {"acked":{id:state},"ignoredNew":[…]} -->` block so re-checks don't
  re-surface things already seen.
- Changes are never auto-applied — you review and accept/ignore each one

### AI-written descriptions (editor → ADO)
- **✍ Write description** (per bucket / per item) opens a modal that **first pulls the
  current Description from ADO** so you start from what's really there. From there you can
  **✨ Generate with AI** a fresh draft in our "place of clarity" format (**Problem · Goal ·
  In scope · Known issues · Related · Acceptance criteria**), **edit the text directly**, or
  both - then **Push to ADO**. The ✍ button sits next to 🔗 on bucket headers, item rows,
  and priority-view rows.
- The draft is produced by a real model (**GitHub Models `openai/gpt-4o`**, authed with
  the local `gh` token — no extra key), called through the proxy's `POST /describe`
  endpoint. The page hands it the backlog context (bucket title, child/sibling item text,
  priority, and the linked ADO id/title/state) so the draft reflects *our* clarity, not
  just the sparse ADO fields.
- The result opens in an **editable modal** (contentEditable). You can **✨ Generate with
  AI**, edit freely, then **Push to ADO** (writes `System.Description` via
  `PATCH /workitem/:id`) or **Cancel**. Nothing is pushed until you approve; push is
  disabled until the entry is linked to an ADO item and the editor has content.
- Style guardrail: drafts use a normal hyphen (-), never the wide em-dash.
- **Guidance field** — a collapsible "Guidance for the AI" box in the modal holds light,
  persistent instructions applied to every draft (e.g. *"skip testing and documentation -
  they're part of our definition of done"*). It is **stored in the backlog `.md` itself**
  (in the `ado-meta` block as `descGuidance`), so it travels with the file rather than the
  browser, and is passed to the model as author guidance that overrides the section defaults.
- Offline/demo (proxy not running) falls back to a local scaffold in the same format so
  the flow is still explorable without an LLM.

---

## 3. Mapping Design

ADO has a hierarchy: **Scenario Group → Scenario → Deliverable → Task**. The backlog
has: **Bucket → Item**. Rather than flatten, we **mirror the backlog's shape into ADO
relative to a chosen parent**.

### Decided approach: pick a parent (level + item); buckets and items cascade below it

- On commit you choose a **parent level** (Scenario Group, Scenario, …) and a specific
  **parent** at that level.
- **Buckets** are created **one level below the parent**; **items** **one level below
  their bucket** — preserving Bucket → Item as two real levels of ADO hierarchy.
- Concretely, on the ladder `Scenario Group → Scenario → Deliverable → Task`:
  - Parent = **Scenario Group** → buckets become **Scenarios**, items become **Deliverables**
  - Parent = **Scenario** → buckets become **Deliverables**, items become **Tasks**
- A parent level is only offered if it leaves room for two levels below it.
- A **bucket is materialized once** in ADO (its work-item id is remembered); further
  commits of items in that bucket reuse it as their parent — no duplicate bucket
  work items.
- One parent per commit; the whole batch lands under it. (Earlier idea of per-bucket
  default targets / per-item overrides is dropped in favor of this simpler model.)

### Known scenario groups (FinOps project, Rental Management)

| ID | Title | Release |
|----|-------|---------|
| 1052319 | Rental Management - Private Preview 2 Phase III | 10.0.49 |
| 1052320 | Rental Management - Public Preview Phase IV | 10.0.50 |
| 1057270 | Rental Management - GA | TBD |

Relevant child scenarios under 1052319 (Jonas owns):
- `1084288` — Misc improvements incl. CAT requirements
- `1134484` — Private Preview 10.0.48 Feedback

Relevant child scenarios under 1052320:
- `1127509` — Misc improvements incl. CAT requirements - Public Preview
- `1140645` — Private Preview 10.0.48 and 10.0.49 Feedback

Both **buckets and items** store their ADO link invisibly in the markdown (see §4);
a bucket heading carries `<!-- ado:NNN -->` just like an item line does.

---

## 4. Item Identity & Link Preservation

When an item is pushed to ADO it gets a work item ID. That ID must be stored invisibly in the markdown so the link survives edits on both sides:

```markdown
- 🔴 Create fleet item from existing inventory <!-- ado:1127080 -->
```

**Conflict rule:** the backlog owns wording and priority; ADO owns state, assignment, and milestone. If the same item is edited on both sides between syncs, a diff is shown — you choose which wins.

---

## 5. Diff Algorithm

On pull, compare the last-cached ADO state (stored as a JSON sidecar next to the `.md` file) against current ADO state:

1. Fetch all deliverables under mapped scenario groups via ADO REST API
2. Diff against local cache: detect closed, modified, new
3. Filter noise: ignore task-level changes, label tweaks — focus on deliverable state transitions and new items
4. Sort by relevance: items assigned to you first, then items in your scenarios, then everything else
5. Present as a reviewable list — accept/ignore per item

---

## 6. Authentication

- Use ADO Personal Access Token (PAT), read by the proxy from a git-ignored `.ado-pat`/`.env` — never in the page or committed to the repo
- Org URL (`https://dev.azure.com/msdyneng`) and project (`FinOps`) configurable in settings
- **CORS issue:** browsers block ADO REST API calls from `file://` origins.
- **Decision: tiny local Node proxy.** Chosen because it preserves the tool's
  identity — you still just open `BacklogEditor.html`; the ~30-line proxy runs only
  when you deliberately reach for ADO, and the PAT stays server-side (never in the
  page). Rejected alternatives: hosted Azure Static Web App (cleaner OAuth, but
  abandons zero-server portability) and Electron (no CORS, but it's an install, not a
  file).
  - Proxy responsibilities: hold the PAT (from env/local config, never committed),
    forward whitelisted ADO REST calls, add CORS headers so the `file://` page can
    call `http://localhost:<port>`.
  - The page degrades gracefully: if the proxy isn't running, ADO features are simply
    unavailable and the editor stays fully usable offline.

> **Status: implemented.** The proxy is `ado-proxy.js` (zero-dependency Node). It reads
> the PAT from `.ado-pat` (or `.env` / `ADO_PAT` env var — all git-ignored), forwards
> `GET /health`, `GET /workitems?ids=`, `GET /workitem/:id`, `GET /children/:id`, and
> `POST /workitem`, and adds `Access-Control-Allow-Origin: *`. `BacklogEditor-ADO.html`
> auto-detects it on load via `initAdoBackend()` (`AdoClient.health()` with a 1.5s
> timeout); on success it switches the live `ado` backend from `AdoMock` to `AdoClient`
> and shows a connected status pill, otherwise it falls back to the seeded mock. See the
> README "Going live against real ADO" section for run instructions.

---

## 7. UX Sketch

```
Toolbar additions:
  🔗 Commit to ADO  |  ⟳ Check updates  |  🆕 Check for new  |  ⇩ Pull by ID

Push flow:
  1. Select items (checkbox per item in either view)
  2. Pick parent level + parent
  3. Preview what will be created → confirm
  4. ADO IDs written back to .md invisibly

Pull diff flow:
  1. Click "⟳ Check updates" (safe, existing items) or "🆕 Check for new" (discovery)
  2. Diff panel slides in from right, scoped to that check's category set
  3. Sections collapsed by default with counts; expand on click
  4. Accept or ignore per item
  5. Acknowledgements persist in the ado-meta block (no re-surfacing)

Pull-by-ID flow:
  1. Click "⇩ Pull by ID", enter an ADO work-item id → Look up
  2. Parent (→ bucket) + its children (→ items) shown; select which children to bring
  3. Confirm → bucket + selected items created and linked (already-linked ids skipped)
```

---

## 8. Open Questions

- ~~Should the JSON sidecar (ADO cache + mapping config) live next to the `.md` file, or be embedded as a comment block inside it?~~ — **Decided: embedded `<!-- ado-meta: … -->` comment block** (mirrors the existing `tag-meta` block; holds acked states + dismissed New ids).
- How to handle items that exist in ADO but span multiple backlog buckets?
- Should the snapshot export show ADO IDs / links for items that have been pushed?
- ~~Electron wrapper vs. local proxy vs. hosted web app~~ — **Decided: tiny local Node proxy** (see §6).
- Should the diff also surface ADO bugs (not just deliverables) that are filed against Rental Management?
