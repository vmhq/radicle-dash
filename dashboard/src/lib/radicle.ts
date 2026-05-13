import { getExplorerNode, getExplorerOrigin, getRadicleHttpBase } from "./env";

export type RadicleDelegate = { id: string; alias: string };

export type RadicleRepoMeta = {
  head: string;
  issues?: { open?: number; closed?: number };
  patches?: { open?: number; draft?: number; archived?: number; merged?: number };
};

export type RadicleRepoPayload = {
  payloads: {
    "xyz.radicle.project": {
      data: {
        name: string;
        description: string;
        defaultBranch: string;
      };
      meta: RadicleRepoMeta;
    };
  };
  delegates: RadicleDelegate[];
  rid: string;
  visibility?: { type: string };
  seeding?: number;
};

export function explorerRepoUrl(rid: string, node?: string): string {
  const host = node ?? getExplorerNode();
  const origin = getExplorerOrigin();
  return `${origin}/nodes/${encodeURIComponent(host)}/${encodeURIComponent(rid)}`;
}

export async function fetchRepo(
  rid: string,
  baseUrl?: string,
): Promise<{ ok: true; repo: RadicleRepoPayload } | { ok: false; rid: string; error: string }> {
  const base = baseUrl ?? getRadicleHttpBase();
  const url = `${base}/api/v1/repos/${encodeURIComponent(rid)}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        ok: false,
        rid,
        error: `${res.status} ${res.statusText}`,
      };
    }
    const repo = (await res.json()) as RadicleRepoPayload;
    return { ok: true, repo };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, rid, error: message };
  }
}

export async function fetchProfileRepos(
  rids: string[],
  baseUrl?: string,
): Promise<{
  repos: RadicleRepoPayload[];
  failures: { rid: string; error: string }[];
}> {
  const results = await Promise.all(rids.map((rid) => fetchRepo(rid, baseUrl)));
  const repos: RadicleRepoPayload[] = [];
  const failures: { rid: string; error: string }[] = [];
  for (const r of results) {
    if (r.ok) repos.push(r.repo);
    else failures.push({ rid: r.rid, error: r.error });
  }
  repos.sort((a, b) =>
    a.payloads["xyz.radicle.project"].data.name.localeCompare(
      b.payloads["xyz.radicle.project"].data.name,
    ),
  );
  return { repos, failures };
}

export type NodeInfo = {
  id: string;
  agent?: string;
  state?: string;
  config?: { alias?: string };
};

export type Commit = {
  id: string;
  summary: string;
  description?: string;
  parents: string[];
  author: { name: string; email: string };
  committer: { name: string; email: string; time: number };
};

export type ActivityEntry = {
  rid: string;
  repoName: string;
  commit: Commit;
};

/**
 * `radicle-httpd` returns committer time as Unix seconds; some payloads use ms.
 * Values ≥ 1e12 are treated as epoch milliseconds. Hand-written snapshots may
 * use ISO-8601 strings for `committer.time`; those are parsed as UTC.
 *
 * Some APIs stringify epochs with a leading `+`, `_` / `,` grouping, or wrap
 * seconds in `{ seconds: … }`; those are normalized here so the heatmap does
 * not drop every row.
 */
export function normalizeCommitterTimeSeconds(t: unknown): number | null {
  if (t instanceof Date) {
    const ms = t.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return Math.floor(ms / 1000);
  }
  let v: unknown = t;
  for (let i = 0; i < 8; i++) {
    const next = unwrapCommitterTimeValue(v);
    if (next === v) break;
    v = next;
  }
  if (typeof v === "bigint") {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    v = n;
  }
  let n: number;
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

/** Single-level unwrap for protobuf-style, BSON, or nested blobs. */
function unwrapCommitterTimeValue(t: unknown): unknown {
  if (t === null || t === undefined) return t;
  if (typeof t !== "object" || Array.isArray(t)) return t;
  const o = t as Record<string, unknown>;
  // Whole committer/author object accidentally stored under `time`
  if (
    ("email" in o || "name" in o) &&
    "time" in o &&
    o.time !== undefined &&
    o.time !== null
  ) {
    return o.time;
  }
  if ("seconds" in o && (typeof o.seconds === "number" || typeof o.seconds === "string")) {
    return o.seconds;
  }
  if ("$date" in o && o.$date !== undefined) return o.$date;
  if ("unix" in o && (typeof o.unix === "number" || typeof o.unix === "string")) {
    return o.unix;
  }
  if (
    "timestamp" in o &&
    (typeof o.timestamp === "number" || typeof o.timestamp === "string")
  ) {
    return o.timestamp;
  }
  if ("sec" in o && (typeof o.sec === "number" || typeof o.sec === "string")) {
    return o.sec;
  }
  if ("time" in o && (typeof o.time === "number" || typeof o.time === "string")) {
    return o.time;
  }
  return t;
}

/**
 * Parse string committer time to Unix seconds. Prefer numeric epochs (including
 * optional `+`, `_`, `,`) when the string does not look like ISO/RFC dates.
 */
function parseStringCommitterTime(raw: string): number | null {
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

function rawCommitterTime(c: Commit): unknown {
  const ct = c.committer as Record<string, unknown> | undefined | null;
  if (ct) {
    const v =
      ct.time ?? ct.timestamp ?? ct.date ?? ct.unix ?? ct.seconds;
    if (v !== undefined && v !== null) return v;
  }
  const au = c.author as Record<string, unknown> | undefined | null;
  if (au) {
    const v = au.time ?? au.timestamp ?? au.date;
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/** Heatmap / UI: resolve committer (or author) time the same way as ingestion. */
export function normalizeCommitCalendarTime(c: Commit): number | null {
  return normalizeCommitterTimeSeconds(rawCommitterTime(c));
}

function commitWithNormalizedTime(c: Commit): Commit | null {
  const raw = rawCommitterTime(c);
  const ts = normalizeCommitterTimeSeconds(raw);
  if (ts === null) return null;
  const baseCommitter =
    c.committer ??
    (c.author
      ? { name: c.author.name, email: c.author.email, time: ts }
      : { name: "", email: "", time: ts });
  const cr = c as Record<string, unknown>;
  const id =
    (typeof c.id === "string" && c.id.trim()) ||
    (typeof cr.sha === "string" && String(cr.sha).trim()) ||
    "";
  if (!id) return null;
  return {
    ...c,
    id,
    parents: Array.isArray(c.parents) ? c.parents : [],
    committer: { ...baseCommitter, time: ts },
  };
}

/** `radicle-httpd` usually returns string parents; tolerate `{ id }` shapes. */
export function normalizeParentIds(parents: unknown): string[] {
  if (!Array.isArray(parents)) return [];
  const out: string[] = [];
  for (const p of parents) {
    if (typeof p === "string" && p.length > 0) out.push(p);
    else if (p && typeof p === "object") {
      const id = (p as { id?: unknown; oid?: unknown }).id ?? (p as { oid?: unknown }).oid;
      if (typeof id === "string" && id.length > 0) out.push(id);
    }
  }
  return out;
}

function commitFromCommitDetailJson(data: unknown): Commit | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const raw = o.commit;
  const c =
    raw && typeof raw === "object"
      ? (raw as Commit)
      : typeof o.id === "string" && o.committer && typeof o.committer === "object"
        ? (o as unknown as Commit)
        : null;
  return c;
}

/**
 * Fetch commits from `radicle-httpd` within the last year window.
 *
 * `radicle-httpd` caps `perPage` at 5 and ignores `since=`. Pages are not
 * guaranteed to be strictly ordered, so we never stop at the "first old"
 * commit in a batch (that dropped newer commits on the same page). We take
 * every commit in each page whose time is `>= sinceUnix`, and paginate until
 * a short page or `maxPages`.
 */
export async function fetchRepoCommits(
  rid: string,
  sinceUnix: number,
  baseUrl?: string,
  maxPages = 3000,
): Promise<Commit[]> {
  const base = baseUrl ?? getRadicleHttpBase();
  const all: Commit[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= maxPages; page++) {
    let batch: Commit[] = [];
    try {
      const res = await fetch(
        `${base}/api/v1/repos/${encodeURIComponent(rid)}/commits?page=${page}&perPage=5`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );
      if (!res.ok) break;
      batch = (await res.json()) as Commit[];
    } catch {
      break;
    }
    if (!batch.length) break;

    for (const c of batch) {
      const nc = commitWithNormalizedTime(c);
      if (!nc || nc.committer.time < sinceUnix) continue;
      const dedupeKey = `${rid}:${nc.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      all.push(nc);
    }
    if (batch.length < 5) break;
  }
  return all;
}

