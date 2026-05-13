import Link from "next/link";
import {
  AlertTriangle,
  FolderGit2,
  GitPullRequest,
  Globe2,
  Network,
  Radio,
  Server,
  ShieldCheck,
} from "lucide-react";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Avatar } from "@/components/Avatar";
import { Backdrop } from "@/components/Backdrop";
import { CopyButton } from "@/components/CopyButton";
import { ProfileBio } from "@/components/ProfileBio";
import { RecentActivity } from "@/components/RecentActivity";
import { RepoExplorer } from "@/components/RepoExplorer";
import { SiteHeader } from "@/components/SiteHeader";
import { StatTile } from "@/components/StatTile";
import {
  getRadicleHttpBase,
  getRadicleHttpPublicLabel,
  getSiteMode,
} from "@/lib/env";
import {
  PROFILE_ALIAS,
  PROFILE_AVATAR_URL,
  PROFILE_BIO,
  PROFILE_DELEGATE_DID,
  getProfileLinks,
  getProfileRepoIds,
} from "@/lib/profileRepos";
import { readActivitySnapshot } from "@/lib/activitySnapshot";
import { fetchProfileActivity, fetchProfileRepos } from "@/lib/radicle";
import { shortenId } from "@/lib/visual";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const siteMode = getSiteMode();
  const rids = getProfileRepoIds();
  const base = getRadicleHttpBase();
  const apiPublicLabel = getRadicleHttpPublicLabel();
  const links = getProfileLinks();

  const { repos, failures } = await fetchProfileRepos(rids, base);
  const snapshotActivity = await readActivitySnapshot();
  const activity =
    snapshotActivity ??
    (await fetchProfileActivity(repos, 365, base));

  // Map each rid to its most recent commit time (activity is already sorted desc).
  const lastCommitByRid: Record<string, number> = {};
  for (const entry of activity) {
    if (lastCommitByRid[entry.rid] === undefined) {
      lastCommitByRid[entry.rid] = entry.commit.committer.time;
    }
  }

  const totalSeeding = repos.reduce((sum, r) => sum + (r.seeding ?? 0), 0);
  const openPatches = repos.reduce(
    (sum, r) =>
      sum + (r.payloads["xyz.radicle.project"].meta.patches?.open ?? 0),
    0,
  );

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        {/* Hero */}
        <section className="animate-fade-up">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
            <Avatar
              seed={PROFILE_DELEGATE_DID}
              alias={PROFILE_ALIAS}
              size={104}
              imageUrl={PROFILE_AVATAR_URL || undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                <span
                  className="pulse-online inline-block h-1.5 w-1.5 rounded-full bg-accent"
                  aria-hidden
                />
                Online via radicle-httpd
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                {PROFILE_ALIAS}
              </h1>

              <ProfileBio bio={PROFILE_BIO} links={links} />

              <div className="mt-4 inline-flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-strong"
                  title={PROFILE_DELEGATE_DID}
                >
                  {shortenId(PROFILE_DELEGATE_DID, 22, 8)}
                </span>
                <CopyButton value={PROFILE_DELEGATE_DID} label="Copy DID" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label="Repositories"
            value={repos.length}
            icon={<FolderGit2 size={16} />}
            tone="accent"
          />
          <StatTile
            label="Seeders"
            value={totalSeeding}
            hint="total"
            icon={<Radio size={16} />}
            tone="info"
          />
          {failures.length > 0 ? (
            <StatTile
              label="Failures"
              value={failures.length}
              hint="see notice"
              icon={<AlertTriangle size={16} />}
              tone="warn"
            />
          ) : (
            <StatTile
              label="Open patches"
              value={openPatches}
              hint={openPatches === 0 ? "none open" : "across repos"}
              icon={<GitPullRequest size={16} />}
              tone="success"
            />
          )}
        </section>

        {failures.length > 0 && (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5"
          >
            <p className="text-sm font-medium text-amber-200">
              Some repositories couldn’t be loaded
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-amber-100/80">
              {failures.map((f) => (
                <li key={f.rid} className="truncate">
                  {f.rid}: <span className="opacity-80">{f.error}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-amber-100/70">
              Is{" "}
              <code className="rounded bg-black/30 px-1">radicle-httpd</code>{" "}
              reachable at{" "}
              <code className="rounded bg-black/30 px-1">{apiPublicLabel}</code>
              ? Try{" "}
              <code className="rounded bg-black/30 px-1">rad seed &lt;rid&gt;</code>{" "}
              so your node has a copy.
            </p>
          </div>
        )}

        {/* Activity (heatmap + recent) */}
        {activity.length > 0 && (
          <section className="mt-12">
            <header className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
                Activity
              </h2>
              <span className="text-xs text-muted">last 12 months</span>
            </header>
            <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ActivityHeatmap entries={activity} />
              </div>
              <RecentActivity entries={activity} />
            </div>
          </section>
        )}

        {/* Repos */}
        <section className="mt-12">
          <header className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
              Repositories
            </h2>
            <Link
              href="/node"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
            >
              <Network size={12} />
              View whole node
            </Link>
          </header>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5">
            <p className="text-xs text-muted-strong">
              <span className="text-muted">Clone any repo:</span>{" "}
              <code className="font-mono text-foreground">
                rad clone &lt;rid&gt;
              </code>
            </p>
            <a
              href="https://docs.radicle.xyz/guides/user/clone-a-repository"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-foreground"
            >
              Docs →
            </a>
          </div>

          <div className="mt-5">
            <RepoExplorer
              repos={repos}
              lastCommitByRid={lastCommitByRid}
              emptyState={
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                  <p className="text-sm text-muted-strong">
                    No repositories loaded yet.
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Set{" "}
                    <code className="rounded bg-black/30 px-1 font-mono">
                      RADICLE_REPO_IDS
                    </code>{" "}
                    or update{" "}
                    <code className="rounded bg-black/30 px-1 font-mono">
                      src/lib/profileRepos.ts
                    </code>
                    , then ensure the Radicle HTTP API is reachable from this
                    deployment ({apiPublicLabel}).
                  </p>
                </div>
              }
            />
          </div>
        </section>

        <footer className="mt-20 border-t border-border pt-8">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            <li className="inline-flex items-center gap-1.5">
              <Server size={13} className="opacity-70" />
              <span className="font-mono text-[11px] leading-snug">
                {apiPublicLabel}
              </span>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="opacity-70" />
              Read-only HTTP API
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Globe2 size={13} className="opacity-70" />
              Sovereign · peer-to-peer · git-native
            </li>
            {siteMode === "marketing" && (
              <li className="ml-auto">
                <Link href="/" className="hover:text-foreground">
                  ← About this dashboard
                </Link>
              </li>
            )}
          </ul>
        </footer>
      </main>
    </div>
  );
}
