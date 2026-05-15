#!/usr/bin/env node
/**
 * Export commit activity for dashboard heatmap / recent feed from a local
 * radicle-httpd (e.g. on M1 where you develop). Copy the JSON to your M3 host
 * and set RADICLE_ACTIVITY_SNAPSHOT_PATH in dashboard/.env.local there.
 *
 * Usage (from repo root):
 *   node scripts/export-activity-snapshot.mjs
 *   node scripts/export-activity-snapshot.mjs path/to/.env.local path/to/out.json
 *
 * Reads RADICLE_HTTP_BASE and a repo list (see below), plus optional
 * RADICLE_ACTIVITY_HISTORY_DAYS / RADICLE_ACTIVITY_MAX_COMMIT_PAGES /
 * RADICLE_ACTIVITY_ANCESTRY_MAX_COMMITS from the .env.local file (first arg
 * defaults to ./dashboard/.env.local). Output defaults to
 * ./dashboard/data/activity-snapshot.json
 *
 * **Which repos are exported**
 * - If `RADICLE_ACTIVITY_EXPORT_REPO_IDS` is set, that list is used (export-only).
 * - Otherwise `RADICLE_REPO_IDS` is used (same as `/profile`).
 * - Either value may be a single token `all` or `*` → every RID from
 *   `GET /api/v1/repos?show=all` on the node (add new projects without editing
 *   the comma-separated list each time). `/profile` still uses only
 *   `RADICLE_REPO_IDS`; this does not change the site.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const envPath = process.argv[2] ?? join(repoRoot, "dashboard", ".env.local");
const outPath =
  process.argv[3] ?? join(repoRoot, "dashboard", "data", "activity-snapshot.json");

function parseEnvLocal(text) {
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function clampEnvInt(raw, fallback, min, max) {
  const n = raw ? Number.parseInt(String(raw).trim(), 10) : fallback;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.max(n, min), max);
}

function clampEnvIntAllowZero(raw, fallback, max) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

function unwrapCommitterTimeValue(t) {
  if (t === null || t === undefined) return t;
  if (typeof t !== "object" || Array.isArray(t)) return t;
  if (
    ("email" in t || "name" in t) &&
    "time" in t &&
    t.time !== undefined &&
    t.time !== null
  ) {
    return t.time;
  }
  if (
    "seconds" in t &&
    (typeof t.seconds === "number" || typeof t.seconds === "string")
  ) {
    return t.seconds;
  }
  if ("$date" in t && t.$date !== undefined) return t.$date;
  if ("unix" in t && (typeof t.unix === "number" || typeof t.unix === "string")) {
    return t.unix;
  }
  if (
    "timestamp" in t &&
    (typeof t.timestamp === "number" || typeof t.timestamp === "string")
  ) {
    return t.timestamp;
  }
  if ("sec" in t && (typeof t.sec === "number" || typeof t.sec === "string")) {
    return t.sec;
  }
  if ("secs" in t && (typeof t.secs === "number" || typeof t.secs === "string")) {
    return t.secs;
  }
  if ("time" in t && (typeof t.time === "number" || typeof t.time === "string")) {
    return t.time;
  }
  return t;
}

function parseStringCommitterTime(raw) {
  let s = raw.trim();
  if (s === "") return null;
  if (s.startsWith("+") && /^\+[\d_,.\s]/.test(s)) s = s.slice(1).trim();

  const looksIsoOrRfc =
    s.includes("T") ||
    /^\d{4}-\d{2}-\d{2}/.test(s) ||
    /^[A-Za-z]{3},\s\d{1,2}\s[A-Za-z]{3}/.test(s);

  if (looksIsoOrRfc) {
    const ms = Date.parse(s);
    if (Number.isFinite(ms) && ms > 0) return Math.floor(ms / 1000);
  }

  const compact = s.replace(/[,_\s]/g, "");
  const epochNumeric = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(compact);
  if (epochNumeric) {
    const p = Number(compact);
    if (!Number.isFinite(p) || p <= 0) return null;
    return p >= 1e12 ? Math.floor(p / 1000) : Math.floor(p);
  }

  const ms = Date.parse(s);
  if (Number.isFinite(ms) && ms > 0) return Math.floor(ms / 1000);
  return null;
}

function normalizeCommitterTimeSeconds(t) {
  if (t instanceof Date) {
    const ms = t.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return Math.floor(ms / 1000);
  }
  let v = t;
  for (let i = 0; i < 8; i++) {
    const next = unwrapCommitterTimeValue(v);
    if (next === v) break;
    v = next;
  }
  if (typeof v === "bigint") {
    const bn = Number(v);
    if (!Number.isFinite(bn) || bn <= 0) return null;
    v = bn;
  }
  let n;
  if (typeof v === "number" && Number.isFinite(v)) {
    n = v;
  } else if (typeof v === "string") {
    const parsed = parseStringCommitterTime(v);
    if (parsed === null) return null;
    return parsed;
  } else {
    return null;
  }
  if (n <= 0) return null;
  return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

function rawCommitterTime(c) {
  const ct = c.committer;
  if (ct && typeof ct === "object") {
    const v =
      ct.time ??
      ct.timestamp ??
      ct.date ??
      ct.unix ??
      ct.seconds ??
      ct.secs;
    if (v !== undefined && v !== null) return v;
  }
  const au = c.author;
  if (au && typeof au === "object") {
    const v = au.time ?? au.timestamp ?? au.date;
    if (v !== undefined && v !== null) return v;
  }
  for (const key of [
    "committedAt",
    "authoredAt",
    "committed",
    "authored",
    "timestamp",
  ]) {
    const v = c[key];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function commitWithNormalizedTime(c) {
  const raw = rawCommitterTime(c);
  const ts = normalizeCommitterTimeSeconds(raw);
  if (ts === null) return null;
  const baseCommitter =
    c.committer ??
    (c.author
      ? { name: c.author.name, email: c.author.email, time: ts }
      : { name: "", email: "", time: ts });
  const id =
    (typeof c.id === "string" && c.id.trim()) ||
    (typeof c.oid === "string" && String(c.oid).trim()) ||
    (typeof c.sha === "string" && String(c.sha).trim()) ||
    "";
  if (!id) return null;
  return {
    ...c,
    id,
    parents: Array.isArray(c.parents) ? c.parents : [],
    committer: { ...baseCommitter, time: ts },
  };
}

async function fetchCommits(base, rid, sinceUnix, maxPages) {
  const all = [];
  const seen = new Set();
  for (let page = 1; page <= maxPages; page++) {
    const url = `${base}/api/v1/repos/${encodeURIComponent(rid)}/commits?page=${page}&perPage=5`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const c of batch) {
      const nc = commitWithNormalizedTime(c);
      if (!nc || nc.committer.time < sinceUnix) continue;
      const key = `${rid}:${nc.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(nc);
    }
    if (batch.length < 5) break;
  }
  return all;
}

async function fetchRepoMeta(base, rid) {
  const res = await fetch(`${base}/api/v1/repos/${encodeURIComponent(rid)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

/** RIDs replicated on this node (`show=all`, same as /node “All”). */
async function fetchAllRepoRids(base) {
  const res = await fetch(`${base}/api/v1/repos?show=all`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const repos = await res.json();
  if (!Array.isArray(repos)) return [];
  return repos
    .map((r) => (r && typeof r === "object" ? r.rid : null))
    .filter((id) => typeof id === "string" && id.length > 0);
}

/**
 * Repo list for this export:
 * - If `RADICLE_ACTIVITY_EXPORT_REPO_IDS` is set, use it (does not affect `/profile`).
 * - Else require `RADICLE_REPO_IDS` (same list as `/profile`).
 * - `all` / `*` is allowed **only** in `RADICLE_ACTIVITY_EXPORT_REPO_IDS` (full node
 *   inventory via `GET /api/v1/repos?show=all`). Do not set `RADICLE_REPO_IDS=all`.
 */
async function resolveExportRids(base, env) {
  const rawExport = env.RADICLE_ACTIVITY_EXPORT_REPO_IDS?.trim();
  const rawProfile = env.RADICLE_REPO_IDS?.trim();

  const split = (raw) => raw.split(",").map((s) => s.trim()).filter(Boolean);
  const isAllToken = (raw) => {
    const t = split(raw);
    return t.length === 1 && /^(all|\*)$/i.test(t[0]);
  };

  if (rawExport) {
    if (isAllToken(rawExport)) {
      const rids = await fetchAllRepoRids(base);
      if (!rids.length) {
        console.error(
          "RADICLE_ACTIVITY_EXPORT_REPO_IDS=all but GET /api/v1/repos?show=all returned no repos.",
        );
        process.exit(1);
      }
      console.log(
        `Using full node inventory: ${rids.length} repo(s) (RADICLE_ACTIVITY_EXPORT_REPO_IDS=all).`,
      );
      return rids;
    }
    return split(rawExport);
  }

  if (!rawProfile) {
    console.error(
      "Set RADICLE_REPO_IDS or RADICLE_ACTIVITY_EXPORT_REPO_IDS in",
      envPath,
    );
    process.exit(1);
  }

  if (isAllToken(rawProfile)) {
    console.error(
      'RADICLE_REPO_IDS cannot be "all" (that would break /profile). Use RADICLE_ACTIVITY_EXPORT_REPO_IDS=all for a full-node export.',
    );
    process.exit(1);
  }

  return split(rawProfile);
}

function normalizeParentIds(parents) {
  if (!Array.isArray(parents)) return [];
  const out = [];
  for (const p of parents) {
    if (typeof p === "string" && p.length > 0) out.push(p);
    else if (p && typeof p === "object") {
      const id = p.id ?? p.oid;
      if (typeof id === "string" && id.length > 0) out.push(id);
    }
  }
  return out;
}

function commitFromDetailJson(data) {
  if (!data || typeof data !== "object") return null;
  if (data.commit && typeof data.commit === "object") return data.commit;
  if (
    (typeof data.id === "string" || typeof data.oid === "string") &&
    data.committer &&
    typeof data.committer === "object"
  ) {
    return data;
  }
  return null;
}

async function fetchCommitById(base, rid, oid) {
  const url = `${base}/api/v1/repos/${encodeURIComponent(rid)}/commits/${encodeURIComponent(oid)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  return commitFromDetailJson(data);
}

const ANCESTRY_CONCURRENCY = 20;

async function fetchAncestryCommits(
  base,
  rid,
  headOid,
  preloaded,
  sinceUnix,
  maxHttpFetches,
) {
  if (maxHttpFetches <= 0) return [];

  const inWindow = new Map();
  const expanded = new Set();
  const q = [];

  const consider = (raw) => {
    const nc = commitWithNormalizedTime(raw);
    if (!nc) return;
    if (expanded.has(nc.id)) return;
    expanded.add(nc.id);
    if (nc.committer.time >= sinceUnix) inWindow.set(nc.id, nc);
    for (const p of normalizeParentIds(nc.parents)) {
      if (p) q.push(p);
    }
  };

  for (const c of preloaded.values()) {
    consider(c);
  }

  if (headOid && !expanded.has(headOid)) {
    q.push(headOid);
  }

  let httpFetches = 0;
  while (q.length > 0 && httpFetches < maxHttpFetches) {
    while (q.length > 0 && httpFetches < maxHttpFetches) {
      const id = q[0];
      if (!id) {
        q.shift();
        continue;
      }
      if (expanded.has(id)) {
        q.shift();
        continue;
      }
      const cached = preloaded.get(id);
      if (cached) {
        q.shift();
        consider(cached);
        continue;
      }
      break;
    }
    if (q.length === 0) break;
    if (httpFetches >= maxHttpFetches) break;

    const chunk = [];
    while (
      q.length > 0 &&
      chunk.length < ANCESTRY_CONCURRENCY &&
      httpFetches + chunk.length < maxHttpFetches
    ) {
      const id = q.shift();
      if (!id || expanded.has(id)) continue;
      const cached = preloaded.get(id);
      if (cached) {
        consider(cached);
        continue;
      }
      chunk.push(id);
    }
    if (chunk.length === 0) continue;

    const raws = await Promise.all(
      chunk.map((id) => fetchCommitById(base, rid, id)),
    );
    httpFetches += chunk.length;

    for (const raw of raws) {
      consider(raw);
    }
  }

  return [...inWindow.values()];
}

async function main() {
  const envText = readFileSync(envPath, "utf8");
  const env = parseEnvLocal(envText);
  const base = (env.RADICLE_HTTP_BASE ?? "http://127.0.0.1:8090").replace(
    /\/$/,
    "",
  );
  const rids = await resolveExportRids(base, env);
  const expTrim = env.RADICLE_ACTIVITY_EXPORT_REPO_IDS?.trim();
  if (expTrim) {
    const tokens = expTrim.split(",").map((s) => s.trim()).filter(Boolean);
    const usedInventory =
      tokens.length === 1 && /^(all|\*)$/i.test(tokens[0]);
    if (!usedInventory) {
      console.log(
        `Exporting ${rids.length} repo(s) from RADICLE_ACTIVITY_EXPORT_REPO_IDS.`,
      );
    }
  } else {
    console.log(
      `Exporting ${rids.length} repo(s) from RADICLE_REPO_IDS — append a new project's RID, or set RADICLE_ACTIVITY_EXPORT_REPO_IDS=all for the whole node.`,
    );
  }
  const historyDays = clampEnvInt(
    env.RADICLE_ACTIVITY_HISTORY_DAYS,
    1095,
    30,
    3650,
  );
  const maxCommitPages = clampEnvInt(
    env.RADICLE_ACTIVITY_MAX_COMMIT_PAGES,
    3000,
    1,
    20000,
  );
  const ancestryMax = clampEnvIntAllowZero(
    env.RADICLE_ACTIVITY_ANCESTRY_MAX_COMMITS,
    8000,
    50000,
  );
  const sinceUnix = Math.floor(Date.now() / 1000) - historyDays * 86400;

  const entries = [];
  for (const rid of rids) {
    const meta = await fetchRepoMeta(base, rid);
    const name =
      meta?.payloads?.["xyz.radicle.project"]?.data?.name ?? rid.slice(0, 16);
    let commits = await fetchCommits(base, rid, sinceUnix, maxCommitPages);
    const headOid = meta?.payloads?.["xyz.radicle.project"]?.meta?.head;
    const byId = new Map();
    for (const c of commits) byId.set(c.id, c);
    if (headOid) {
      const tip = await fetchCommitById(base, rid, headOid);
      const nc = tip ? commitWithNormalizedTime(tip) : null;
      if (nc && nc.committer.time >= sinceUnix) byId.set(nc.id, nc);
    }
    if (ancestryMax > 0) {
      const preloaded = new Map(byId);
      const walked = await fetchAncestryCommits(
        base,
        rid,
        headOid,
        preloaded,
        sinceUnix,
        ancestryMax,
      );
      for (const c of walked) {
        if (!byId.has(c.id)) byId.set(c.id, c);
      }
    }
    commits = [...byId.values()].sort(
      (a, b) => b.committer.time - a.committer.time,
    );
    for (const commit of commits) {
      entries.push({ rid, repoName: name, commit });
    }
  }

  entries.sort((a, b) => b.commit.committer.time - a.commit.committer.time);

  const seenKeys = new Set();
  const unique = entries.filter((e) => {
    const k = `${e.rid}:${e.commit.id}`;
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });

  const payload = {
    generatedAt: Math.floor(Date.now() / 1000),
    base,
    ridCount: rids.length,
    entryCount: unique.length,
    historyDays,
    maxCommitPages,
    ancestryMax,
    entries: unique,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    "Wrote",
    outPath,
    `(${unique.length} commit rows, last ${historyDays}d, ${maxCommitPages} pages/repo, ancestry cap ${ancestryMax})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
