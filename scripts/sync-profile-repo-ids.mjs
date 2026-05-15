#!/usr/bin/env node
/**
 * Merge every RID from `GET /api/v1/repos?show=all` into `RADICLE_REPO_IDS`
 * in `dashboard/.env.local` (preserves order: existing first, then new RIDs
 * sorted). Runs `npm run export-activity` afterward unless `--no-export`.
 *
 * Usage (from repo root):
 *   node scripts/sync-profile-repo-ids.mjs
 *   node scripts/sync-profile-repo-ids.mjs path/to/.env.local
 *   node scripts/sync-profile-repo-ids.mjs --dry-run
 *   node scripts/sync-profile-repo-ids.mjs --no-export
 */

import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const defaultEnvPath = join(repoRoot, "dashboard", ".env.local");

function parseArgs(argv) {
  const positional = [];
  let dryRun = false;
  let noExport = false;
  for (const a of argv) {
    if (a === "--dry-run" || a === "-n") dryRun = true;
    else if (a === "--no-export") noExport = true;
    else if (!a.startsWith("-")) positional.push(a);
  }
  return {
    envPath: positional[0] ?? defaultEnvPath,
    dryRun,
    noExport,
  };
}

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

function parseRepoIds(csv) {
  if (!csv || typeof csv !== "string") return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function fetchAllRepoRids(base) {
  const res = await fetch(`${base}/api/v1/repos?show=all`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GET /api/v1/repos?show=all → ${res.status} ${res.statusText}`);
  }
  const repos = await res.json();
  if (!Array.isArray(repos)) return [];
  return repos
    .map((r) => (r && typeof r === "object" ? r.rid : null))
    .filter((id) => typeof id === "string" && id.length > 0);
}

/**
 * Replace first uncommented `RADICLE_REPO_IDS=...` line, or append at EOF.
 * Preserves # comments and other keys untouched.
 */
function upsertRadicleRepoIdsLine(content, mergedCsv) {
  const lines = content.split("\n");
  const out = [];
  let replaced = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (key === "RADICLE_REPO_IDS" && !replaced) {
      const indent = line.match(/^\s*/)[0];
      replaced = true;
      out.push(`${indent}RADICLE_REPO_IDS=${mergedCsv}`);
      continue;
    }
    out.push(line);
  }
  if (!replaced) {
    if (out.length && out[out.length - 1] !== "") out.push("");
    out.push(`RADICLE_REPO_IDS=${mergedCsv}`);
  }
  let text = out.join("\n");
  if (!text.endsWith("\n")) text += "\n";
  return text;
}

async function main() {
  const { envPath, dryRun, noExport } = parseArgs(process.argv.slice(2));

  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch (e) {
    console.error("Cannot read", envPath, e.message ?? e);
    process.exit(1);
  }

  const env = parseEnvLocal(raw);
  const base = (env.RADICLE_HTTP_BASE ?? "http://127.0.0.1:8090").replace(
    /\/$/,
    "",
  );

  const fromNode = await fetchAllRepoRids(base);
  if (fromNode.length === 0) {
    console.error("No RIDs returned from", `${base}/api/v1/repos?show=all`);
    process.exit(1);
  }

  const existing = parseRepoIds(env.RADICLE_REPO_IDS);
  const existingSet = new Set(existing);
  const newRids = fromNode.filter((rid) => !existingSet.has(rid)).sort();
  const merged = [...existing, ...newRids];
  const mergedCsv = merged.join(",");

  console.log(`radicle-httpd: ${fromNode.length} repo(s) on node (show=all)`);
  console.log(
    `RADICLE_REPO_IDS: ${existing.length} in file → ${merged.length} after merge (${newRids.length} new)`,
  );
  if (newRids.length > 0) {
    console.log("New RIDs:");
    for (const rid of newRids) console.log(" ", rid);
  } else {
    console.log("Nothing to append; file already includes every node RID.");
  }

  if (dryRun) {
    console.log("\n--dry-run: not writing", envPath);
  } else if (newRids.length === 0) {
    console.log("\nNo .env line changes (RADICLE_REPO_IDS already complete).");
  } else {
    const next = upsertRadicleRepoIdsLine(raw, mergedCsv);
    writeFileSync(envPath, next, "utf8");
    console.log("\nUpdated", envPath);
  }

  if (!dryRun && !noExport) {
    console.log("\nRunning npm run export-activity …");
    const r = spawnSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "export-activity"],
      {
        cwd: join(repoRoot, "dashboard"),
        stdio: "inherit",
        env: { ...process.env },
      },
    );
    if (r.status !== 0) {
      process.exit(r.status ?? 1);
    }
  } else if (noExport) {
    console.log("\n--no-export: skipped activity snapshot.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
