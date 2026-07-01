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

if (!PAT) {
  console.error('\n[ado-proxy] No PAT found. Create a git-ignored `.ado-pat` file');
  console.error('            (the whole file = your token) or set ADO_PAT in `.env`.\n');
  process.exit(1);
}

const AUTH = 'Basic ' + Buffer.from(':' + PAT).toString('base64');

// ── ADO REST helpers ──────────────────────────────────────────────────────────
function adoRequest(method, urlStr, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const headers = { Authorization: AUTH, Accept: 'application/json' };
    if (payload) {
      // Create/update work items use the JSON-Patch content type.
      headers['Content-Type'] = 'application/json-patch+json';
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
            try { msg = JSON.parse(text).message || text; } catch (e) {}
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

// ── HTTP server (the whitelist the page is allowed to call) ───────────────────
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      return sendJson(res, 200, { ok: true, org: ORG, project: PROJECT, orgUrl: ORG_URL });
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
  console.log('[ado-proxy] open BacklogEditor-ADO.html — it will auto-detect this proxy.');
});
