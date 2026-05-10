import type { ReactNode } from "react";

type Tone = "default" | "accent" | "info" | "violet" | "success" | "warn";

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
};

const toneClass: Record<Tone, string> = {
  default: "text-muted-strong bg-background-subtle",
  accent: "text-accent bg-accent/10",
  info: "text-sky-300 bg-sky-500/10",
  violet: "text-violet-300 bg-violet-500/12",
  success: "text-emerald-300 bg-emerald-500/10",
  warn: "text-amber-300 bg-amber-500/10",
};

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: StatTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 card-ring">
      {icon && (
        <span
          aria-hidden
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border ${toneClass[tone]}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        <p className="flex items-baseline gap-1.5 text-xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
          {value}
          {hint && (
            <span className="text-[11px] font-normal tracking-normal text-muted">
              {hint}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
