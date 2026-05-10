import Link from "next/link";
import { CircleDot } from "lucide-react";
import { getSiteMode } from "@/lib/env";

export function SiteHeader() {
  const mode = getSiteMode();
  const homeHref = mode === "personal" ? "/profile" : "/";

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href={homeHref}
          className="group inline-flex items-center gap-2.5 text-sm font-medium tracking-tight"
        >
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-accent-foreground"
            style={{
              background:
                "linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 60%, #6e56cf) 100%)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.06), 0 6px 18px -8px rgba(180,244,129,0.55)",
            }}
            aria-hidden
          >
            <CircleDot size={15} strokeWidth={2.4} />
          </span>
          <span className="text-foreground/90 group-hover:text-foreground">
            radprofile.xyz
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {mode === "marketing" && (
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-surface hover:text-foreground"
            >
              About
            </Link>
          )}
          <Link
            href="/profile"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-surface hover:text-foreground"
          >
            Profile
          </Link>
          <Link
            href="/node"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-surface hover:text-foreground"
          >
            Node
          </Link>
        </nav>
      </div>
    </header>
  );
}
