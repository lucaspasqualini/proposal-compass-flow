import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  parseSpreadsheet,
  resolveRows,
  recomputeDiffsForCandidate,
  type ResolvedRow,
  type Receivable,
} from "@/lib/importReceivables";
import { useBulkUpdateReceivables, type BulkReceivableUpdate } from "@/hooks/useReceivables";

const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  due_date: "Previsão Faturamento",
  invoice_date: "Emissão Fatura",
  paid_at: "Data Pagamento",
  previsao_nf: "Previsão NF",
  nfe_number: "# NFe",
};

function fmt(v: any) {
  if (v == null || v === "") return "—";
  return String(v);
}

export default function ImportReceivablesDialog({
  open,
  onOpenChange,
  receivables,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  receivables: Receivable[];
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ResolvedRow[]>([]);
  const [detected, setDetected] = useState<Record<string, string | null>>({});
  const [tab, setTab] = useState("fuzzy");
  const bulkUpdate = useBulkUpdateReceivables();

  const reset = () => {
    setRows([]);
    setDetected({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const { rows: sheetRows, detectedColumns } = parseSpreadsheet(buf);
      if (!sheetRows.length) {
        toast({ title: "Planilha vazia ou cabeçalho não reconhecido", variant: "destructive" });
        return;
      }
      const resolved = resolveRows(sheetRows, receivables);
      setDetected(detectedColumns);
      setRows(resolved);
      const hasFuzzy = resolved.some((r) => r.kind === "fuzzy");
      setTab(hasFuzzy ? "fuzzy" : "preview");
    } catch (e: any) {
      toast({ title: "Erro ao ler planilha", description: e.message, variant: "destructive" });
    }
  };

  const fuzzy = rows.filter((r) => r.kind === "fuzzy");
  const noMatch = rows.filter((r) => r.kind === "no_match");
  const noChange = rows.filter((r) => r.kind === "no_change");
  const toApply = rows.filter(
    (r) => (r.kind === "exact" || (r.kind === "fuzzy" && r.confirmed && !r.excluded)) && (r.diffs?.length ?? 0) > 0 && !r.excluded
  );

  const updateRow = (idx: number, patch: Partial<ResolvedRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleCandidateChange = (rowIdx: number, candIdx: number) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === rowIdx && r.candidates ? recomputeDiffsForCandidate(r, receivables, candIdx) : r
      )
    );
  };

  const confirmAllSameBase = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.kind !== "fuzzy" || r.confirmed) return r;
        // Auto-confirm if top candidate's base matches and there's only one base candidate
        if (r.candidates && r.candidates.length >= 1) {
          return { ...r, confirmed: true };
        }
        return r;
      })
    );
  };

  const apply = async () => {
    const updates: BulkReceivableUpdate[] = toApply.map((r) => {
      const u: BulkReceivableUpdate = { id: r.receivableId! };
      for (const d of r.diffs || []) {
        (u as any)[d.field] = d.after;
      }
      return u;
    });
    if (!updates.length) {
      toast({ title: "Nenhuma atualização para aplicar" });
      return;
    }
    const res = await bulkUpdate.mutateAsync(updates);
    toast({
      title: `${res.ok} atualizada(s)`,
      description: res.errors.length ? `${res.errors.length} erro(s). Verifique permissões.` : undefined,
      variant: res.errors.length ? "destructive" : "default",
    });
    if (!res.errors.length) {
      reset();
      onOpenChange(false);
    }
  };

  const downloadNoMatchCsv = () => {
    const csv = ["OS,Parcela,Status,#NFe,Previsão,Emissão,Pagamento"]
      .concat(
        noMatch.map((r) =>
          [r.source.os, r.source.parcelaRaw, r.source.status ?? "", r.source.nfe_number ?? "", r.source.due_date ?? "", r.source.invoice_date ?? "", r.source.paid_at ?? ""].join(",")
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sem-match.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(() => {
    return {
      total: rows.length,
      exact: rows.filter((r) => r.kind === "exact").length,
      fuzzy: fuzzy.length,
      noMatch: noMatch.length,
      noChange: noChange.length,
      toApply: toApply.length,
    };
  }, [rows, fuzzy.length, noMatch.length, noChange.length, toApply.length]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar planilha de Contas a Receber
          </DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed border-border rounded-lg">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center text-sm text-muted-foreground max-w-md">
              Envie um arquivo .xlsx com colunas OS, Parcela, Status, # NFe e datas (Previsão, Emissão, Pagamento). O sistema vai casar com as parcelas existentes e mostrar uma pré-visualização.
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Selecionar arquivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Total linhas: {summary.total}</Badge>
              <Badge className="bg-success/10 text-success">Exatas: {summary.exact}</Badge>
              <Badge className="bg-warning/10 text-warning">Fuzzy: {summary.fuzzy}</Badge>
              <Badge className="bg-destructive/10 text-destructive">Sem match: {summary.noMatch}</Badge>
              <Badge variant="outline">Sem alteração: {summary.noChange}</Badge>
              <Badge className="bg-primary/10 text-primary ml-auto">A aplicar: {summary.toApply}</Badge>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList>
                <TabsTrigger value="fuzzy">
                  Confirmar fuzzy {fuzzy.length > 0 && <span className="ml-1 text-xs">({fuzzy.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="preview">
                  Pré-visualização {toApply.length > 0 && <span className="ml-1 text-xs">({toApply.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="nomatch">
                  Sem match {noMatch.length > 0 && <span className="ml-1 text-xs">({noMatch.length})</span>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fuzzy" className="flex-1 overflow-auto">
                {fuzzy.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4">Nenhuma OS ambígua.</div>
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <Button size="sm" variant="outline" onClick={confirmAllSameBase}>
                        Confirmar todas com mesma base
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OS planilha</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Proposta sugerida</TableHead>
                          <TableHead>Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, idx) =>
                          r.kind !== "fuzzy" ? null : (
                            <TableRow key={idx} className={r.confirmed ? "bg-success/5" : r.excluded ? "opacity-40" : ""}>
                              <TableCell className="font-mono text-xs">{r.source.os}</TableCell>
                              <TableCell>{r.source.parcelaRaw}</TableCell>
                              <TableCell>
                                {r.candidates && r.candidates.length > 1 ? (
                                  <Select
                                    value={String(r.selectedCandidateIdx ?? 0)}
                                    onValueChange={(v) => handleCandidateChange(idx, parseInt(v, 10))}
                                  >
                                    <SelectTrigger className="h-8 w-64">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {r.candidates.map((c, ci) => (
                                        <SelectItem key={ci} value={String(ci)}>
                                          {c.proposalNumber}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="font-mono text-xs">{r.proposalNumber}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant={r.confirmed ? "default" : "outline"}
                                    onClick={() => updateRow(idx, { confirmed: true, excluded: false })}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={r.excluded ? "destructive" : "outline"}
                                    onClick={() => updateRow(idx, { excluded: true, confirmed: false })}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Atual</TableHead>
                      <TableHead>Novo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.flatMap((r, idx) => {
                      if (!r.diffs || r.diffs.length === 0) return [];
                      if (r.kind === "fuzzy" && (!r.confirmed || r.excluded)) return [];
                      if (r.excluded) return [];
                      return r.diffs.map((d, di) => (
                        <TableRow key={`${idx}-${di}`}>
                          <TableCell>
                            <Checkbox
                              checked={!r.excluded}
                              onCheckedChange={(c) => updateRow(idx, { excluded: !c })}
                              disabled={di > 0}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.proposalNumber}</TableCell>
                          <TableCell>{r.source.parcelaRaw}</TableCell>
                          <TableCell>{FIELD_LABEL[d.field as string] || d.field}</TableCell>
                          <TableCell className="text-muted-foreground">{fmt(d.before)}</TableCell>
                          <TableCell className="font-medium">{fmt(d.after)}</TableCell>
                        </TableRow>
                      ));
                    })}
                  </TableBody>
                </Table>
                {toApply.length === 0 && (
                  <div className="text-sm text-muted-foreground p-4">Nenhuma diferença a aplicar.</div>
                )}
              </TabsContent>

              <TabsContent value="nomatch" className="flex-1 overflow-auto">
                {noMatch.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4">Tudo casou.</div>
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <Button size="sm" variant="outline" onClick={downloadNoMatchCsv}>
                        Baixar CSV
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OS</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead># NFe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {noMatch.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{r.source.os}</TableCell>
                            <TableCell>{r.source.parcelaRaw}</TableCell>
                            <TableCell>{r.source.status ?? "—"}</TableCell>
                            <TableCell>{r.source.nfe_number ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {Object.values(detected).some((v) => v === null) && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                Algumas colunas não foram detectadas:{" "}
                {Object.entries(detected)
                  .filter(([, v]) => v === null)
                  .map(([k]) => k)
                  .join(", ")}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {rows.length > 0 && (
            <>
              <Button variant="outline" onClick={reset}>
                Trocar arquivo
              </Button>
              <Button onClick={apply} disabled={bulkUpdate.isPending || toApply.length === 0}>
                {bulkUpdate.isPending ? "Aplicando..." : `Aplicar ${toApply.length} atualização(ões)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
