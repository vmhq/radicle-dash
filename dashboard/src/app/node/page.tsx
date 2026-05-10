import Link from "next/link";
import {
  AlertTriangle,
  FolderGit2,
  Globe2,
  Network,
  Radio,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Backdrop } from "@/components/Backdrop";
import { CopyButton } from "@/components/CopyButton";
import { RepoExplorer } from "@/components/RepoExplorer";
import { ShowToggle, type ShowMode } from "@/components/ShowToggle";
import { SiteHeader } from "@/components/SiteHeader";
import { StatTile } from "@/components/StatTile";
import {
  getRadicleHttpBase,
  getRadicleHttpPublicLabel,
  isRadicleHttpBaseLoopback,
} from "@/lib/env";
import { fetchNodeInfo, fetchNodeRepos } from "@/lib/radicle";
import { shortenId } from "@/lib/visual";

export const dynamic = "force-dynamic";

type NodePageProps = {
  searchParams: Promise<{ show?: string }>;
};

export default async function NodePage({ searchParams }: NodePageProps) {
  const params = await searchParams;
  const show: ShowMode = params.show === "pinned" ? "pinned" : "all";

  const base = getRadicleHttpBase();
  const apiPublicLabel = getRadicleHttpPublicLabel();
  const [info, allList, pinnedList] = await Promise.all([
    fetchNodeInfo(base),
    fetchNodeRepos(base, "all"),
    fetchNodeRepos(base, "pinned"),
  ]);

  const list = show === "pinned" ? pinnedList : allList;
  const repos = list.repos;
  const totalCount = allList.repos.length;
  const pinnedCount = pinnedList.repos.length;
  const totalSeeding = repos.reduce((sum, r) => sum + (r.seeding ?? 0), 0);
  const publicCount = repos.filter(
    (r) => (r.visibility?.type ?? "public") === "public",
  ).length;
  const delegateSet = new Set<string>();
  for (const r of repos) for (const d of r.delegates ?? []) delegateSet.add(d.id);
  const alias = info?.config?.alias ?? "node";

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="animate-fade-up">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            <Network size={12} />
            Whole-node view
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {alias}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-strong">
            Every repository this node is replicating, fetched live from{" "}
            {isRadicleHttpBaseLoopback() ? (
              <>
                this machine’s read-only API{" "}
                <code className="font-mono text-sm text-foreground">
                  /api/v1/repos
                </code>
              </>
            ) : (
              <code className="font-mono text-sm text-foreground">
                {base}/api/v1/repos
              </code>
            )}
            . Search and sort to find what you need.
          </p>
          {info?.id && (
            <div className="mt-4 inline-flex flex-wrap items-center gap-2">
              <span
                className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-strong"
                title={info.id}
              >
                NID {shortenId(info.id, 14, 6)}
              </span>
              <CopyButton value={info.id} label="Copy NID" />
              {info.state && (
                <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-strong">
                  state: <span className="text-foreground">{info.state}</span>
                </span>
              )}
            </div>
          )}
        </section>

        <section className="mx-auto mt-10 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
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
          <StatTile
            label="Public"
            value={publicCount}
            icon={<Globe2 size={16} />}
            tone="violet"
          />
          <StatTile
            label="Delegates"
            value={delegateSet.size}
            hint="distinct"
            icon={<ShieldCheck size={16} />}
            tone="success"
          />
        </section>

        {list.error && (
          <div
            role="alert"
            className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5"
          >
            <AlertTriangle size={18} className="mt-0.5 text-amber-300" />
            <div>
              <p className="text-sm font-medium text-amber-200">
                Couldn’t fetch the node’s repository list
              </p>
              <p className="mt-1 font-mono text-xs text-amber-100/80">
                {list.error}
              </p>
              <p className="mt-2 text-xs text-amber-100/70">
                The whole-node endpoint may be unavailable; you can still see your
                curated repositories on{" "}
                <Link href="/profile" className="underline">
                  the profile page
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {!list.error && repos.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted-strong">
              This node currently lists no repositories.
            </p>
            <p className="mt-2 text-xs text-muted">
              Some nodes return an empty <code className="font-mono">/api/v1/repos</code>{" "}
              even when individual repositories are seeded. Check your{" "}
              <Link href="/profile" className="underline">
                curated profile
              </Link>
              .
            </p>
          </div>
        )}

        <section className="mt-10">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
              {show === "pinned" ? "Pinned repositories" : "All repositories"}
            </h2>
            <ShowToggle
              current={show}
              totalCount={totalCount}
              pinnedCount={pinnedCount}
            />
          </header>

          {show === "pinned" && pinnedCount === 0 && (
            <div className="mb-4 rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted-strong">
              <p className="font-medium text-foreground">Nothing pinned yet</p>
              <p className="mt-1 text-muted">
                Pin a repository on your node so it shows up here:{" "}
                <code className="rounded bg-black/30 px-1 font-mono text-xs">
                  rad pin &lt;rid&gt;
                </code>
                . Pinning is a curation signal that other Radicle clients can use too.
              </p>
            </div>
          )}

          <RepoExplorer repos={repos} />
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
            <li className="ml-auto">
              <Link href="/profile" className="hover:text-foreground">
                ← Curated profile
              </Link>
            </li>
          </ul>
        </footer>
      </main>
    </div>
  );
}
