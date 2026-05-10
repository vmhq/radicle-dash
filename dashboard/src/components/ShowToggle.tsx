import Link from "next/link";
import { Pin, Stars } from "lucide-react";

export type ShowMode = "all" | "pinned";

type ShowToggleProps = {
  current: ShowMode;
  pinnedCount?: number;
  totalCount?: number;
};

export function ShowToggle({ current, pinnedCount, totalCount }: ShowToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter repositories"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs"
    >
      <ToggleLink
        active={current === "all"}
        href="/node?show=all"
        icon={<Stars size={13} />}
        label="All"
        count={totalCount}
      />
      <ToggleLink
        active={current === "pinned"}
        href="/node?show=pinned"
        icon={<Pin size={13} />}
        label="Pinned"
        count={pinnedCount}
      />
    </div>
  );
}

function ToggleLink({
  active,
  href,
  icon,
  label,
  count,
}: {
  active: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition " +
        (active
          ? "bg-background-subtle text-foreground"
          : "text-muted hover:text-foreground")
      }
    >
      {icon}
      {label}
      {typeof count === "number" && (
        <span
          className={
            "rounded-md px-1.5 py-0.5 text-[10px] tabular-nums " +
            (active
              ? "bg-surface text-muted-strong"
              : "bg-surface text-muted")
          }
        >
          {count}
        </span>
      )}
    </Link>
  );
}
