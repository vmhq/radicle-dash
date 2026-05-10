import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Code2,
  ExternalLink,
  KeyRound,
  Network,
  PlugZap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Backdrop } from "@/components/Backdrop";
import { BrowserFrame } from "@/components/BrowserFrame";
import { Faq } from "@/components/Faq";
import { Quickstart } from "@/components/Quickstart";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSiteMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function Home() {
  if (getSiteMode() === "personal") {
    redirect("/profile");
  }
  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 pt-20">
        {/* Hero */}
        <section className="animate-fade-up text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-strong">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
              aria-hidden
              style={{ boxShadow: "0 0 0 3px rgba(180,244,129,0.18)" }}
            />
            Open source · self-hosted
          </p>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            A beautiful public face for your
            <span
              className="ml-2 inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, var(--accent) 0%, #a4f1ff 60%, #c8a9ff 100%)",
              }}
            >
              Radicle node
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-strong">
            An open-source Next.js dashboard for{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-base">
              radicle-httpd
            </code>
            . Point it at your local seed and ship a polished public profile.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/profile"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
              style={{ boxShadow: "0 18px 50px -22px rgba(180,244,129,0.55)" }}
            >
              View live demo
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="https://radicle.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-muted-strong hover:border-border-strong hover:text-foreground"
            >
              About Radicle
              <ExternalLink size={14} className="opacity-70" />
            </a>
          </div>
        </section>

        {/* Live preview */}
        <section className="mt-20">
          <header className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              See it live
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              The same dashboard, running right here.
            </h2>
            <p className="mt-2 text-sm text-muted-strong">
              The frame below is the actual{" "}
              <code className="font-mono text-foreground">/profile</code> page
              served by this node. No screenshot.
            </p>
          </header>

          <div className="mt-8">
            <BrowserFrame url="https://radprofile.xyz/profile">
              <iframe
                src="/profile"
                title="Live profile preview"
                loading="lazy"
                className="block h-[640px] w-full border-0 bg-background"
              />
            </BrowserFrame>
            <p className="mt-3 text-center text-xs text-muted">
              <Link href="/profile" className="hover:text-foreground">
                Open full size →
              </Link>
            </p>
          </div>
        </section>

        {/* Why */}
        <section className="mt-24">
          <header className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Sovereign by default. Familiar by design.
            </h2>
          </header>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<KeyRound size={18} />}
              title="Your data, your node"
              body="No SaaS account, no API key, no hosted backend. The dashboard talks to a Radicle daemon you control."
            />
            <FeatureCard
              icon={<PlugZap size={18} />}
              title="Bring your own host"
              body="Laptop, home server, VPS. Anywhere Node.js runs. Caddy + Cloudflare Tunnel publish it for free."
            />
            <FeatureCard
              icon={<Sparkles size={18} />}
              title="Modern dev hub feel"
              body="Generative avatar, search, sort, copy-as-clone. Familiar to anyone who's used a code-hosting profile."
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Network size={18} />}
              title="Per-RID resilient"
              body="Works even when /repos returns empty. Configure the RIDs you care about and they show up."
            />
            <FeatureCard
              icon={<Code2 size={18} />}
              title="Plain Next.js"
              body="App Router, Tailwind v4, lucide-react. Tweak the components, theme, fonts. No proprietary primitives."
            />
            <FeatureCard
              icon={<ShieldCheck size={18} />}
              title="No telemetry, no SaaS"
              body="Zero analytics, zero third-party scripts, zero hosted backend. Just static HTML rendered from your node."
            />
          </div>
        </section>

        {/* Quickstart */}
        <section className="mt-24">
          <Quickstart />
        </section>

        {/* Self-host card (existing detailed steps) */}
        <section className="mt-24 overflow-hidden rounded-2xl border border-border bg-surface card-ring">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="p-8">
              <h2 className="text-xl font-semibold tracking-tight">
                Self-host in three steps
              </h2>
              <p className="mt-2 text-sm text-muted-strong">
                Bring your own node — point this at it.
              </p>
              <ol className="mt-6 space-y-4 text-sm">
                <Step n={1} title="Run a Radicle node + HTTP daemon">
                  <code className="font-mono text-xs text-muted-strong">
                    rad node start &amp;&amp; radicle-httpd --listen 0.0.0.0:8090
                  </code>
                </Step>
                <Step n={2} title="Point the dashboard at it">
                  Set{" "}
                  <code className="rounded bg-background-subtle px-1.5 py-0.5 font-mono text-xs">
                    RADICLE_HTTP_BASE
                  </code>{" "}
                  and an optional{" "}
                  <code className="rounded bg-background-subtle px-1.5 py-0.5 font-mono text-xs">
                    RADICLE_REPO_IDS
                  </code>
                  .
                </Step>
                <Step n={3} title="Build & start">
                  <code className="font-mono text-xs text-muted-strong">
                    npm run build &amp;&amp; npm start
                  </code>
                </Step>
              </ol>
            </div>
            <div
              className="relative hidden md:block"
              style={{
                background:
                  "linear-gradient(135deg, rgba(180,244,129,0.08) 0%, rgba(110,86,207,0.10) 100%)",
              }}
            >
              <pre className="m-0 h-full overflow-auto p-8 text-[12px] leading-relaxed text-muted-strong">
                <code className="font-mono">{`# .env.local
RADICLE_HTTP_BASE=http://127.0.0.1:8090
RADICLE_PROFILE_ALIAS=your_alias
RADICLE_DELEGATE_DID=did:key:z6Mk...
RADICLE_REPO_IDS=\\
  rad:zAbCd...,\\
  rad:zEfGh...,\\
  rad:zIjKl...`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-24">
          <Faq />
        </section>

        {/* Closing CTA */}
        <section className="mt-24 rounded-2xl border border-border bg-surface px-6 py-12 text-center card-ring">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to publish your node?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-strong">
            Clone it, point at <code className="font-mono">radicle-httpd</code>,
            and you’re live in about two minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-strong"
              style={{ boxShadow: "0 18px 50px -22px rgba(180,244,129,0.55)" }}
            >
              View live demo
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/node"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background-subtle px-5 py-2.5 text-sm font-medium text-muted-strong hover:border-border-strong hover:text-foreground"
            >
              Browse whole node
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-6 card-ring">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background-subtle text-accent">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-strong">{body}</p>
    </article>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background-subtle text-[11px] font-semibold text-muted-strong">
        {n}
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-muted-strong">{children}</p>
      </div>
    </li>
  );
}
