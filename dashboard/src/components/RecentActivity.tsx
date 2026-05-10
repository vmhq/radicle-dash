import { GitCommit } from "lucide-react";
import type { ActivityEntry } from "@/lib/radicle";
import { explorerRepoUrl } from "@/lib/radicle";
import { relativeTime } from "@/lib/time";

type RecentActivityProps = {
  entries: ActivityEntry[];
  limit?: number;
};

export function RecentActivity({ entries, limit = 10 }: RecentActivityProps) {
  if (entries.length === 0) return null;
  const items = entries.slice(0, limit);
  return (
    <section className="flex h-[224px] flex-col rounded-2xl border border-border bg-surface p-6 card-ring">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Recent activity
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">
            Latest commits
          </h3>
        </div>
        <span className="text-xs text-muted">{entries.length} this year</span>
      </header>

      <ul className="scroll-thin mt-4 min-h-0 flex-1 divide-y divide-border overflow-y-auto pr-1">
        {items.map((entry) => (
          <li
            key={`${entry.rid}:${entry.commit.id}`}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <GitCommit size={14} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <a
                  href={explorerRepoUrl(entry.rid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-accent"
                  title={entry.commit.summary}
                >
                  {entry.commit.summary || "(no message)"}
                </a>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                <a
                  href={explorerRepoUrl(entry.rid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:text-foreground"
                >
                  {entry.repoName}
                </a>
                {" · "}
                <time
                  dateTime={new Date(
                    entry.commit.committer.time * 1000,
                  ).toISOString()}
                  title={new Date(
                    entry.commit.committer.time * 1000,
                  ).toLocaleString()}
                >
                  {relativeTime(entry.commit.committer.time)}
                </time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

