import * as XLSX from "xlsx";

// ---------- Parsers ----------

export function parseDate(val: any): string | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const str = String(val).trim();
  const br = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

export function parseNumber(val: any): number | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseString(val: any): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

// ---------- Status maps ----------

const PROPOSAL_STATUS_MAP: Record<string, string> = {
  rascunho: "rascunho",
  "em elaboração": "em_elaboracao",
  "em elaboracao": "em_elaboracao",
  em_elaboracao: "em_elaboracao",
  enviada: "enviada",
  "em análise": "em_analise",
  "em analise": "em_analise",
  em_analise: "em_analise",
  "em negociação": "em_negociacao",
  "em negociacao": "em_negociacao",
  em_negociacao: "em_negociacao",
  aprovada: "aprovada",
  ganha: "ganha",
  rejeitada: "rejeitada",
  perdida: "perdida",
};

const PROJECT_STATUS_MAP: Record<string, string> = {
  planejamento: "planejamento",
  "em andamento": "em_andamento",
  em_andamento: "em_andamento",
  andamento: "em_andamento",
  pausado: "pausado",
  pausa: "pausado",
  concluido: "concluido",
  "concluído": "concluido",
  finalizado: "concluido",
  cancelado: "cancelado",
};

export function normalizeProposalStatus(val: any, fallback = "rascunho"): string {
  const s = parseString(val);
  if (!s) return fallback;
  return PROPOSAL_STATUS_MAP[s.toLowerCase()] ?? fallback;
}

export function normalizeProjectStatus(val: any, fallback = "em_andamento"): string {
  const s = parseString(val);
  if (!s) return fallback;
  return PROJECT_STATUS_MAP[s.toLowerCase()] ?? fallback;
}

// ---------- Column matcher ----------

export function makeColumnGetter(row: Record<string, any>) {
  const lowered = Object.keys(row).map((k) => ({ orig: k, low: k.toLowerCase().trim() }));
  return (keys: string[]): any => {
    for (const { orig, low } of lowered) {
      if (keys.some((k) => low.includes(k))) return row[orig];
    }
    return undefined;
  };
}

// ---------- Lookup maps ----------

export function buildLowerMap<T extends { id: string; name: string }>(items: T[] | null | undefined): Map<string, string> {
  return new Map((items ?? []).map((i) => [i.name.toLowerCase().trim(), i.id]));
}

export function matchByName(map: Map<string, string>, name: any): string | null {
  const s = parseString(name);
  if (!s) return null;
  return map.get(s.toLowerCase()) ?? null;
}

export function splitTeamNames(val: any): string[] {
  const s = parseString(val);
  if (!s) return [];
  return s.split(/[,;\/|]/).map((x) => x.trim()).filter(Boolean);
}

// ---------- Workbook reader ----------

export function readWorkbookFromArrayBuffer(buf: ArrayBuffer): Record<string, any[]> {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: true });
  const out: Record<string, any[]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<any>(wb.Sheets[name]);
  }
  return out;
}

export function findSheet(sheets: Record<string, any[]>, candidates: string[]): any[] | null {
  const keys = Object.keys(sheets);
  for (const c of candidates) {
    const found = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
    if (found) return sheets[found];
  }
  return null;
}
