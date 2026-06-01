import * as XLSX from "xlsx";

export type SheetRow = {
  rowIndex: number; // 1-based row in spreadsheet (after header)
  os: string;
  parcelaIndex: number | null; // 0-based
  parcelaRaw: string;
  due_date: string | null;
  invoice_date: string | null;
  paid_at: string | null;
  previsao_nf: string | null;
  status: string | null;
  nfe_number: string | null;
};

export type Receivable = {
  id: string;
  proposal_id: string;
  parcela_index: number;
  status: string;
  due_date: string | null;
  invoice_date: string | null;
  paid_at: string | null;
  previsao_nf: string | null;
  nfe_number: string | null;
  proposals?: { proposal_number?: string | null } | null;
};

export type FieldDiff = {
  field: keyof Receivable;
  before: any;
  after: any;
};

export type ResolvedRow = {
  source: SheetRow;
  kind: "exact" | "fuzzy" | "no_match" | "no_change";
  receivableId?: string;
  proposalNumber?: string;
  candidates?: { proposalNumber: string; receivableId: string; parcelaIndex: number }[];
  diffs?: FieldDiff[];
  selectedCandidateIdx?: number; // for fuzzy
  confirmed?: boolean; // user accepted
  excluded?: boolean; // user excluded
};

const STATUS_MAP: Record<string, string> = {
  PAGO: "pago",
  RECEBIDO: "pago",
  "RECEBIDO A MAIS": "pago",
  "RECEBIDO A MENOS": "pago",
  "RECEBIDO SEM NF": "pago",
  LANCADO: "lancado",
  "LANÇADO": "lancado",
  PENDENTE: "pendente",
  CANCELADA: "cancelado",
  CANCELADO: "cancelado",
  PDD: "pdd",
};

function norm(s: any): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function toIsoDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [_, dd, mm, yy] = m;
    if (yy.length === 2) yy = (parseInt(yy, 10) > 50 ? "19" : "20") + yy;
    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

function parseParcelaIndex(v: any): { index: number | null; raw: string } {
  const raw = String(v ?? "").trim();
  if (!raw) return { index: null, raw };
  // formats like "1/3", "1 de 3", "1"
  const m = raw.match(/^(\d+)/);
  if (m) return { index: parseInt(m[1], 10) - 1, raw };
  return { index: null, raw };
}

function findColumn(headers: string[], aliases: string[]): number {
  const H = headers.map(norm);
  for (let i = 0; i < H.length; i++) {
    for (const a of aliases) {
      if (H[i].includes(norm(a))) return i;
    }
  }
  return -1;
}

export function parseSpreadsheet(buf: ArrayBuffer): {
  rows: SheetRow[];
  detectedColumns: Record<string, string | null>;
} {
  const wb = XLSX.read(buf, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  if (!aoa.length) return { rows: [], detectedColumns: {} };

  // Locate header row: first row containing "OS" or "Proposta" or "Projeto"
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const r = aoa[i].map((c) => norm(c));
    if (r.some((c) => /OS|PROPOSTA|PROJETO/.test(c)) && r.some((c) => /PARCELA/.test(c))) {
      headerRowIdx = i;
      break;
    }
  }
  const headers = (aoa[headerRowIdx] || []).map((h) => String(h ?? ""));

  const colOs = findColumn(headers, ["OS", "Projeto", "Proposta", "Numero", "Número"]);
  const colParcela = findColumn(headers, ["Parcela"]);
  const colDue = findColumn(headers, ["Previsão de Faturamento", "Previsao de Faturamento", "Vencimento"]);
  const colInvoice = findColumn(headers, ["Emissão Fatura", "Emissao Fatura", "Emissão NF", "Emissao NF", "Data Emissão"]);
  const colPaid = findColumn(headers, ["Data Pagamento", "Pagamento", "Recebimento"]);
  const colPrevNf = findColumn(headers, ["Previsão NF", "Previsao NF", "Dt Previsão NF"]);
  const colStatus = findColumn(headers, ["Status"]);
  const colNfe = findColumn(headers, ["# NFe", "NFe", "NF-e", "Nota Fiscal", "# NF"]);

  const detectedColumns = {
    OS: colOs >= 0 ? headers[colOs] : null,
    Parcela: colParcela >= 0 ? headers[colParcela] : null,
    "Previsão Faturamento": colDue >= 0 ? headers[colDue] : null,
    "Emissão Fatura": colInvoice >= 0 ? headers[colInvoice] : null,
    "Data Pagamento": colPaid >= 0 ? headers[colPaid] : null,
    "Previsão NF": colPrevNf >= 0 ? headers[colPrevNf] : null,
    Status: colStatus >= 0 ? headers[colStatus] : null,
    "# NFe": colNfe >= 0 ? headers[colNfe] : null,
  };

  const rows: SheetRow[] = [];
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r) continue;
    const os = String(r[colOs] ?? "").trim();
    if (!os) continue;
    const p = parseParcelaIndex(r[colParcela]);
    const statusRaw = r[colStatus] != null ? norm(r[colStatus]) : null;
    const status = statusRaw ? STATUS_MAP[statusRaw] ?? null : null;
    rows.push({
      rowIndex: i + 1,
      os,
      parcelaIndex: p.index,
      parcelaRaw: p.raw,
      due_date: colDue >= 0 ? toIsoDate(r[colDue]) : null,
      invoice_date: colInvoice >= 0 ? toIsoDate(r[colInvoice]) : null,
      paid_at: colPaid >= 0 ? toIsoDate(r[colPaid]) : null,
      previsao_nf: colPrevNf >= 0 ? toIsoDate(r[colPrevNf]) : null,
      status,
      nfe_number: colNfe >= 0 ? (r[colNfe] != null ? String(r[colNfe]).trim() : null) : null,
    });
  }
  return { rows, detectedColumns };
}

