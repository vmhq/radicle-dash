import type { ReactNode } from "react";

type BrowserFrameProps = {
  url: string;
  children: ReactNode;
  className?: string;
};

export function BrowserFrame({ url, children, className }: BrowserFrameProps) {
  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-border bg-background-subtle card-ring " +
        (className ?? "")
      }
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="ml-2 flex-1 truncate rounded-md border border-border bg-background-subtle px-2.5 py-1 text-center font-mono text-[11px] text-muted">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
