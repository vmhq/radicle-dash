import Link from "next/link";
import { ArrowUpRight, Clock, GitBranch, GitPullRequest, Radio } from "lucide-react";
import type { RadicleRepoPayload } from "@/lib/radicle";
import { explorerRepoUrl } from "@/lib/radicle";
import { relativeTime } from "@/lib/time";
import { gradientFromSeed, shortenId } from "@/lib/visual";
import { CopyButton } from "./CopyButton";

type RepoCardProps = {
  repo: RadicleRepoPayload;
  /** Unix-second timestamp of the most recent commit, if known. */
  lastCommit?: number;
};

export function RepoCard({ repo, lastCommit }: RepoCardProps) {
  const project = repo.payloads["xyz.radicle.project"];
  const { name, description, defaultBranch } = project.data;
  const open = project.meta.patches?.open ?? 0;
  const merged = project.meta.patches?.merged ?? 0;
  const seeding = repo.seeding ?? 0;
  const explorer = explorerRepoUrl(repo.rid);
  const accent = gradientFromSeed(repo.rid);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 transition duration-300 card-ring hover:border-border-strong hover:bg-surface-strong"
      style={{ minHeight: 220 }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent.from}, ${accent.to}, transparent)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-70"
        style={{ background: accent.cssGradient }}
      />

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
            {name}
          </h3>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {shortenId(repo.rid, 14, 6)}
          </p>
        </div>
        <Link
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name} in Radicle Explorer`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background-subtle text-muted transition group-hover:text-foreground hover:border-border-strong hover:text-foreground"
        >
          <ArrowUpRight size={15} />
        </Link>
      </header>

      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-strong">
        {description?.trim() || (
          <span className="text-muted">No description.</span>
        )}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <div className="inline-flex items-center gap-1.5">
            <GitBranch size={13} className="opacity-80" />
            <span className="text-muted-strong">{defaultBranch}</span>
          </div>
          <div className="inline-flex items-center gap-1.5" title="Seeding nodes">
            <Radio size={13} className="opacity-80" />
            <span className="text-muted-strong">{seeding}</span>
          </div>
          {lastCommit !== undefined && (
            <div
              className="inline-flex items-center gap-1.5"
              title={`Last commit ${new Date(lastCommit * 1000).toLocaleString()}`}
            >
              <Clock size={13} className="opacity-80" />
              <span className="text-muted-strong">{relativeTime(lastCommit)}</span>
            </div>
          )}
          {(open > 0 || merged > 0) && (
            <div className="inline-flex items-center gap-1.5" title="Patches (open · merged)">
              <GitPullRequest size={13} className="opacity-80" />
              <span className="text-muted-strong">
                {open}
                <span className="text-muted">/{merged}</span>
              </span>
            </div>
          )}
        </dl>
        <div className="flex items-center gap-1.5">
          <CopyButton value={`rad clone ${repo.rid}`} label="Clone" />
          <CopyButton value={repo.rid} label="RID" />
        </div>
      </div>
    </article>
  );
}
