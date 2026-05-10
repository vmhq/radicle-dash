"use client";

import { ArrowDownAZ, Clock, Radio, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { RadicleRepoPayload } from "@/lib/radicle";
import { RepoCard } from "./RepoCard";

type SortKey = "recent" | "name" | "seeding";

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: "recent", label: "Recent", icon: <Clock size={13} /> },
  { value: "name", label: "Name A→Z", icon: <ArrowDownAZ size={13} /> },
  { value: "seeding", label: "Seeders", icon: <Radio size={13} /> },
];

type RepoExplorerProps = {
  repos: RadicleRepoPayload[];
  emptyState?: React.ReactNode;
  /** Map of `rid → unix-second of most recent commit`, used for the
   *  "Recent" sort and the per-card "updated Xd ago" badge. */
  lastCommitByRid?: Record<string, number>;
};

export function RepoExplorer({
  repos,
  emptyState,
  lastCommitByRid = {},
}: RepoExplorerProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    const passes = (r: RadicleRepoPayload) => {
      if (!q) return true;
      const data = r.payloads["xyz.radicle.project"].data;
      return (
        data.name.toLowerCase().includes(q) ||
        data.description.toLowerCase().includes(q) ||
        r.rid.toLowerCase().includes(q)
      );
    };
    const list = repos.filter(passes);
    list.sort((a, b) => {
      if (sort === "name") {
        return a.payloads["xyz.radicle.project"].data.name.localeCompare(
          b.payloads["xyz.radicle.project"].data.name,
        );
      }
      if (sort === "seeding") return (b.seeding ?? 0) - (a.seeding ?? 0);
      // recent
      const aTime = lastCommitByRid[a.rid] ?? 0;
      const bTime = lastCommitByRid[b.rid] ?? 0;
      return bTime - aTime;
    });
    return list;
  }, [repos, deferred, sort, lastCommitByRid]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex w-full max-w-md items-center">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, description, or RID…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-strong hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </label>

        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs">
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === sort;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                aria-pressed={active}
                className={
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition " +
                  (active
                    ? "bg-background-subtle text-foreground"
                    : "text-muted hover:text-foreground")
                }
              >
                {opt.icon}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        {filtered.length} of {repos.length} repos
        {query ? ` · matching “${query}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6">
          {query ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-muted-strong">
                No matches for{" "}
                <span className="font-mono text-foreground">{query}</span>.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background-subtle px-3 py-1 text-xs text-muted-strong hover:text-foreground"
              >
                <X size={12} />
                Clear search
              </button>
            </div>
          ) : (
            (emptyState ?? null)
          )}
        </div>
      ) : (
        <ul className="mt-5 grid gap-5 md:grid-cols-2">
          {filtered.map((repo) => (
            <li key={repo.rid}>
              <RepoCard repo={repo} lastCommit={lastCommitByRid[repo.rid]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
