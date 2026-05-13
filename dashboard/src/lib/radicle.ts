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
 * Values ≥ 1e12 are treated as epoch milliseconds.
 */
export function normalizeCommitterTimeSeconds(t: unknown): number | null {
  let n: number;
  if (typeof t === "number" && Number.isFinite(t)) {
    n = t;
  } else if (typeof t === "string" && t.trim() !== "") {
    const p = Number(t);
    if (!Number.isFinite(p)) return null;
    n = p;
  } else {
    return null;
  }
  if (n <= 0) return null;
  return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

function commitWithNormalizedTime(c: Commit): Commit | null {
  const ts = normalizeCommitterTimeSeconds(c.committer?.time);
  if (ts === null) return null;
  return {
    ...c,
    committer: { ...c.committer, time: ts },
  };
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
    const data = (await res.json()) as { commit?: Commit };
    return data.commit ?? null;
  } catch {
    return null;
  }
}

/**
 * Aggregate commits across the given repos within the last `sinceDays` days.
 * Returns a flat list sorted newest-first, suitable for both an activity feed
 * and a contribution heatmap. Pass `maxCommitPages` to cap paginated fetches
 * per repo (each page is at most 5 commits from radicle-httpd).
 */
export async function fetchProfileActivity(
  repos: RadicleRepoPayload[],
  sinceDays = 1095,
  baseUrl?: string,
  maxCommitPages = 3000,
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
      const merged: Commit[] = [...commits];
      if (headOid) {
        const tip = await fetchRepoCommitById(rid, headOid, baseUrl);
        const nc = tip ? commitWithNormalizedTime(tip) : null;
        if (
          nc &&
          nc.committer.time >= sinceUnix &&
          !merged.some((c) => c.id === nc.id)
        ) {
          merged.push(nc);
        }
      }
      merged.sort((a, b) => b.committer.time - a.committer.time);
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
