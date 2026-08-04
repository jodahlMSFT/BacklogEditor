#!/usr/bin/env node
/*
 * BacklogEditor — tiny local ADO proxy.
 *
 * Why this exists: browsers block Azure DevOps REST calls from `file://` pages
 * (CORS) and we never want the PAT to live in the page. This ~single-file proxy
 * holds the PAT server-side, forwards a small whitelist of ADO REST calls, and
 * adds the CORS headers the page needs. Zero npm dependencies — Node built-ins only.
 *
 * Run:   node ado-proxy.js
 * Stop:  Ctrl+C
 *
 * Secrets & config (never committed — see .gitignore):
 *   PAT is read from `.ado-pat` (whole file = the token) or `ADO_PAT` in `.env`
 *   or the ADO_PAT environment variable.
 *   Org / project / port come from `.env` or environment, with sensible defaults.
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { execSync, execFileSync } = require('child_process');

// ── Config & secret loading ───────────────────────────────────────────────────
function loadDotEnv() {
  const env = {};
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return env;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const dotenv = loadDotEnv();
const cfg = (k, d) => process.env[k] || dotenv[k] || d;

function loadPat() {
  const patFile = path.join(__dirname, '.ado-pat');
  if (fs.existsSync(patFile)) {
    const t = fs.readFileSync(patFile, 'utf8').trim();
    if (t) return t;
  }
  return cfg('ADO_PAT', '').trim();
}

const PAT = loadPat();
const ORG = cfg('ADO_ORG', 'msdyneng');
const PROJECT = cfg('ADO_PROJECT', 'FinOps');
// Org base URL — msdyneng uses the classic host; override with ADO_ORG_URL if needed.
const ORG_URL = (cfg('ADO_ORG_URL', `https://dev.azure.com/${ORG}`)).replace(/\/+$/, '');
const PORT = parseInt(cfg('ADO_PROXY_PORT', '7777'), 10);
const API_VERSION = '7.0';
// FinOps requires a Release value on create. We inherit it from the parent work
// item; ADO_RELEASE_FIELD / ADO_DEFAULT_RELEASE let you override the field ref or
// provide a fallback when a parent has none.
const RELEASE_FIELD = cfg('ADO_RELEASE_FIELD', 'Microsoft.Dynamics.AX7.Release');
const DEFAULT_RELEASE = cfg('ADO_DEFAULT_RELEASE', '');
// The Area path is inherited from the parent so new items land in the same area.
const AREA_FIELD = cfg('ADO_AREA_FIELD', 'System.AreaPath');
// Fields new work items inherit from their parent when not set explicitly.
const INHERIT_FIELDS = [RELEASE_FIELD, AREA_FIELD].filter(Boolean);

// AI (description authoring) config. We call GitHub Models with the user's `gh`
// token — no separate key to manage. Override the model or token via .env / env.
const AI_MODEL = cfg('AI_MODEL', 'openai/gpt-4o');
const AI_HOST = cfg('AI_HOST', 'models.github.ai');
const AI_PATH = cfg('AI_PATH', '/inference/chat/completions');

// Git sync config. The proxy owns the clone, so the browser never handles
// credentials — `git` uses whatever credential helper is already configured.
const GIT_DIR    = path.resolve(cfg('GIT_REPO_DIR', __dirname));
const GIT_FILE   = cfg('GIT_FILE', 'backlog.md');
const GIT_REMOTE = cfg('GIT_REMOTE', 'origin');
const GIT_SYNC   = cfg('GIT_SYNC', '1') !== '0';

// ── Auth ──────────────────────────────────────────────────────────────────────
// A PAT is used when one is configured, but PATs expire and that failure is both
// silent and recurring. When `az` is signed in we can mint a short-lived Entra
// token for the Azure DevOps resource instead, and refresh it automatically.
const ADO_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798';   // Azure DevOps

let _azToken = null;          // { token, expiresAt }
let _authMode = PAT ? 'pat' : 'entra';

function azToken() {
  const now = Date.now();
  if (_azToken && _azToken.expiresAt - now > 5 * 60 * 1000) return _azToken.token;
  try {
    const raw = execFileSync('az', ['account', 'get-access-token', '--resource', ADO_RESOURCE, '-o', 'json'], {
      encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'], shell: true,
    });
    const j = JSON.parse(raw);
    if (!j.accessToken) return null;
    // expires_on is epoch seconds; expiresOn is a local-time string.
    const expiresAt = j.expires_on ? j.expires_on * 1000 : Date.parse(j.expiresOn) || (now + 45 * 60 * 1000);
    _azToken = { token: j.accessToken, expiresAt };
    return _azToken.token;
  } catch (e) { return null; }
}

function authHeader(mode) {
  if ((mode || _authMode) === 'entra') {
    const t = azToken();
    return t ? 'Bearer ' + t : null;
  }
  return 'Basic ' + Buffer.from(':' + PAT).toString('base64');
}

function looksLikeAuthFailure(status, message) {
  if (status === 401 || status === 203) return true;
  return /access denied|has expired|unauthoriz/i.test(String(message || ''));
}

if (!PAT && !azToken()) {
  console.error('\n[ado-proxy] No ADO credentials. Either create a git-ignored `.ado-pat`');
  console.error('            file (the whole file = your token) / set ADO_PAT in `.env`,');
  console.error('            or run `az login` so a token can be minted automatically.');
  console.error('            Git sync endpoints do not need this — start with GIT_SYNC=1');
  console.error('            and ADO_ALLOW_NO_AUTH=1 to run without ADO access.\n');
  if (cfg('ADO_ALLOW_NO_AUTH', '') !== '1') process.exit(1);
}

// ── ADO REST helpers ──────────────────────────────────────────────────────────
function adoRequestOnce(method, urlStr, body, contentType, mode) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const auth = authHeader(mode);
    if (!auth) return reject({ status: 401, message: 'No usable ADO credentials (PAT missing/expired and `az login` unavailable)' });
    const headers = { Authorization: auth, Accept: 'application/json' };
    if (payload) {
      // Create/update work items use JSON-Patch; WIQL and other calls use plain JSON.
      headers['Content-Type'] = contentType || 'application/json-patch+json';
      headers['Content-Length'] = payload.length;
    }
    const req = https.request(
      { method, hostname: u.hostname, path: u.pathname + u.search, headers },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(text ? JSON.parse(text) : {});
          } else {
            let msg = text;
            try { msg = JSON.parse(text.replace(/^\uFEFF/, '')).message || text; } catch (e) {}
            reject({ status: res.statusCode, message: msg });
          }
        });
      }
    );
    req.on('error', e => reject({ status: 502, message: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

// Expired PAT? Fall back to an Entra token once, then stay on it.
async function adoRequest(method, urlStr, body, contentType) {
  try {
    return await adoRequestOnce(method, urlStr, body, contentType);
  } catch (e) {
    if (_authMode !== 'pat' || !looksLikeAuthFailure(e.status, e.message)) throw e;
    if (!azToken()) {
      throw { status: 401, message: (e.message || 'ADO auth failed')
        + ' — refresh `.ado-pat`, or run `az login` to switch to Entra tokens automatically.' };
    }
    console.warn('[ado-proxy] PAT rejected (' + (e.message || '').slice(0, 80) + '); switching to Entra token from `az`.');
    _authMode = 'entra';
    return adoRequestOnce(method, urlStr, body, contentType, 'entra');
  }
}

// Pull the parent work-item id out of an item's relations (Hierarchy-Reverse).
function parentIdFromRelations(relations) {
  if (!relations) return null;
  const parent = relations.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse');
  if (!parent) return null;
  const m = String(parent.url).match(/\/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

// Normalize an ADO work item down to the shape the page's AdoClient expects.
function normalize(item) {
  const f = item.fields || {};
  return {
    id: item.id,
    type: f['System.WorkItemType'] || null,
    title: f['System.Title'] || '',
    state: f['System.State'] || null,
    parentId: parentIdFromRelations(item.relations),
    description: f['System.Description'] || null,
    acceptanceCriteria: f['Microsoft.VSTS.Common.AcceptanceCriteria'] || null,
  };
}

async function getWorkItems(ids) {
  if (!ids.length) return [];
  const items = [];
  // ADO caps a batch GET at 200 ids.
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const url = `${ORG_URL}/${encodeURIComponent(PROJECT)}/_apis/wit/workitems` +
      `?ids=${chunk.join(',')}&$expand=relations&api-version=${API_VERSION}`;
    const res = await adoRequest('GET', url);
    (res.value || []).forEach(w => items.push(normalize(w)));
  }
  return items;
}

async function getChildren(id) {
  const url = `${ORG_URL}/${encodeURIComponent(PROJECT)}/_apis/wit/workitems/${id}` +
    `?$expand=relations&api-version=${API_VERSION}`;
  const parent = await adoRequest('GET', url);
  const childIds = (parent.relations || [])
    .filter(r => r.rel === 'System.LinkTypes.Hierarchy-Forward')
    .map(r => { const m = String(r.url).match(/\/(\d+)$/); return m ? parseInt(m[1], 10) : null; })
    .filter(Boolean);
  return getChildren_fetch(childIds);
}
const getChildren_fetch = ids => getWorkItems(ids);

// Search work items by title (and optional type) via WIQL, newest-changed first.
// When `opts.scope` (a Scenario Group / Scenario id) is given, the search is limited to
// that item's descendant tree - which is what keeps it fast (no whole-project scan).
async function searchWorkItems(query, opts) {
  opts = opts || {};
  const q = String(query || '').trim();
  if (!q) return [];
  const wiqlUrl = `${ORG_URL}/${encodeURIComponent(PROJECT)}/_apis/wit/wiql?api-version=${API_VERSION}`;
  const top = opts.top || 30;
  const scope = opts.scope ? parseInt(opts.scope, 10) : null;
  const esc = s => String(s).replace(/'/g, "''");

  // A pasted ID: fetch it directly (instant) instead of a slow WIQL title scan.
  if (/^\d+$/.test(q)) {
    const items = await getWorkItems([parseInt(q, 10)]);
    return items.filter(w => w && (w.state || '') !== 'Removed');
  }

  let ids;
  if (scope) {
    // Recursive tree query under the chosen parent, filtered to matching titles.
    const clauses = [
      `[Target].[System.State] <> 'Removed'`,
      `[Target].[System.Title] CONTAINS '${esc(q)}'`,
    ];
    if (opts.type) clauses.push(`[Target].[System.WorkItemType] = '${esc(opts.type)}'`);
    const wiql = `SELECT [System.Id] FROM WorkItemLinks WHERE ` +
      `([Source].[System.Id] = ${scope}) AND ` +
      `([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') AND ` +
      `(${clauses.join(' AND ')}) MODE (Recursive)`;
    const res = await adoRequest('POST', wiqlUrl, { query: wiql }, 'application/json');
    ids = [...new Set((res.workItemRelations || [])
      .map(r => r.target && r.target.id).filter(Boolean))]
      .filter(id => id !== scope);
  } else {
    const clauses = [
      `[System.TeamProject] = @project`,
      `[System.State] <> 'Removed'`,
      `[System.Title] CONTAINS '${esc(q)}'`,
    ];
    if (opts.type) clauses.push(`[System.WorkItemType] = '${esc(opts.type)}'`);
    const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${clauses.join(' AND ')} ` +
      `ORDER BY [System.ChangedDate] DESC`;
    const res = await adoRequest('POST', wiqlUrl, { query: wiql }, 'application/json');
    ids = (res.workItems || []).map(w => w.id);
  }

  ids = ids.slice(0, top);
  if (!ids.length) return [];
  const items = await getWorkItems(ids);
  const byId = new Map(items.map(w => [w.id, w]));
  // Recursive tree queries can return non-matching ancestor rows to preserve structure;
  // post-filter to titles that actually match so the picker only shows real hits.
  const needle = q.toLowerCase();
  return ids.map(id => byId.get(id))
    .filter(w => w && (w.state || '') !== 'Removed' && (w.title || '').toLowerCase().includes(needle));
}

async function createWorkItem(type, title, parentId, fields) {
  fields = Object.assign({}, fields);
  const ops = [{ op: 'add', path: '/fields/System.Title', value: title }];
  // Inherit contextual fields from the parent (Release — required by FinOps — and
  // Area path) unless the caller set them explicitly. One GET fetches them all.
  const needed = INHERIT_FIELDS.filter(f => fields[f] == null);
  if (parentId && needed.length) {
    try {
      const p = await adoRequest('GET',
        `${ORG_URL}/${encodeURIComponent(PROJECT)}/_apis/wit/workitems/${parentId}` +
        `?fields=${needed.map(encodeURIComponent).join(',')}&api-version=${API_VERSION}`);
      const pf = (p && p.fields) || {};
      needed.forEach(f => { if (pf[f] != null && pf[f] !== '') fields[f] = pf[f]; });
    } catch (e) { /* fall back to defaults below */ }
  }
  // Release fallback if the parent didn't supply one.
  if (RELEASE_FIELD && fields[RELEASE_FIELD] == null && DEFAULT_RELEASE) {
    fields[RELEASE_FIELD] = DEFAULT_RELEASE;
  }
  for (const [ref, val] of Object.entries(fields)) {
    if (val != null) ops.push({ op: 'add', path: `/fields/${ref}`, value: val });
  }
  if (parentId) {
    ops.push({
      op: 'add', path: '/relations/-',
      value: { rel: 'System.LinkTypes.Hierarchy-Reverse', url: `${ORG_URL}/_apis/wit/workItems/${parentId}` },
    });
  }
  const url = `${ORG_URL}/${encodeURIComponent(PROJECT)}/_apis/wit/workitems/$${encodeURIComponent(type)}` +
    `?api-version=${API_VERSION}`;
  const created = await adoRequest('POST', url, ops);
  return normalize(created);
}

