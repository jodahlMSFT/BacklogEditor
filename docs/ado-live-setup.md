# Going live: connecting BacklogEditor to real Azure DevOps

`BacklogEditor-ADO.html` talks to ADO through a tiny local proxy (`ado-proxy.js`)
that holds your Personal Access Token and forwards a small whitelist of REST calls.
The token **never** lives in the HTML page, and nothing is committed to the repo.

When the proxy is running the page uses the **real** ADO backend; when it isn't, the
page silently falls back to an in-memory **mock** so you can still explore every flow
offline. The toolbar status pill tells you which mode you're in.

---

## 1. Create a Personal Access Token (PAT)

1. In Azure DevOps, open **User settings ▸ Personal access tokens** (top-right avatar).
   Direct URL for this org: `https://dev.azure.com/msdyneng/_usersSettings/tokens`.
2. **+ New Token**.
3. Set:
   - **Organization**: `msdyneng` (or your org).
   - **Expiration**: your choice.
   - **Scopes**: **Work Items → Read & write** (Custom defined). That's all you need.
4. **Create**, then **copy the token** — ADO shows it only once.

## 2. Save the PAT to a git-ignored file

Save it next to the HTML, in the repo root. Either file works and both are git-ignored:

```bash
# Option A — dedicated file (whole file = the token)
echo "YOUR_PAT_HERE" > .ado-pat

# Option B — .env (also lets you set org/project/port in one place)
# ADO_PAT=YOUR_PAT_HERE
```

> Verify it's ignored: `git check-ignore .ado-pat` should print `.ado-pat`.
> Never paste the PAT into the HTML, a commit, or a chat.

## 3. (Optional) Configure org / project / port

Defaults are org `msdyneng`, project `FinOps`, port `7777`. Override via environment
variables or `.env`:

| Variable         | Default                          | Meaning                         |
| ---------------- | -------------------------------- | ------------------------------- |
| `ADO_ORG`        | `msdyneng`                       | Organization name               |
| `ADO_PROJECT`    | `FinOps`                         | Project name                    |
| `ADO_ORG_URL`    | `https://dev.azure.com/msdyneng` | Org base URL (REST calls use this) |
| `ADO_PROXY_PORT` | `7777`                           | Local port the proxy listens on |
| `ADO_PAT`        | —                                | PAT (alternative to `.ado-pat`) |

Example `.env`:

```
ADO_PAT=YOUR_PAT_HERE
ADO_ORG=msdyneng
ADO_PROJECT=FinOps
ADO_ORG_URL=https://dev.azure.com/msdyneng
ADO_PROXY_PORT=7777
```

## 4. Start the proxy

```bash
node ado-proxy.js
```

- No npm install needed — Node built-ins only.
- On success it prints the org/project/port it's serving.
- If no PAT is found it exits with a message telling you to create `.ado-pat`.
- Stop it with **Ctrl+C**.

Quick sanity check in another terminal:

```bash
curl http://localhost:7777/health
# {"ok":true,"org":"msdyneng","project":"FinOps","orgUrl":"https://dev.azure.com/msdyneng"}
```

## 5. Open the editor

Open **`BacklogEditor-ADO.html`** in your browser. Watch the toolbar status pill:

- **● ADO: msdyneng/FinOps** (green) — connected to the proxy, using real ADO.
- **● ADO: demo (mock)** (grey) — proxy not reachable; using the offline mock.

The page auto-detects on load (`initAdoBackend()` → `AdoClient.health()`, 1.5s timeout).
If you start the proxy after opening the page, just refresh.

---

## What the proxy exposes

The page only ever calls these endpoints (all read-only except the last):

| Method & path            | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `GET /health`            | Liveness + which org/project is configured          |
| `GET /workitems?ids=`    | Batch fetch work items (id, type, title, state, parent) |
| `GET /workitem/:id`      | Fetch one work item                                 |
| `GET /children/:id`      | Direct child work items of a parent                 |
| `POST /workitem`         | Create a work item (`{type, title, parentId}`)      |

Responses are normalized to `{ id, type, title, state, parentId }`. CORS is open
(`Access-Control-Allow-Origin: *`) so the `file://` page can call `localhost`.

## Work-item type names (important for creating)

Commits/creates map the backlog shape onto this ladder:

```
Scenario Group  →  Scenario  →  Deliverable  →  Task
   (parent)         (bucket)      (item)        (sub)
```

These are ADO **work-item type names**. Reads don't care about type names, but if your
project's process uses different names, a **create** will return HTTP 400. Fix by editing
`ADO_LADDER` near the top of `BacklogEditor-ADO.html` to match your project's types.

## Required / inherited fields on create (Release, Area)

Some processes make fields **required**, so a bare create fails with e.g.
`TF401320: Rule Error for field 'Release'`. In FinOps the required field is **Release**
(`Microsoft.Dynamics.AX7.Release`, values like `Rainier`).

The proxy handles this automatically: on create it **inherits from the parent** both the
**Release** and the **Area path** (`System.AreaPath`, e.g. `FinOps\SCM\Rental Management`),
so new items land in the same area/release as the parent they're created under. You can
override the field refs or provide a release fallback via env:

| Variable              | Default                          | Meaning                                   |
| --------------------- | -------------------------------- | ----------------------------------------- |
| `ADO_RELEASE_FIELD`   | `Microsoft.Dynamics.AX7.Release` | Reference name of the required release field |
| `ADO_AREA_FIELD`      | `System.AreaPath`                | Reference name of the area-path field     |
| `ADO_DEFAULT_RELEASE` | — (empty)                        | Value to use if a parent has no release   |

The `POST /workitem` body also accepts an optional `fields` map (`{ "Ref.Name": "value" }`)
to set additional fields or override an inherited one.

> **Delete needs a separate permission.** A standard **Work Items (Read & write)** PAT can
> create/read/update but **cannot delete** work items (`VS403145: Insufficient permissions`).
> Delete test items from the ADO web UI.

## Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| Pill stays **demo (mock)** | Proxy not running, or on a different port than `adoProxyUrl`/`7777`. Start it, then refresh. |
| Proxy exits on start | No PAT found — create `.ado-pat` or set `ADO_PAT`. |
| `401`/`203` from a read | PAT expired or missing **Work Items (Read)** scope. |
| `400` on **Commit to ADO** (`TF401320` rule error) | A required field isn't set. For Release the proxy inherits it from the parent; for other fields set `ADO_DEFAULT_RELEASE` or pass `fields` in the create body. |
| `400` on **Commit to ADO** (unknown type) | Work-item type names don't match your process — adjust `ADO_LADDER`. |
| `403` on create | PAT lacks **Work Items (Read & write)** scope. |
| `VS403145` on delete | Expected — delete needs a separate permission; remove items via the ADO UI. |
| Duplicate bucket/item appears in ADO | Commit now **adopts** an existing same-title child under the parent, so re-committing after a partial failure or a page refresh won't create duplicates. Delete any pre-existing dupes in the ADO UI. |

## Security notes

- The PAT lives only in `.ado-pat` / `.env`, both git-ignored. It is never sent to the
  browser page — the page talks to `localhost`, and the proxy adds the auth header.
- The proxy binds locally and forwards only the whitelisted endpoints above.
- Treat the PAT like a password; rotate it if it may have leaked.
