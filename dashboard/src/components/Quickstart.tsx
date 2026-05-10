import { CopyButton } from "./CopyButton";

const RUN_BLOCK = `git clone <repo-url> radprofile
cd radprofile/dashboard
cp .env.example .env.local
npm install
npm run dev                  # http://localhost:3100`;

const CONFIG_BLOCK = `# .env.local — make it yours
RADICLE_HTTP_BASE=http://127.0.0.1:8090
RADICLE_PROFILE_ALIAS=your_alias
RADICLE_DELEGATE_DID=did:key:z6Mk...
RADICLE_REPO_IDS=\\
  rad:zAbCd...,\\
  rad:zEfGh...`;

type QuickstartProps = {
  title?: string;
  description?: string;
};

export function Quickstart({
  title = "Quickstart",
  description = "Get it running, then point it at your repos.",
}: QuickstartProps) {
  return (
    <section>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Quickstart
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-strong">{description}</p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CodeCard label="1 · Run it" code={RUN_BLOCK} />
        <CodeCard label="2 · Make it yours" code={CONFIG_BLOCK} />
      </div>
    </section>
  );
}

function CodeCard({ label, code }: { label: string; code: string }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface card-ring">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <CopyButton value={code} label="Copy" />
      </header>
      <pre className="m-0 overflow-x-auto p-4 text-[12px] leading-relaxed text-muted-strong">
        <code className="font-mono">{code}</code>
      </pre>
    </article>
  );
}
