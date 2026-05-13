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
  if (typeof t !== "number" || !Number.isFinite(t) || t <= 0) return null;
  return t >= 1e12 ? Math.floor(t / 1000) : Math.floor(t);
}

function commitWithNormalizedTime(c: Commit): Commit | null {
  const ts = normalizeCommitterTimeSeconds(c.committer?.time);
  if (ts === null) return null;
  return {
    ...c,
    committer: { ...c.committer, time: ts },
  };
}

/** Infer API ordering within a page (newest-first vs oldest-first). */
function commitsPageTimeOrder(batch: Commit[]): "desc" | "asc" | "unknown" {
  const times: number[] = [];
  for (const c of batch) {
    const t = normalizeCommitterTimeSeconds(c.committer?.time);
    if (t !== null) times.push(t);
  }
  if (times.length < 2) return "unknown";
  const a = times[0]!;
  const b = times[times.length - 1]!;
  if (a > b) return "desc";
  if (a < b) return "asc";
  return "unknown";
}

/**
 * Fetch recent commits from a repo, paginating until we either run out or
 * hit a commit older than `sinceUnix`.
 *
 * `radicle-httpd` caps `perPage` at 5 and ignores `since=`, so we paginate
 * with `?page=N&perPage=5` and filter client-side.
 */
export async function fetchRepoCommits(
  rid: string,
  sinceUnix: number,
  baseUrl?: string,
  maxPages = 200,
): Promise<Commit[]> {
  const base = baseUrl ?? getRadicleHttpBase();
  const all: Commit[] = [];
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

/**
 * Aggregate commits across the given repos within the last `sinceDays` days.
 * Returns a flat list sorted newest-first, suitable for both an activity feed
 * and a contribution heatmap.
 */
export async function fetchProfileActivity(
  repos: RadicleRepoPayload[],
  sinceDays = 365,
  baseUrl?: string,
): Promise<ActivityEntry[]> {
  const sinceUnix = Math.floor(Date.now() / 1000) - sinceDays * 86400;
  const results = await Promise.all(
    repos.map(async (repo) => {
      const commits = await fetchRepoCommits(repo.rid, sinceUnix, baseUrl);
      const repoName = repo.payloads["xyz.radicle.project"].data.name;
      return commits.map((commit) => ({ rid: repo.rid, repoName, commit }));
    }),
  );
  return results
    .flat()
    .sort((a, b) => b.commit.committer.time - a.commit.committer.time);
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