function osBase(os: string): string {
  const m = os.match(/^(MA_\d{4}_\d{2})/i);
  return m ? m[1].toUpperCase() : os.toUpperCase();
}

function osSuffix(os: string): string {
  const m = os.match(/^MA_\d{4}_\d{2}(.*)$/i);
  return m ? m[1] : "";
}

function computeDiffs(src: SheetRow, rec: Receivable): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const check = (field: keyof Receivable, after: any) => {
    if (after == null || after === "") return;
    const before = (rec as any)[field] ?? null;
    if (before !== after) diffs.push({ field, before, after });
  };
  check("status", src.status);
  check("due_date", src.due_date);
  check("invoice_date", src.invoice_date);
  check("paid_at", src.paid_at);
  check("previsao_nf", src.previsao_nf);
  check("nfe_number", src.nfe_number);
  return diffs;
}

export function resolveRows(rows: SheetRow[], receivables: Receivable[]): ResolvedRow[] {
  // Index receivables by proposal_number (uppercase)
  const byProposal = new Map<string, Receivable[]>();
  for (const r of receivables) {
    const pn = (r.proposals?.proposal_number || "").toUpperCase();
    if (!pn) continue;
    if (!byProposal.has(pn)) byProposal.set(pn, []);
    byProposal.get(pn)!.push(r);
  }
  // Index by base
  const byBase = new Map<string, Receivable[]>();
  for (const r of receivables) {
    const pn = (r.proposals?.proposal_number || "").toUpperCase();
    if (!pn) continue;
    const b = osBase(pn);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b)!.push(r);
  }

  const resolved: ResolvedRow[] = [];
  for (const row of rows) {
    const osU = row.os.toUpperCase();
    const exactList = byProposal.get(osU);
    const parcIdx = row.parcelaIndex ?? 0;

    let target: Receivable | undefined;
    if (exactList) {
      target = exactList.find((r) => r.parcela_index === parcIdx);
    }

    if (target) {
      const diffs = computeDiffs(row, target);
      resolved.push({
        source: row,
        kind: diffs.length ? "exact" : "no_change",
        receivableId: target.id,
        proposalNumber: target.proposals?.proposal_number || osU,
        diffs,
        confirmed: diffs.length > 0,
      });
      continue;
    }

    // Fuzzy: same base, different suffix
    const base = osBase(osU);
    const baseList = byBase.get(base);
    if (baseList && baseList.length > 0) {
      // Candidate receivables matching parcela_index, prefer those with proposal_number !== osU
      const cands = baseList
        .filter((r) => r.parcela_index === parcIdx)
        .map((r) => ({
          receivableId: r.id,
          proposalNumber: r.proposals?.proposal_number || "",
          parcelaIndex: r.parcela_index,
          suffixDist: Math.abs(osSuffix(r.proposals?.proposal_number || "").length - osSuffix(osU).length),
        }))
        .sort((a, b) => a.suffixDist - b.suffixDist);

      if (cands.length > 0) {
        // Pre-fill diffs for top candidate
        const top = baseList.find((r) => r.id === cands[0].receivableId)!;
        const diffs = computeDiffs(row, top);
        resolved.push({
          source: row,
          kind: "fuzzy",
          candidates: cands.map(({ receivableId, proposalNumber, parcelaIndex }) => ({
            receivableId,
            proposalNumber,
            parcelaIndex,
          })),
          selectedCandidateIdx: 0,
          receivableId: top.id,
          proposalNumber: top.proposals?.proposal_number || "",
          diffs,
          confirmed: false, // requires explicit user action
        });
        continue;
      }
    }

    resolved.push({ source: row, kind: "no_match" });
  }
  return resolved;
}

export function recomputeDiffsForCandidate(
  row: ResolvedRow,
  receivables: Receivable[],
  candidateIdx: number
): ResolvedRow {
  const cand = row.candidates?.[candidateIdx];
  if (!cand) return row;
  const rec = receivables.find((r) => r.id === cand.receivableId);
  if (!rec) return row;
  const diffs = computeDiffs(row.source, rec);
  return {
    ...row,
    selectedCandidateIdx: candidateIdx,
    receivableId: cand.receivableId,
    proposalNumber: cand.proposalNumber,
    diffs,
  };
}
