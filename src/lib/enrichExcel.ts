import * as XLSX from "xlsx";

export type SheetParsed = {
  headers: string[];
  rows: any[][];
  cnpjColumnIndex: number;
};

function norm(s: any): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function looksLikeCnpj(v: any): boolean {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 14;
}

export function parseSheet(buf: ArrayBuffer): SheetParsed {
  const wb = XLSX.read(buf, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  if (!aoa.length) return { headers: [], rows: [], cnpjColumnIndex: -1 };

  const headers = (aoa[0] || []).map((h) => String(h ?? ""));
  const rows = aoa.slice(1).filter((r) => Array.isArray(r) && r.some((c) => c != null && c !== ""));

  // 1. Header-based detection
  let idx = headers.findIndex((h) => /CNPJ/.test(norm(h)));

  // 2. Fallback: scan first 20 rows
  if (idx === -1) {
    const maxCols = Math.max(...rows.slice(0, 20).map((r) => r.length), 0);
    const scores: number[] = new Array(maxCols).fill(0);
    for (const r of rows.slice(0, 20)) {
      for (let c = 0; c < maxCols; c++) {
        if (looksLikeCnpj(r[c])) scores[c]++;
      }
    }
    let best = -1;
    let bestScore = 0;
    scores.forEach((s, i) => {
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    });
    if (bestScore >= 1) idx = best;
  }

  return { headers, rows, cnpjColumnIndex: idx };
}

export function cleanCnpj(v: any): string {
  return String(v ?? "").replace(/\D/g, "");
}

export type EnrichedRow = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae: string;
  industria: string;
  site: string | null;
  linkedin: string | null;
  status: "pending" | "ok" | "partial" | "error";
  errorMsg?: string;
};

export function exportEnriched(
  originalHeaders: string[],
  originalRows: any[][],
  cnpjColumnIndex: number,
  enrichedByCnpj: Map<string, EnrichedRow>,
  filename = "cnpjs_enriquecidos.xlsx",
) {
  const newHeaders = [
    ...originalHeaders,
    "Razão Social",
    "Nome Fantasia",
    "CNAE",
    "Indústria",
    "Site",
    "LinkedIn",
  ];
  const newRows = originalRows.map((r) => {
    const c = cleanCnpj(r[cnpjColumnIndex]);
    const e = enrichedByCnpj.get(c);
    return [
      ...r,
      e?.razao_social ?? "",
      e?.nome_fantasia ?? "",
      e?.cnae ?? "",
      e?.industria ?? "",
      e?.site ?? "",
      e?.linkedin ?? "",
    ];
  });
  const aoa = [newHeaders, ...newRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Enriquecido");
  XLSX.writeFile(wb, filename);
}
