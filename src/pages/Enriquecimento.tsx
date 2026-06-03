import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import {
  parseSheet,
  cleanCnpj,
  exportEnriched,
  type SheetParsed,
  type EnrichedRow,
} from "@/lib/enrichExcel";

const BATCH_SIZE = 5;

export default function Enriquecimento() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetParsed | null>(null);
  const [cnpjCol, setCnpjCol] = useState<number>(-1);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Map<string, EnrichedRow>>(new Map());

  const uniqueCnpjs = useMemo(() => {
    if (!sheet || cnpjCol < 0) return [] as string[];
    const set = new Set<string>();
    for (const r of sheet.rows) {
      const c = cleanCnpj(r[cnpjCol]);
      if (c.length === 14) set.add(c);
    }
    return Array.from(set);
  }, [sheet, cnpjCol]);

  const invalidCount = useMemo(() => {
    if (!sheet || cnpjCol < 0) return 0;
    return sheet.rows.filter((r) => cleanCnpj(r[cnpjCol]).length !== 14).length;
  }, [sheet, cnpjCol]);

  async function handleFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseSheet(buf);
      setSheet(parsed);
      setCnpjCol(parsed.cnpjColumnIndex);
      setResults(new Map());
      setProgress({ done: 0, total: 0 });
      if (parsed.cnpjColumnIndex === -1) {
        toast({
          title: "Coluna de CNPJ não detectada",
          description: "Selecione manualmente abaixo.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Erro ao ler planilha", description: e?.message, variant: "destructive" });
    }
  }

  async function enrichOne(cnpj: string): Promise<EnrichedRow> {
    try {
      const { data, error } = await supabase.functions.invoke("enrich-cnpj", {
        body: { cnpj },
      });
      if (error) throw error;
      const errs: string[] = data?.errors ?? [];
      const hasName = !!data?.razao_social;
      const hasWeb = !!(data?.site || data?.linkedin);
      const status: EnrichedRow["status"] = !hasName
        ? "error"
        : hasWeb
          ? "ok"
          : "partial";
      return {
        cnpj,
        razao_social: data?.razao_social ?? "",
        nome_fantasia: data?.nome_fantasia ?? "",
        cnae: data?.cnae ?? "",
        industria: data?.industria ?? "",
        site: data?.site ?? null,
        linkedin: data?.linkedin ?? null,
        status,
        errorMsg: errs.length ? errs.join(", ") : undefined,
      };
    } catch (e: any) {
      return {
        cnpj,
        razao_social: "",
        nome_fantasia: "",
        cnae: "",
        industria: "",
        site: null,
        linkedin: null,
        status: "error",
        errorMsg: e?.message || "erro",
      };
    }
  }

  async function run() {
    if (!uniqueCnpjs.length) return;
    setRunning(true);
    setProgress({ done: 0, total: uniqueCnpjs.length });
    const next = new Map(results);

    const pending = uniqueCnpjs.filter((c) => !next.has(c));
    let done = uniqueCnpjs.length - pending.length;
    setProgress({ done, total: uniqueCnpjs.length });

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const settled = await Promise.all(batch.map((c) => enrichOne(c)));
      settled.forEach((r) => next.set(r.cnpj, r));
      done += settled.length;
      setResults(new Map(next));
      setProgress({ done, total: uniqueCnpjs.length });
    }

    setRunning(false);
    const ok = Array.from(next.values()).filter((r) => r.status === "ok").length;
    const partial = Array.from(next.values()).filter((r) => r.status === "partial").length;
    const err = Array.from(next.values()).filter((r) => r.status === "error").length;
    toast({
      title: "Enriquecimento concluído",
      description: `${ok} completos, ${partial} parciais, ${err} com erro.`,
    });
  }

  function exportNow() {
    if (!sheet || cnpjCol < 0) return;
    exportEnriched(sheet.headers, sheet.rows, cnpjCol, results);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Enriquecimento de CNPJs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Faça upload de uma planilha com CNPJs e descubra automaticamente razão social, indústria, site e LinkedIn de cada empresa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Planilha</CardTitle>
          <CardDescription>Arquivos .xlsx ou .xls. Recomendado até 500 linhas por vez.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => inputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              {sheet ? "Trocar planilha" : "Selecionar planilha"}
            </Button>
            {sheet && (
              <span className="text-sm text-muted-foreground">
                {sheet.rows.length} linhas · {uniqueCnpjs.length} CNPJs únicos válidos
                {invalidCount > 0 && ` · ${invalidCount} inválidos`}
              </span>
            )}
          </div>

          {sheet && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Coluna de CNPJ</label>
              <Select
                value={cnpjCol >= 0 ? String(cnpjCol) : ""}
                onValueChange={(v) => setCnpjCol(Number(v))}
              >
                <SelectTrigger className="w-full sm:w-[400px]">
                  <SelectValue placeholder="Selecione a coluna" />
                </SelectTrigger>
                <SelectContent>
                  {sheet.headers.map((h, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {h || `(Coluna ${i + 1})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {sheet && sheet.rows.length > 0 && (
            <div className="border rounded-md overflow-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sheet.headers.map((h, i) => (
                      <TableHead key={i} className={i === cnpjCol ? "bg-primary/10 font-semibold" : ""}>
                        {h || `Col ${i + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.rows.slice(0, 5).map((r, ri) => (
                    <TableRow key={ri}>
                      {sheet.headers.map((_, ci) => (
                        <TableCell key={ci} className={ci === cnpjCol ? "bg-primary/5 font-mono text-xs" : "text-xs"}>
                          {String(r[ci] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {sheet && cnpjCol >= 0 && uniqueCnpjs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Enriquecer</CardTitle>
            <CardDescription>
              Cada CNPJ consulta dados cadastrais e busca site e LinkedIn na web.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={running}>
                {running ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {running ? "Processando..." : `Enriquecer ${uniqueCnpjs.length} CNPJs`}
              </Button>
              <Button onClick={exportNow} variant="outline" disabled={results.size === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>

            {progress.total > 0 && (
              <div className="space-y-1">
                <Progress value={(progress.done / progress.total) * 100} />
                <div className="text-xs text-muted-foreground">
                  {progress.done} de {progress.total}
                </div>
              </div>
            )}

            {results.size > 0 && (
              <div className="border rounded-md overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Indústria</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(results.values()).map((r) => (
                      <TableRow key={r.cnpj}>
                        <TableCell>
                          {r.status === "ok" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {r.status === "partial" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {r.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.cnpj}</TableCell>
                        <TableCell className="text-sm">{r.razao_social || "—"}</TableCell>
                        <TableCell className="text-xs">{r.industria || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.site ? (
                            <a href={r.site} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {r.site.replace(/^https?:\/\//, "")}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.linkedin ? (
                            <a href={r.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {r.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, "linkedin")}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {results.size > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" /> completo
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" /> parcial (sem site/LinkedIn)
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" /> erro
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