/**
 * Single commit by OID (repo `meta.head` tip is often missing from the
 * paginated `/commits?page=` list in radicle-httpd).
 */
export async function fetchRepoCommitById(
  rid: string,
  commitId: string,
  baseUrl?: string,
): Promise<Commit | null> {
  const base = baseUrl ?? getRadicleHttpBase();
  try {
    const res = await fetch(
      `${base}/api/v1/repos/${encodeURIComponent(rid)}/commits/${encodeURIComponent(commitId)}`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    return commitFromCommitDetailJson(data);
  } catch {
    return null;
  }
}

const ANCESTRY_FETCH_CONCURRENCY = 20;

/**
 * Walk parent pointers (BFS) to collect in-window commits. Uses every commit
 * already loaded from pagination (and the tip) **without extra HTTP** to
 * enqueue parents, then fetches unknown OIDs until `maxHttpFetches` is reached.
 * Merge commits need both parents; parent arrays may be strings or `{ id }`.
 */
export async function fetchCommitsViaParentWalk(
  rid: string,
  headOid: string | undefined,
  preloaded: Map<string, Commit>,
  sinceUnix: number,
  baseUrl: string | undefined,
  maxHttpFetches: number,
): Promise<Commit[]> {
  if (maxHttpFetches <= 0) return [];

  const inWindow = new Map<string, Commit>();
  const expanded = new Set<string>();
  const q: string[] = [];

  const consider = (raw: Commit | null) => {
    const nc = raw ? commitWithNormalizedTime(raw) : null;
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

    const chunk: string[] = [];
    while (
      q.length > 0 &&
      chunk.length < ANCESTRY_FETCH_CONCURRENCY &&
      httpFetches + chunk.length < maxHttpFetches
    ) {
      const id = q.shift()!;
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
      chunk.map((id) => fetchRepoCommitById(rid, id, baseUrl)),
    );
    httpFetches += chunk.length;

    for (const raw of raws) {
      consider(raw);
    }
  }

  return [...inWindow.values()];
}

/**
 * Aggregate commits across the given repos within the last `sinceDays` days.
 * Returns a flat list sorted newest-first, suitable for both an activity feed
 * and a contribution heatmap. Pass `maxCommitPages` to cap paginated fetches
 * per repo (each page is at most 5 commits from radicle-httpd). When
 * `maxAncestryCommits > 0`, walks `parents`: first expands all paginated commits
 * in memory, then follows unknown parents with HTTP (bounded by
 * `maxAncestryCommits`) so merge history is not dropped.
 */
export async function fetchProfileActivity(
  repos: RadicleRepoPayload[],
  sinceDays = 1095,
  baseUrl?: string,
  maxCommitPages = 3000,
  maxAncestryCommits = 8000,
): Promise<ActivityEntry[]> {
  const sinceUnix = Math.floor(Date.now() / 1000) - sinceDays * 86400;
  const results = await Promise.all(
    repos.map(async (repo) => {
      const rid = repo.rid;
      const commits = await fetchRepoCommits(
        rid,
        sinceUnix,
        baseUrl,
        maxCommitPages,
      );
      const headOid = repo.payloads["xyz.radicle.project"].meta.head;
      const byId = new Map<string, Commit>();
      for (const c of commits) byId.set(c.id, c);

      if (headOid) {
        const tip = await fetchRepoCommitById(rid, headOid, baseUrl);
        const nc = tip ? commitWithNormalizedTime(tip) : null;
        if (nc && nc.committer.time >= sinceUnix) byId.set(nc.id, nc);
      }

      if (maxAncestryCommits > 0) {
        const preloaded = new Map<string, Commit>(byId);
        const walked = await fetchCommitsViaParentWalk(
          rid,
          headOid,
          preloaded,
          sinceUnix,
          baseUrl,
          maxAncestryCommits,
        );
        for (const c of walked) {
          if (!byId.has(c.id)) byId.set(c.id, c);
        }
      }

      const merged = [...byId.values()].sort(
        (a, b) => b.committer.time - a.committer.time,
      );
      const repoName = repo.payloads["xyz.radicle.project"].data.name;
      return merged.map((commit) => ({ rid, repoName, commit }));
    }),
  );
  const flat = results.flat().sort(
    (a, b) => b.commit.committer.time - a.commit.committer.time,
  );
  const seen = new Set<string>();
  return flat.filter((e) => {
    const k = `${e.rid}:${e.commit.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function fetchNodeInfo(
  baseUrl?: string,
): Promise<NodeInfo | null> {
  const base = baseUrl ?? getRadicleHttpBase();
  try {
    const res = await fetch(`${base}/api/v1/node`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as NodeInfo;
  } catch {
    return null;
  }
}

/**
 * Fetch the node's repository inventory.
 *
 * `radicle-httpd` defaults `/api/v1/repos` to `show=pinned`, which follows
 * `web.pinned.repositories` in `$RAD_HOME/config.json` (not a `rad pin` CLI).
 * We pass `show=all` for the default /node view so the full inventory is returned.
 */
export async function fetchNodeRepos(
  baseUrl?: string,
  show: "all" | "pinned" = "all",
): Promise<{ repos: RadicleRepoPayload[]; error: string | null }> {
  const base = baseUrl ?? getRadicleHttpBase();
  try {
    const res = await fetch(`${base}/api/v1/repos?show=${show}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { repos: [], error: `${res.status} ${res.statusText}` };
    }
    const repos = (await res.json()) as RadicleRepoPayload[];
    return { repos, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { repos: [], error: message };
  }
}
