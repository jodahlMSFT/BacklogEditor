# ADO Integration Design

> **Status:** Planned — not yet implemented.
> Last updated: 29 June 2026

---

## 1. Vision

The backlog editor is the **thinking space** — lightweight, fast, portable. ADO is the **execution space** — structured, tracked, accountable. The integration bridges them without making the editor feel like a heavy ADO client.

Key principle: the editor stays fully usable offline/standalone. ADO is opt-in.

---

## 2. Core Workflows

### Push (editor → ADO)
- Select one or more items and push them as ADO Deliverables
- Used when you've decided to actually execute on something
- Not everything in the backlog should go to ADO — aspirational/strategic items stay local
- Items can be explicitly marked `[no-ado]` to exclude them from any push operation

### Pull diff (ADO → editor)
- On-demand check: "what has changed in ADO since I last synced?"
- Three categories:
  - 🟢 **Closed** — items that shipped; mark done or remove from backlog
  - 🟡 **Modified** — title, state, or assignment changed; review and optionally update backlog
  - 🆕 **New** — deliverables added to mapped scenarios that aren't in the backlog yet
- Changes are never auto-applied — you review and accept/ignore each one

---

## 3. Mapping Design

ADO has a hierarchy: **Scenario Group → Scenario → Deliverable**. The backlog has: **Bucket → Item**. These don't map 1:1.

### Proposed approach: bucket-level defaults + named milestone templates

- Each bucket can be configured with a default push target: project, area path, work item type, parent scenario
- Named **milestone templates** (e.g. "PP2 Phase III", "Public Preview") bundle project + area path + parent scenario + iteration — pick one when pushing a batch
- Per-item overrides possible for exceptions

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

- Use ADO Personal Access Token (PAT), stored in `localStorage` — never committed to the repo
- Org URL (`https://dev.azure.com/msdyneng`) and project (`FinOps`) configurable in settings
- **CORS issue:** browsers block ADO REST API calls from `file://` origins. Options:
  - Small local proxy (Node.js, a few lines)
  - Electron wrapper
  - Host the editor as a web app (Azure Static Web Apps)

---

## 7. UX Sketch

```
Toolbar additions:
  [🔗 ADO ▾]  →  dropdown: "Push selected…" | "Check ADO for changes" | "Configure…"

Push flow:
  1. Select items (checkbox per item in either view)
  2. Pick milestone template or configure target
  3. Preview what will be created → confirm
  4. ADO IDs written back to .md invisibly

Pull diff flow:
  1. Click "Check ADO for changes"
  2. Diff panel slides in from right
  3. Three sections: Closed / Modified / New
  4. Accept or ignore per item
  5. Last-synced timestamp updated
```

---

## 8. Open Questions

- Should the JSON sidecar (ADO cache + mapping config) live next to the `.md` file, or be embedded as a comment block inside it?
- How to handle items that exist in ADO but span multiple backlog buckets?
- Should the snapshot export show ADO IDs / links for items that have been pushed?
- Electron wrapper vs. local proxy vs. hosted web app — which deployment model fits best?
- Should the diff also surface ADO bugs (not just deliverables) that are filed against Rental Management?
