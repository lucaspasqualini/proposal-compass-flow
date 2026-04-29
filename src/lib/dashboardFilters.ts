// Helpers para o filtro de período do Dashboard.

export type PeriodKey =
  | "mes_atual"
  | "mes_anterior"
  | "ultimos_3"
  | "ultimos_6"
  | "ano_atual"
  | "ano_anterior"
  | "tudo"
  | `mes:${string}` // legado: "mes:2026-04"
  | `mes_ano:${string}` // "mes_ano:2026-04" (mês X do ano Y)
  | `ano:${string}` // "ano:2026" (ano inteiro)
  | `mes_all:${string}` // "mes_all:04" (mês X de todos os anos)
  | `custom:${string}`; // "custom:2026-01-15_2026-04-20"

export interface PeriodRange {
  start: Date | null;
  end: Date | null;
  prevStart: Date | null;
  prevEnd: Date | null;
  label: string;
}

const MONTH_NAMES_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(year: number, monthIdx: number): Date {
  return new Date(year, monthIdx, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, monthIdx: number): Date {
  return new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
}

function fmtRange(start: Date, end: Date): string {
  const f = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${f(start)} → ${f(end)}`;
}

export function getPeriodRange(period: PeriodKey): PeriodRange {
  const now = new Date();

  if (period === "tudo") {
    return {
      start: null,
      end: endOfDay(now),
      prevStart: null,
      prevEnd: null,
      label: "Todo o período",
    };
  }

  if (period === "mes_atual") {
    const start = startOfMonth(now.getFullYear(), now.getMonth());
    const end = endOfDay(now);
    const prevStart = startOfMonth(now.getFullYear(), now.getMonth() - 1);
    const prevEnd = endOfMonth(now.getFullYear(), now.getMonth() - 1);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  if (period === "mes_anterior") {
    const start = startOfMonth(now.getFullYear(), now.getMonth() - 1);
    const end = endOfMonth(now.getFullYear(), now.getMonth() - 1);
    const prevStart = startOfMonth(now.getFullYear(), now.getMonth() - 2);
    const prevEnd = endOfMonth(now.getFullYear(), now.getMonth() - 2);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  if (period === "ultimos_3") {
    const end = endOfDay(now);
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd);
    prevStart.setMonth(prevStart.getMonth() - 3);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  if (period === "ultimos_6") {
    const end = endOfDay(now);
    const start = new Date(now);
    start.setMonth(start.getMonth() - 6);
    start.setHours(0, 0, 0, 0);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd);
    prevStart.setMonth(prevStart.getMonth() - 6);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  if (period === "ano_atual") {
    const start = startOfMonth(now.getFullYear(), 0);
    const end = endOfDay(now);
    const prevStart = startOfMonth(now.getFullYear() - 1, 0);
    const prevEnd = endOfMonth(now.getFullYear() - 1, 11);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  if (period === "ano_anterior") {
    const start = startOfMonth(now.getFullYear() - 1, 0);
    const end = endOfMonth(now.getFullYear() - 1, 11);
    const prevStart = startOfMonth(now.getFullYear() - 2, 0);
    const prevEnd = endOfMonth(now.getFullYear() - 2, 11);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  // Mês específico: "mes:YYYY-MM"
  if (period.startsWith("mes:")) {
    const [y, m] = period.slice(4).split("-").map(Number);
    if (!y || !m) {
      return { start: null, end: endOfDay(now), prevStart: null, prevEnd: null, label: "—" };
    }
    const start = startOfMonth(y, m - 1);
    const end = endOfMonth(y, m - 1);
    const prevStart = startOfMonth(y, m - 2);
    const prevEnd = endOfMonth(y, m - 2);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  // Mês de um ano específico: "mes_ano:YYYY-MM"
  if (period.startsWith("mes_ano:")) {
    const [y, m] = period.slice(8).split("-").map(Number);
    if (!y || !m) {
      return { start: null, end: endOfDay(now), prevStart: null, prevEnd: null, label: "—" };
    }
    const start = startOfMonth(y, m - 1);
    const end = endOfMonth(y, m - 1);
    const prevStart = startOfMonth(y, m - 2);
    const prevEnd = endOfMonth(y, m - 2);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  // Ano inteiro: "ano:YYYY"
  if (period.startsWith("ano:")) {
    const y = Number(period.slice(4));
    if (!y) {
      return { start: null, end: endOfDay(now), prevStart: null, prevEnd: null, label: "—" };
    }
    const start = startOfMonth(y, 0);
    const end = endOfMonth(y, 11);
    const prevStart = startOfMonth(y - 1, 0);
    const prevEnd = endOfMonth(y - 1, 11);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  // Mês X de todos os anos: "mes_all:MM" — usamos range "tudo" mas marcamos via filterByMonth
  if (period.startsWith("mes_all:")) {
    const m = Number(period.slice(8));
    const monthName = MONTH_NAMES_PT[m - 1] ?? "—";
    return {
      start: null,
      end: endOfDay(now),
      prevStart: null,
      prevEnd: null,
      label: `${monthName} (todos os anos)`,
    };
  }

  // Período customizado: "custom:YYYY-MM-DD_YYYY-MM-DD"
  if (period.startsWith("custom:")) {
    const [s, e] = period.slice(7).split("_");
    if (!s || !e) {
      return { start: null, end: endOfDay(now), prevStart: null, prevEnd: null, label: "—" };
    }
    const start = new Date(`${s}T00:00:00`);
    const end = new Date(`${e}T23:59:59.999`);
    const spanMs = +end - +start;
    const prevEnd = new Date(+start - 1);
    const prevStart = new Date(+prevEnd - spanMs);
    return { start, end, prevStart, prevEnd, label: fmtRange(start, end) };
  }

  return { start: null, end: endOfDay(now), prevStart: null, prevEnd: null, label: "—" };
}

/** Filtro adicional: se period for "mes_all:MM", restringe a esse mês do ano. */
export function passesMonthFilter(period: PeriodKey, dateStr: string | null | undefined): boolean {
  if (!period.startsWith("mes_all:")) return true;
  if (!dateStr) return false;
  const m = Number(period.slice(8));
  const d = new Date(dateStr);
  return !isNaN(+d) && d.getMonth() + 1 === m;
}

/** Lista de anos presentes nos dados (mais recente primeiro). Sempre inclui o ano atual. */
export function buildYearOptions(dates: (string | null | undefined)[]): number[] {
  const set = new Set<number>();
  for (const d of dates) {
    if (!d) continue;
    const dt = new Date(d);
    if (isNaN(+dt)) continue;
    set.add(dt.getFullYear());
  }
  set.add(new Date().getFullYear());
  return Array.from(set).sort((a, b) => b - a);
}

export const MONTHS_PT_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function inRange(
  dateStr: string | null | undefined,
  start: Date | null,
  end: Date | null
): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export interface MonthOption {
  key: string; // "YYYY-MM"
  label: string; // "abr/2026"
}

/** Gera opções de meses específicos a partir das datas vistas nos dados. */
export function buildMonthOptions(dates: (string | null | undefined)[]): MonthOption[] {
  const set = new Set<string>();
  for (const d of dates) {
    if (!d) continue;
    const dt = new Date(d);
    if (isNaN(+dt)) continue;
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    set.add(k);
  }
  // Sempre incluir o mês atual
  const now = new Date();
  set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  return Array.from(set)
    .sort((a, b) => (a < b ? 1 : -1)) // mais recente primeiro
    .map((k) => {
      const [y, m] = k.split("-").map(Number);
      return {
        key: k,
        label: `${MONTH_NAMES_PT[m - 1]}/${y}`,
      };
    });
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(d: Date): string {
  return `${MONTH_NAMES_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}
