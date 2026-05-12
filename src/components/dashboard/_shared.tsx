import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  PeriodKey,
  getPeriodRange,
  inRange,
  passesMonthFilter,
} from "@/lib/dashboardFilters";

export const ALL = "all";

export const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

// Hook compartilhado para o filtro de período do dashboard
export function useDashboardPeriod() {
  const [period, setPeriod] = usePersistedState<PeriodKey>(
    "dashboard:period",
    "mes_atual"
  );
  const range = useMemo(() => getPeriodRange(period), [period]);
  const inCurrent = (d?: string | null) =>
    inRange(d, range.start, range.end) && passesMonthFilter(period, d);
  const inPrev = (d?: string | null) =>
    range.prevStart && range.prevEnd
      ? inRange(d, range.prevStart, range.prevEnd)
      : false;
  return { period, setPeriod, range, inCurrent, inPrev };
}

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  accent,
  onClick,
  hint,
  deltaSuffix = "%",
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  onClick?: () => void;
  hint?: string;
  deltaSuffix?: string;
}) {
  const deltaColor =
    delta == null
      ? "text-muted-foreground"
      : delta > 0
      ? "text-success"
      : delta < 0
      ? "text-destructive"
      : "text-muted-foreground";
  const DeltaIcon =
    delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        !onClick && "cursor-default"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          <DeltaIcon className={cn("h-3 w-3", deltaColor)} />
          <span className={cn("text-xs font-medium", deltaColor)}>
            {delta == null
              ? "—"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${deltaSuffix}`}
          </span>
          <span className="text-xs text-muted-foreground">
            {hint ?? "vs. período anterior"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Heatmap({
  cells,
  max,
}: {
  cells: { date: Date; count: number; key: string }[];
  max: number;
}) {
  const [hover, setHover] = useState<{ date: Date; count: number } | null>(null);
  if (cells.length === 0)
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  const weeks: ({ date: Date; count: number; key: string } | null)[][] = [];
  let currentWeek: ({ date: Date; count: number; key: string } | null)[] = new Array(7).fill(null);
  for (const c of cells) {
    const dow = c.date.getDay();
    currentWeek[dow] = c;
    if (dow === 6) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }
  if (currentWeek.some((c) => c !== null)) weeks.push(currentWeek);

  const intensity = (count: number) => {
    if (count === 0) return "bg-muted";
    const ratio = count / max;
    if (ratio < 0.25) return "bg-primary/20";
    if (ratio < 0.5) return "bg-primary/40";
    if (ratio < 0.75) return "bg-primary/65";
    return "bg-primary";
  };

  const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto">
        <div className="flex flex-col gap-1 pr-1 text-[10px] text-muted-foreground">
          {dayLabels.map((d, i) => (
            <div key={i} className="h-3.5 flex items-center">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => (
              <div
                key={di}
                onMouseEnter={() =>
                  cell && setHover({ date: cell.date, count: cell.count })
                }
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "h-3.5 w-3.5 rounded-sm transition-all",
                  cell ? intensity(cell.count) : "bg-transparent",
                  cell && "hover:ring-2 hover:ring-primary/50"
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {hover
            ? `${hover.date.toLocaleDateString("pt-BR")}: ${hover.count} proposta(s)`
            : "Passe o mouse sobre um dia"}
        </div>
        <div className="flex items-center gap-1">
          <span>Menos</span>
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <div className="h-3 w-3 rounded-sm bg-primary/20" />
          <div className="h-3 w-3 rounded-sm bg-primary/40" />
          <div className="h-3 w-3 rounded-sm bg-primary/65" />
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