// Update fields on an existing work item (e.g. System.Description). Only the fields
// passed in are touched — everything else is left as-is. No create, no delete.
async function updateWorkItem(id, fields) {
  const ops = Object.entries(fields || {})
    .filter(([, v]) => v != null)
    .map(([ref, value]) => ({ op: 'add', path: `/fields/${ref}`, value }));
  if (!ops.length) { const items = await getWorkItems([id]); return items[0] || null; }
  const url = `${ORG_URL}/${encodeURIComponent(PROJECT)}/_apis/wit/workitems/${id}` +
    `?api-version=${API_VERSION}`;
  const updated = await adoRequest('PATCH', url, ops);
  return normalize(updated);
}

// ── AI description authoring (GitHub Models) ──────────────────────────────────
let _ghToken = null;
function ghToken() {
  if (_ghToken != null) return _ghToken;
  const fromEnv = cfg('GITHUB_TOKEN', '') || cfg('GH_TOKEN', '');
  if (fromEnv) return (_ghToken = fromEnv.trim());
  try { _ghToken = execSync('gh auth token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch (e) { _ghToken = ''; }
  return _ghToken;
}

// Call a chat model and return the assistant message text.
function aiChat(messages) {
  return new Promise((resolve, reject) => {
    const tok = ghToken();
    if (!tok) return reject({ status: 500, message: 'No GitHub token for AI. Run `gh auth login` or set GITHUB_TOKEN.' });
    const payload = Buffer.from(JSON.stringify({ model: AI_MODEL, messages, temperature: 0.3 }));
    const headers = {
      Authorization: 'Bearer ' + tok, Accept: 'application/json',
      'Content-Type': 'application/json', 'Content-Length': payload.length,
    };
    const req = https.request({ method: 'POST', hostname: AI_HOST, path: AI_PATH, headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(text).choices[0].message.content); }
          catch (e) { reject({ status: 502, message: 'Unexpected AI response shape' }); }
        } else {
          let msg = text;
          try { const j = JSON.parse(text); msg = (j.error && j.error.message) || j.message || text; } catch (e) {}
          reject({ status: res.statusCode, message: 'AI error: ' + msg });
        }
      });
    });
    req.on('error', e => reject({ status: 502, message: e.message }));
    req.write(payload);
    req.end();
  });
}

