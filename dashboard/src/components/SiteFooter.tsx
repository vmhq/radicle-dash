import Link from "next/link";
import { CircleDot, Code2, ExternalLink, Globe2 } from "lucide-react";

/** When `NEXT_PUBLIC_SOURCE_URL` is unset, link here (this project on Radicle Explorer). */
const DEFAULT_SOURCE_URL =
  "https://radicle.network/nodes/iris.radicle.network/rad%3Az2v11Gpk44QqZ7zy8W9fva8wXXDBi";

export function SiteFooter() {
  const sourceUrl =
    process.env.NEXT_PUBLIC_SOURCE_URL?.trim() || DEFAULT_SOURCE_URL;
  return (
    <footer className="mt-24 border-t border-border bg-background-subtle/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium tracking-tight"
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-accent-foreground"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 60%, #6e56cf) 100%)",
              }}
              aria-hidden
            >
              <CircleDot size={13} strokeWidth={2.4} />
            </span>
            radprofile.xyz
          </Link>
          <p className="mt-2 max-w-md text-xs text-muted">
            Open source · Apache-2.0 · Built with Next.js. No accounts, no analytics,
            no proprietary backend.
          </p>
        </div>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <li>
            <Link href="/profile" className="hover:text-foreground">
              Live demo
            </Link>
          </li>
          <li>
            <Link href="/node" className="hover:text-foreground">
              Whole node
            </Link>
          </li>
          <li>
            <a
              href="https://radicle.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Globe2 size={11} />
              radicle.xyz
              <ExternalLink size={10} className="opacity-70" />
            </a>
          </li>
          <li>
            <a
              href="https://docs.radicle.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Radicle docs
              <ExternalLink size={10} className="opacity-70" />
            </a>
          </li>
          <li>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
              aria-label="Source on Radicle"
              title="View repository on Radicle Explorer"
            >
              <Code2 size={11} />
              Source
              <ExternalLink size={10} className="opacity-70" />
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
