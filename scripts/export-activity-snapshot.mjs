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
 * Reads RADICLE_HTTP_BASE, RADICLE_REPO_IDS, and optional
 * RADICLE_ACTIVITY_HISTORY_DAYS / RADICLE_ACTIVITY_MAX_COMMIT_PAGES /
 * RADICLE_ACTIVITY_ANCESTRY_MAX_COMMITS from the
 * .env.local file (first arg defaults to ./dashboard/.env.local). Output defaults to
 * ./dashboard/data/activity-snapshot.json
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
  if (typeof t.seconds === "number" || typeof t.seconds === "string") {
    return t.seconds;
  }
  if ("$date" in t) return t.$date;
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
  let v = unwrapCommitterTimeValue(t);
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

function commitWithNormalizedTime(c) {
  const ts = normalizeCommitterTimeSeconds(c?.committer?.time);
  if (ts === null || !c?.committer) return null;
  return { ...c, committer: { ...c.committer, time: ts } };
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
  if (typeof data.id === "string" && data.committer && typeof data.committer === "object") {
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
  const rawIds = env.RADICLE_REPO_IDS?.trim();
  if (!rawIds) {
    console.error("RADICLE_REPO_IDS missing in", envPath);
    process.exit(1);
  }
  const rids = rawIds.split(",").map((s) => s.trim()).filter(Boolean);
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
