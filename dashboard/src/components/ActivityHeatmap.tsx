import { heatmapCommitUnixSeconds, type ActivityEntry } from "@/lib/radicle";
import { formatActivityHistoryLabel } from "@/lib/env";
import { HeatmapScroller } from "@/components/HeatmapScroller";

type ActivityHeatmapProps = {
  entries: ActivityEntry[];
  /**
   * Visible heatmap width in weeks (typically `getActivityHeatmapWeeks(...)`).
   * Default 53 = GitHub-style 1-year grid.
   */
  weeks?: number;
  /**
   * Activity *fetch* window in days (kept for prop-API compatibility with
   * `/profile`; the heatmap visible span is driven by `weeks`).
   */
  historyDays?: number;
};

const CELL = 11;
const GAP = 3;
const ROW_LABEL_WIDTH = 28;
const MONTH_LABEL_HEIGHT = 14;

const BUCKET_DEMO = [0, 1, 2, 4, 8] as const;

export function ActivityHeatmap({
  entries,
  weeks = 53,
}: ActivityHeatmapProps) {
  const msDay = 86400000;
  const safeWeeks =
    Number.isFinite(weeks) && weeks > 0 ? Math.min(Math.max(weeks, 1), 530) : 53;

  const today = startOfUtcDay(new Date());

  let maxEntryDay: Date | null = null;
  for (const e of entries) {
    const t = heatmapCommitUnixSeconds(e.commit);
    if (t == null || !Number.isFinite(t)) continue;
    const d = startOfUtcDay(new Date(t * 1000));
    if (!maxEntryDay || d > maxEntryDay) maxEntryDay = d;
  }

  /**
   * Anchor the right edge to **today** so today's commits sit on the rightmost
   * column (not pushed forward to the upcoming Saturday with empty cells after).
   * If the latest commit is somehow newer than `today` (clock skew), use it.
   */
  let rangeEnd = new Date(today);
  if (maxEntryDay && maxEntryDay > rangeEnd) rangeEnd = maxEntryDay;

  const maxGridDays = 530 * 7;
  const visibleDays = Math.min(Math.max(safeWeeks * 7, 7), maxGridDays);

  const rangeStart = new Date(rangeEnd);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (visibleDays - 1));

  const days =
    Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / msDay) + 1;
  const gridWeeks = Math.max(1, Math.ceil(days / 7));

  // Bucket commits by UTC calendar day.
  const counts = new Map<string, number>();
  for (const e of entries) {
    const t = heatmapCommitUnixSeconds(e.commit);
    if (t == null || !Number.isFinite(t)) continue;
    const d = startOfUtcDay(new Date(t * 1000));
    if (d < rangeStart || d > rangeEnd) continue;
    const key = utcDayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  // Build cells [gridWeeks][7] — grid spans at least all entry days + env window.
  const grid: { date: Date; key: string; count: number }[][] = [];
  for (let w = 0; w < gridWeeks; w++) {
    const week: { date: Date; key: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(rangeStart.getTime());
      date.setUTCDate(rangeStart.getUTCDate() + w * 7 + d);
      const key = utcDayKey(date);
      week.push({ date, key, count: counts.get(key) ?? 0 });
    }
    grid.push(week);
  }

  // First column where each new month begins → x-position for label.
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < gridWeeks; w++) {
    const m = grid[w][0].date.getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        x: ROW_LABEL_WIDTH + w * (CELL + GAP),
        label: grid[w][0].date.toLocaleString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
      });
      lastMonth = m;
    }
  }

  const width = ROW_LABEL_WIDTH + gridWeeks * (CELL + GAP);
  const height = MONTH_LABEL_HEIGHT + 7 * (CELL + GAP);

  const visibleWeeks = Math.max(1, Math.round(visibleDays / 7));
  const periodLabel =
    visibleWeeks >= 52
      ? formatActivityHistoryLabel(visibleWeeks * 7)
      : `${visibleWeeks} week${visibleWeeks === 1 ? "" : "s"}`;

  return (
    <section className="flex h-[224px] flex-col rounded-2xl border border-border bg-surface p-6 card-ring">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Contribution heatmap
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">
            {total.toLocaleString()} commit{total === 1 ? "" : "s"} · last{" "}
            {periodLabel}
          </h3>
        </div>
        <ScaleLegend />
      </header>

      <HeatmapScroller>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${total} commits over the past ${periodLabel}`}
          style={{ display: "block" }}
        >
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={m.x}
              y={MONTH_LABEL_HEIGHT - 4}
              fontSize={9}
              fill="var(--muted)"
              fontFamily="var(--font-sans), sans-serif"
            >
              {m.label}
            </text>
          ))}

          {[1, 3, 5].map((row) => (
            <text
              key={row}
              x={0}
              y={MONTH_LABEL_HEIGHT + row * (CELL + GAP) + CELL - 1}
              fontSize={9}
              fill="var(--muted)"
              fontFamily="var(--font-sans), sans-serif"
            >
              {row === 1 ? "Mon" : row === 3 ? "Wed" : "Fri"}
            </text>
          ))}

          {grid.map((week, wIdx) =>
            week.map((cell, dIdx) => (
              <rect
                key={`${wIdx}-${dIdx}`}
                x={ROW_LABEL_WIDTH + wIdx * (CELL + GAP)}
                y={MONTH_LABEL_HEIGHT + dIdx * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                ry={2}
                fill={cellFill(cell.count)}
              >
                <title>{`${cell.count} commit${cell.count === 1 ? "" : "s"} · ${humanDateUtc(cell.date)}`}</title>
              </rect>
            )),
          )}
        </svg>
      </HeatmapScroller>
    </section>
  );
}

function ScaleLegend() {
  return (
    <div className="hidden items-center gap-1.5 text-[10px] text-muted sm:inline-flex">
      <span>Less</span>
      {BUCKET_DEMO.map((c) => (
        <span
          key={c}
          aria-hidden
          className="block rounded-[2px]"
          style={{ width: 11, height: 11, backgroundColor: cellFill(c) }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

function cellFill(count: number): string {
  if (count === 0) return "rgba(255, 255, 255, 0.045)";
  if (count === 1) return "color-mix(in oklab, var(--accent) 36%, transparent)";
  if (count <= 3) return "color-mix(in oklab, var(--accent) 45%, transparent)";
  if (count <= 7) return "color-mix(in oklab, var(--accent) 70%, transparent)";
  return "var(--accent)";
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function utcDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function humanDateUtc(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