// Strip a stray ```html ... ``` fence if the model wraps its output.
function stripFences(s) {
  return String(s || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
}

const DESCRIBE_SYSTEM = [
  'You are a product owner writing an Azure DevOps work-item description whose only job is CLARITY.',
  'Write for an engineer or PM who has never seen this item. Be concrete and concise; no filler, no ceremony.',
  '',
  'Structure the description with these sections, in this order (omit a section only if there is genuinely nothing to say):',
  '1. Problem  - the gap or pain today, and why it matters.',
  '2. Goal     - the clear outcome this delivers.',
  '3. In scope - a bulleted list of what is covered.',
  '4. Known issues - bulleted current symptoms/blockers, ONLY if the context implies them.',
  '5. Related  - bulleted references to related items, ONLY if the context provides them.',
  '6. Acceptance criteria - a bulleted list of specific, testable conditions.',
  '',
  'Output rules:',
  '- Output ONLY an HTML fragment (no <html>/<body>, no markdown, no code fences).',
  '- Use only these tags: <p>, <b>, <i>, <br>, <ul>, <li>.',
  '- Each section header is <p><b>Header</b></p> (for lists) or <p><b>Header</b><br>text</p> (for prose).',
  '- Never use the wide em-dash (\u2014); use a normal hyphen (-) instead.',
  '- Do not invent facts not supported by the provided context; where detail is missing, keep the point general rather than fabricating specifics.',
].join('\n');

function buildDescribeUser(ado, context) {
  const c = context || {};
  const lines = [];
  lines.push('Write the description for this backlog item.');
  lines.push('');
  if (ado && ado.id) {
    lines.push('ADO work item: #' + ado.id + ' [' + (ado.type || '?') + '] "' + (ado.title || '') + '" (state: ' + (ado.state || '?') + ')');
    if (ado.description) lines.push('Existing description (may be empty or rough): ' + String(ado.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800));
  }
  lines.push('Kind: ' + (c.kind || 'item'));
  if (c.title) lines.push('Title / summary: ' + c.title);
  if (c.bucketTitle && c.bucketTitle !== c.title) lines.push('Parent theme (bucket): ' + c.bucketTitle);
  if (c.priority) lines.push('Priority: ' + c.priority);
  if (c.text && c.text !== c.title) lines.push('Backlog note: ' + c.text);
  if (Array.isArray(c.items) && c.items.length) {
    lines.push('Child items (these define the scope):');
    c.items.forEach(i => lines.push('  - ' + (typeof i === 'string' ? i : (i.text || ''))));
  }
  if (Array.isArray(c.siblings) && c.siblings.length) {
    lines.push('Sibling items in the same bucket (for context only):');
    c.siblings.forEach(s => lines.push('  - ' + s));
  }
  if (c.guidance && String(c.guidance).trim()) {
    lines.push('');
    lines.push('Author guidance - follow these instructions strictly, they override the defaults above:');
    lines.push(String(c.guidance).trim());
  }
  return lines.join('\n');
}

// Generate a description (HTML fragment) for a work item / backlog entry.
async function describeWorkItem(adoId, context) {
  let ado = {};
  if (adoId) {
    try { const items = await getWorkItems([adoId]); if (items[0]) ado = items[0]; } catch (e) { /* draft from context alone */ }
  }
  const raw = await aiChat([
    { role: 'system', content: DESCRIBE_SYSTEM },
    { role: 'user', content: buildDescribeUser(ado, context) },
  ]);
  return { html: stripFences(raw), model: AI_MODEL };
}

// ── HTTP server (the whitelist the page is allowed to call) ───────────────────
// ── Git sync (backlog.md ↔ GitHub) ────────────────────────────────────────────
// The proxy owns the clone, so the browser never sees credentials. Every command
// is scoped to GIT_FILE, so saving the backlog can never sweep unrelated
// working-tree changes into a commit.

function git(args, timeout) {
  return execFileSync('git', args, {
    cwd: GIT_DIR, encoding: 'utf8', timeout: timeout || 20000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).replace(/\s+$/, '');
}

function gitTry(args, timeout) {
  try { return { ok: true, out: git(args, timeout) }; }
  catch (e) {
    const out = [e.stderr, e.stdout, e.message].filter(Boolean).join('\n').replace(/\s+$/, '');
    return { ok: false, out };
  }
}

function parseGitHubRemote(url) {
  const m = String(url).match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?\/?$/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function gitFilePath() { return path.join(GIT_DIR, GIT_FILE); }
function gitReadFile() {
  const p = gitFilePath();
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function gitState() {
  if (!GIT_SYNC) return { enabled: false, reason: 'Git sync is off (GIT_SYNC=0)' };
  const top = gitTry(['rev-parse', '--show-toplevel']);
  if (!top.ok) return { enabled: false, reason: 'Not a git repository: ' + GIT_DIR };
  const branch = gitTry(['rev-parse', '--abbrev-ref', 'HEAD']).out;
  const remoteUrl = gitTry(['remote', 'get-url', GIT_REMOTE]).out;
  const st = {
    enabled: true, repoRoot: top.out, file: GIT_FILE, branch,
    remote: GIT_REMOTE, remoteUrl, github: parseGitHubRemote(remoteUrl),
    head: gitTry(['rev-parse', 'HEAD']).out.slice(0, 7),
    exists: fs.existsSync(gitFilePath()),
  };
  if (!remoteUrl) { st.enabled = false; st.reason = `No '${GIT_REMOTE}' remote configured`; return st; }
  const ab = gitTry(['rev-list', '--left-right', '--count', `${GIT_REMOTE}/${branch}...HEAD`]);
  if (ab.ok) {
    const [behind, ahead] = ab.out.split(/\s+/).map(n => parseInt(n, 10) || 0);
    st.behind = behind; st.ahead = ahead;
  }
  const dirty = gitTry(['status', '--porcelain', '--', GIT_FILE]);
  st.dirty = dirty.ok && !!dirty.out;
  return st;
}

function requireGit() {
  const st = gitState();
  if (!st.enabled) throw { status: 400, message: st.reason || 'Git sync unavailable' };
  return st;
}

function gitPull() {
  const st = requireGit();
  const before = gitTry(['rev-parse', 'HEAD']).out;
  const fetched = gitTry(['fetch', GIT_REMOTE], 60000);
  if (!fetched.ok) throw { status: 502, message: 'git fetch failed:\n' + fetched.out };

  let strategy = 'fast-forward';
  const ff = gitTry(['merge', '--ff-only', `${GIT_REMOTE}/${st.branch}`], 30000);
  if (!ff.ok) {
    // Local commits exist that the remote doesn't have — replay them on top.
    const rb = gitTry(['pull', '--rebase', '--autostash', GIT_REMOTE, st.branch], 60000);
    strategy = 'rebase';
    if (!rb.ok) {
      gitTry(['rebase', '--abort']);
      throw {
        status: 409,
        message: 'Local and remote have diverged and could not be reconciled automatically. '
               + 'Resolve it in the repo, then sync again.\n\n' + rb.out,
      };
    }
  }
  const after = gitTry(['rev-parse', 'HEAD']).out;
  return {
    ok: true, changed: before !== after, strategy,
    before: before.slice(0, 7), after: after.slice(0, 7),
    content: gitReadFile(), state: gitState(),
  };
}

function gitPush(content, message) {
  const st = requireGit();
  if (typeof content === 'string') fs.writeFileSync(gitFilePath(), content, 'utf8');

  let committed = false;
  const pending = gitTry(['status', '--porcelain', '--', GIT_FILE]);
  if (pending.ok && pending.out) {
    const add = gitTry(['add', '--', GIT_FILE]);
    if (!add.ok) throw { status: 500, message: 'git add failed:\n' + add.out };
    const msg = (message && String(message).trim()) || `Update ${GIT_FILE} from Backlog Editor`;
    const commit = gitTry(['commit', '-m', msg, '--', GIT_FILE]);
    if (!commit.ok) throw { status: 500, message: 'git commit failed:\n' + commit.out };
    committed = true;
  }

  gitTry(['fetch', GIT_REMOTE], 60000);
  const aheadCount = () => {
    const r = gitTry(['rev-list', '--count', `${GIT_REMOTE}/${st.branch}..HEAD`]);
    return r.ok ? (parseInt(r.out, 10) || 0) : 0;
  };
  if (!committed && aheadCount() === 0) {
    return { ok: true, noop: true, committed: false, content: gitReadFile(), state: gitState() };
  }

  let rebased = false;
  let push = gitTry(['push', GIT_REMOTE, `HEAD:${st.branch}`], 60000);
  if (!push.ok) {
    // Someone else pushed first — replay on top of them and retry once.
    const rb = gitTry(['pull', '--rebase', '--autostash', GIT_REMOTE, st.branch], 60000);
    if (!rb.ok) {
      gitTry(['rebase', '--abort']);
      throw {
        status: 409,
        message: 'Push was rejected and the changes could not be replayed on top of the '
               + 'remote automatically. Resolve the conflict in the repo, then sync again.\n\n' + rb.out,
      };
    }
    rebased = true;
    push = gitTry(['push', GIT_REMOTE, `HEAD:${st.branch}`], 60000);
    if (!push.ok) throw { status: 502, message: 'git push failed:\n' + push.out };
  }
  return {
    ok: true, committed, rebased, noop: false,
    sha: gitTry(['rev-parse', 'HEAD']).out.slice(0, 7),
    content: gitReadFile(), state: gitState(),
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const t = Buffer.concat(chunks).toString('utf8');
      try { resolve(t ? JSON.parse(t) : {}); } catch (e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { sendJson(res, 204, {}); return; }
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const parts = u.pathname.split('/').filter(Boolean);

  try {
    // GET /health
    if (req.method === 'GET' && parts[0] === 'health') {
      let gitInfo = null;
      try { gitInfo = gitState(); } catch (e) { gitInfo = { enabled: false, reason: String(e.message || e) }; }
      return sendJson(res, 200, { ok: true, org: ORG, project: PROJECT, orgUrl: ORG_URL, auth: _authMode, git: gitInfo });
    }
    // GET /git/status
    if (req.method === 'GET' && parts[0] === 'git' && parts[1] === 'status') {
      return sendJson(res, 200, gitState());
    }
    // GET /git/file  -> current working-tree content of the backlog file
    if (req.method === 'GET' && parts[0] === 'git' && parts[1] === 'file') {
      requireGit();
      return sendJson(res, 200, { content: gitReadFile(), state: gitState() });
    }
    // POST /git/pull -> fetch + fast-forward (or rebase), returns file content
    if (req.method === 'POST' && parts[0] === 'git' && parts[1] === 'pull') {
      return sendJson(res, 200, gitPull());
    }
    // POST /git/push { content, message } -> write + commit + push
    if (req.method === 'POST' && parts[0] === 'git' && parts[1] === 'push') {
      const b = await readBody(req);
      if (typeof b.content !== 'string') return sendJson(res, 400, { message: 'content string is required' });
      return sendJson(res, 200, gitPush(b.content, b.message));
    }
    // GET /workitems?ids=1,2,3
    if (req.method === 'GET' && parts[0] === 'workitems') {
      const ids = (u.searchParams.get('ids') || '').split(',').map(s => parseInt(s, 10)).filter(Boolean);
      return sendJson(res, 200, await getWorkItems(ids));
    }
    // GET /workitem/:id
    if (req.method === 'GET' && parts[0] === 'workitem' && parts[1]) {
      const items = await getWorkItems([parseInt(parts[1], 10)]);
      return sendJson(res, 200, items[0] || null);
    }
    // GET /children/:id
    if (req.method === 'GET' && parts[0] === 'children' && parts[1]) {
      return sendJson(res, 200, await getChildren(parseInt(parts[1], 10)));
    }
    // GET /search?q=text&type=Deliverable&scope=1052319&top=30
    if (req.method === 'GET' && parts[0] === 'search') {
      const q = u.searchParams.get('q') || '';
      const type = u.searchParams.get('type') || null;
      const scope = u.searchParams.get('scope') || null;
      const top = parseInt(u.searchParams.get('top') || '30', 10);
      return sendJson(res, 200, await searchWorkItems(q, { type, scope, top }));
    }
    // PATCH /workitem/:id  { fields: { "System.Description": "<html>" } }
    if ((req.method === 'PATCH' || req.method === 'POST') && parts[0] === 'workitem' && parts[1]) {
      const b = await readBody(req);
      if (!b.fields || typeof b.fields !== 'object') return sendJson(res, 400, { message: 'fields object is required' });
      return sendJson(res, 200, await updateWorkItem(parseInt(parts[1], 10), b.fields));
    }
    // POST /describe  { adoId?, context }  -> { html, model }
    if (req.method === 'POST' && parts[0] === 'describe') {
      const b = await readBody(req);
      const adoId = b.adoId ? parseInt(b.adoId, 10) : null;
      return sendJson(res, 200, await describeWorkItem(adoId, b.context || {}));
    }
    // POST /workitem  { type, title, parentId }
    if (req.method === 'POST' && parts[0] === 'workitem') {
      const b = await readBody(req);
      if (!b.type || !b.title) return sendJson(res, 400, { message: 'type and title are required' });
      return sendJson(res, 200, await createWorkItem(b.type, b.title, b.parentId || null, b.fields || null));
    }
    sendJson(res, 404, { message: 'not found' });
  } catch (e) {
    sendJson(res, e.status || 500, { message: e.message || String(e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[ado-proxy] listening on http://localhost:${PORT}`);
  console.log(`[ado-proxy] org=${ORG} project=${PROJECT} orgUrl=${ORG_URL}`);
  console.log(`[ado-proxy] auth=${_authMode}${_authMode === 'entra' ? ' (Entra token via az — no PAT expiry)' : ' (PAT; falls back to Entra if it expires)'}`);
  console.log('[ado-proxy] open BacklogEditor-ADO.html — it will auto-detect this proxy.');
});
