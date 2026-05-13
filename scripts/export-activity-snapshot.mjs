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
 * Reads RADICLE_HTTP_BASE and RADICLE_REPO_IDS from the .env.local file (first
 * arg defaults to ./dashboard/.env.local). Output defaults to
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

function normalizeCommitterTimeSeconds(t) {
  if (typeof t !== "number" || !Number.isFinite(t) || t <= 0) return null;
  return t >= 1e12 ? Math.floor(t / 1000) : Math.floor(t);
}

function commitWithNormalizedTime(c) {
  const ts = normalizeCommitterTimeSeconds(c?.committer?.time);
  if (ts === null || !c?.committer) return null;
  return { ...c, committer: { ...c.committer, time: ts } };
}

function commitsPageTimeOrder(batch) {
  const times = [];
  for (const c of batch) {
    const t = normalizeCommitterTimeSeconds(c?.committer?.time);
    if (t !== null) times.push(t);
  }
  if (times.length < 2) return "unknown";
  const a = times[0];
  const b = times[times.length - 1];
  if (a > b) return "desc";
  if (a < b) return "asc";
  return "unknown";
}

async function fetchCommits(base, rid, sinceUnix, maxPages = 200) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `${base}/api/v1/repos/${encodeURIComponent(rid)}/commits?page=${page}&perPage=5`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    const order = commitsPageTimeOrder(batch);

    if (order === "asc") {
      for (const c of batch) {
        const nc = commitWithNormalizedTime(c);
        if (nc && nc.committer.time >= sinceUnix) all.push(nc);
      }
      if (batch.length < 5) break;
      continue;
    }

    let hitOlder = false;
    for (const c of batch) {
      const nc = commitWithNormalizedTime(c);
      if (!nc) continue;
      if (nc.committer.time < sinceUnix) {
        hitOlder = true;
        break;
      }
      all.push(nc);
    }
    if (hitOlder || batch.length < 5) break;
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
  const sinceDays = 365;
  const sinceUnix = Math.floor(Date.now() / 1000) - sinceDays * 86400;

  const entries = [];
  for (const rid of rids) {
    const meta = await fetchRepoMeta(base, rid);
    const name =
      meta?.payloads?.["xyz.radicle.project"]?.data?.name ?? rid.slice(0, 16);
    const commits = await fetchCommits(base, rid, sinceUnix);
    for (const commit of commits) {
      entries.push({ rid, repoName: name, commit });
    }
  }

  entries.sort((a, b) => b.commit.committer.time - a.commit.committer.time);

  const payload = {
    generatedAt: Math.floor(Date.now() / 1000),
    base,
    ridCount: rids.length,
    entryCount: entries.length,
    entries,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("Wrote", outPath, `(${entries.length} commit rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
