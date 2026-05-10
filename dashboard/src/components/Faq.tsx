import { ChevronDown } from "lucide-react";

const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How is this different from Radicle Explorer?",
    a: (
      <>
        Explorer is great for browsing one repository at a time on a shared seed
        (<code className="font-mono">radicle.network</code>). This dashboard is your{" "}
        <strong>personal</strong> homepage on the network: a curated profile of
        your repos, plus a whole-node view that respects pinning and search. Both
        read the same JSON API, so they’re complementary, not competing.
      </>
    ),
  },
  {
    q: "Do I need a public IP or a domain?",
    a: (
      <>
        No. For local-only use, just <code className="font-mono">npm run dev</code>{" "}
        and visit <code className="font-mono">localhost</code>. To make it public,
        use Cloudflare Tunnel (free, no port-forward) or open ports 80/443 on your
        router. See the project repo’s{" "}
        <code className="font-mono">infra/PUBLISH_WITH_CLOUDFLARE.md</code>.
      </>
    ),
  },
  {
    q: "Can I host this without running my own Radicle node?",
    a: (
      <>
        Yes — point <code className="font-mono">RADICLE_HTTP_BASE</code> at any
        reachable <code className="font-mono">radicle-httpd</code>. You give up
        sovereignty (you’re trusting that node’s data), but you can stand up a
        profile in minutes against e.g. a friend’s seed.
      </>
    ),
  },
  {
    q: "How do I update which repos appear on /profile?",
    a: (
      <>
        Set <code className="font-mono">RADICLE_REPO_IDS</code> in your env to a
        comma-separated list of RIDs, or edit{" "}
        <code className="font-mono">src/lib/profileRepos.ts</code> and redeploy.
        The page fetches each one in parallel from{" "}
        <code className="font-mono">/api/v1/repos/&lt;rid&gt;</code>.
      </>
    ),
  },
  {
    q: "Why is /node empty even though I’ve seeded repositories?",
    a: (
      <>
        <code className="font-mono">radicle-httpd</code> defaults{" "}
        <code className="font-mono">/api/v1/repos</code> to{" "}
        <code className="font-mono">show=pinned</code>. The dashboard queries{" "}
        <code className="font-mono">show=all</code> by default, but you can
        toggle to <code className="font-mono">Pinned</code> via the segmented
        control. To curate, run{" "}
        <code className="font-mono">rad pin &lt;rid&gt;</code> on your node.
      </>
    ),
  },
  {
    q: "What does it cost to run?",
    a: (
      <>
        $0/month for the software (open source). Hosting cost is just your
        electricity if you self-host on a Mac/Pi/NUC, plus ~$10/yr per domain.
        No usage-based billing, no surprise charges, no SaaS account.
      </>
    ),
  },
];

export function Faq() {
  return (
    <section>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          FAQ
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Common questions
        </h2>
      </header>

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface card-ring">
        {ITEMS.map((item, i) => (
          <details
            key={i}
            className="group p-5 transition-colors open:bg-surface-strong"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <span className="text-base font-medium tracking-tight">
                {item.q}
              </span>
              <ChevronDown
                size={16}
                aria-hidden
                className="shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-muted-strong">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
