export function getRadicleHttpBase(): string {
  const raw = process.env.RADICLE_HTTP_BASE ?? "http://127.0.0.1:8090";
  return raw.replace(/\/$/, "");
}

/** True when `RADICLE_HTTP_BASE` points at loopback (typical self-hosted setup). */
export function isRadicleHttpBaseLoopback(): boolean {
  try {
    const u = new URL(getRadicleHttpBase());
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

/**
 * Text for public UI (footer, hints) — never expose raw `127.0.0.1` to visitors.
 * Set `NEXT_PUBLIC_RADICLE_HTTP_LABEL` to override (e.g. `https://api.example.com`
 * or a short label) once you expose radicle-httpd on a public hostname.
 */
export function getRadicleHttpPublicLabel(): string {
  const custom = process.env.NEXT_PUBLIC_RADICLE_HTTP_LABEL?.trim();
  if (custom) return custom;
  if (isRadicleHttpBaseLoopback()) {
    return "This server’s radicle-httpd (local, read-only)";
  }
  return getRadicleHttpBase();
}

/**
 * Base origin for Explorer links (`/nodes/<host>/<rid>`).
 * Override if you use another Explorer deployment (e.g. app.radicle.xyz).
 */
export function getExplorerOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_RADICLE_EXPLORER_ORIGIN ?? "https://radicle.network";
  return raw.replace(/\/$/, "");
}

/**
 * Node hostname embedded in Explorer URLs. The Explorer UI loads repo data
 * from this node — if it does not replicate your RID yet, the page can error
 * after navigation. Point at a seed that hosts your repos (see FAQ).
 * Default matches canonical URLs from `rad push` (iris.radicle.xyz).
 */
export function getExplorerNode(): string {
  return process.env.NEXT_PUBLIC_RADICLE_EXPLORER_NODE ?? "iris.radicle.xyz";
}

/**
 * `marketing` – product site: keeps the landing page at `/`, profile is shown as a live demo.
 * `personal`  – your own profile: `/` redirects to `/profile`; marketing chrome is hidden.
 */
export type SiteMode = "marketing" | "personal";

export function getSiteMode(): SiteMode {
  const raw = process.env.SITE_MODE ?? process.env.NEXT_PUBLIC_SITE_MODE;
  return raw === "personal" ? "personal" : "marketing";
}

/**
 * How far back profile activity (heatmap + feed) pulls commits from
 * `radicle-httpd`, in calendar days. Override with `RADICLE_ACTIVITY_HISTORY_DAYS`.
 * Clamped to 30–3650 (~10y). Default 365 (1y) to keep public page renders fast.
 */
export function getActivityHistoryDays(): number {
  const raw = process.env.RADICLE_ACTIVITY_HISTORY_DAYS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 365;
  const n = Number.isFinite(parsed) && parsed > 0 ? parsed : 365;
  return Math.min(Math.max(n, 30), 3650);
}

/**
 * Max `page=` requests per repo for `/commits` (5 rows per page). Override
 * `RADICLE_ACTIVITY_MAX_COMMIT_PAGES`. Clamped 1–20000 (~100k commits). Default 20
 * so the profile can render quickly on serverless/edge deployments.
 */
export function getActivityMaxCommitPages(): number {
  const raw = process.env.RADICLE_ACTIVITY_MAX_COMMIT_PAGES?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 20;
  const n = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  return Math.min(Math.max(n, 1), 20000);
}

/**
 * Heatmap column count. Default is **53 weeks** (GitHub-style 1y view) so the
 * grid fits a typical viewport and the most recent commits are visible without
 * horizontal scrolling. Activity fetch (`RADICLE_ACTIVITY_HISTORY_DAYS`) can be
 * much larger and still drive the feed; the heatmap just shows the recent
 * window. Override with `RADICLE_ACTIVITY_HEATMAP_WEEKS` (clamped 8–530).
 */
export function getActivityHeatmapWeeks(historyDays: number): number {
  const overrideRaw = process.env.RADICLE_ACTIVITY_HEATMAP_WEEKS?.trim();
  if (overrideRaw) {
    const parsed = Number.parseInt(overrideRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(Math.max(parsed, 8), 530);
    }
  }
  const hd =
    Number.isFinite(historyDays) && historyDays > 0 ? historyDays : 1095;
  const w = Math.min(53, Math.ceil(hd / 7) + 1);
  return Math.min(Math.max(w, 8), 530);
}

/** Human label for activity window (heatmap header, etc.). */
export function formatActivityHistoryLabel(days: number): string {
  if (days >= 365) {
    const y = Math.round(days / 365);
    return `${y} year${y === 1 ? "" : "s"}`;
  }
  return `${days} days`;
}

/**
 * Max `GET .../commits/<oid>` calls per repo when walking parents from
 * `meta.head` (fills gaps left by paginated `/commits`). Set
 * `RADICLE_ACTIVITY_ANCESTRY_MAX_COMMITS` to `0` to disable. Clamped 0–50000.
 * Counts only HTTP fetches for commits not already in the paginated/tip set.
 * Default 200 to avoid long cold starts on Cloudflare Workers.
 */
export function getActivityAncestryMaxCommits(): number {
  const raw = process.env.RADICLE_ACTIVITY_ANCESTRY_MAX_COMMITS?.trim();
  if (raw === undefined || raw === "") return 200;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 200;
  return Math.min(parsed, 50000);
}

/** Cache live Radicle API responses for a short period. Override with
 * `RADICLE_FETCH_REVALIDATE_SECONDS`; use `0` to disable Next fetch caching.
 */
export function getRadicleFetchRevalidateSeconds(): number {
  const raw = process.env.RADICLE_FETCH_REVALIDATE_SECONDS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 300;
  if (!Number.isFinite(parsed) || parsed < 0) return 300;
  return Math.min(parsed, 86400);
}

/** Bound each Radicle HTTP request so slow upstreams don't stall the page. */
export function getRadicleFetchTimeoutMs(): number {
  const raw = process.env.RADICLE_FETCH_TIMEOUT_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 3500;
  if (!Number.isFinite(parsed) || parsed <= 0) return 3500;
  return Math.min(Math.max(parsed, 500), 30000);
}
