import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedRow {
  title: string;
  tipo_projeto?: string;
  data_envio?: string;
  value?: number;
  status?: string;
  data_aprovacao?: string;
  data_fup?: string;
  empresa?: string;
  cliente_contato?: string;
  indicador?: string;
  observacoes?: string;
}

const STATUS_MAP: Record<string, string> = {
  rascunho: "rascunho",
  enviada: "enviada",
  "em análise": "em_analise",
  "em analise": "em_analise",
  aprovada: "aprovada",
  rejeitada: "rejeitada",
};

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const str = String(val).trim();
  // DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

function normalizeStatus(val: any): string {
  if (!val) return "rascunho";
  const key = String(val).toLowerCase().trim();
  return STATUS_MAP[key] ?? "rascunho";
}

export default function ImportProposals() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        if (json.length === 0) {
          setError("Planilha vazia");
          return;
        }

        const parsed: ParsedRow[] = json.map((row: any) => {
          // Flexible column mapping (case-insensitive, partial match)
          const get = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const kl = k.toLowerCase().trim();
              if (keys.some((key) => kl.includes(key))) return row[k];
            }
            return undefined;
          };

          return {
            title: get(["projeto", "título", "titulo", "title", "nome"]) ?? "",
            tipo_projeto: get(["tipo"]) ?? "",
            data_envio: parseDate(get(["envio", "data de envio"])),
            value: (() => { const v = get(["valor", "value", "preço"]); return v ? Number(String(v).replace(/[^\d.,-]/g, "").replace(",", ".")) : undefined; })(),
            status: normalizeStatus(get(["status"])),
            data_aprovacao: parseDate(get(["aprovação", "aprovacao", "data de aprovação"])),
            data_fup: parseDate(get(["fup", "follow", "acompanhamento"])),
            empresa: get(["empresa", "company"]) ?? "",
            cliente_contato: get(["cliente", "contato", "contact"]) ?? "",
            indicador: get(["indicador", "indicação", "referral"]) ?? "",
            observacoes: get(["observ", "obs", "notas", "notes"]) ?? "",
          } as ParsedRow;
        });

        setRows(parsed.filter((r) => r.title));
      } catch {
        setError("Erro ao ler o arquivo. Verifique o formato.");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);

    // Fetch clients to match empresa names
    const { data: clients } = await supabase.from("clients").select("id, name");
    const clientMap = new Map((clients ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    const inserts = rows.map((r) => ({
      title: r.title,
      tipo_projeto: r.tipo_projeto || null,
      data_envio: r.data_envio || null,
      value: r.value ?? null,
      status: (r.status as any) || "rascunho",
      data_aprovacao: r.data_aprovacao || null,
      data_fup: r.data_fup || null,
      client_id: clientMap.get(r.empresa?.toLowerCase() ?? "") ?? null,
      cliente_contato: r.cliente_contato || null,
      indicador: r.indicador || null,
      observacoes: r.observacoes || null,
    }));

    const { error: insertError } = await supabase.from("proposals").insert(inserts);
    setImporting(false);

    if (insertError) {
      toast({ title: "Erro ao importar", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: `${inserts.length} propostas importadas com sucesso!` });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setRows([]);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRows([]); setError(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-1" /> Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Importar Propostas do Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Selecione um arquivo .xlsx ou .xls com as colunas: Projeto, Tipo, Data de Envio, Valor, Status, Data de Aprovação, Data de FUP, Empresa, Cliente, Indicador, Observações
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Selecionar Arquivo
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">{rows.length} linha(s) encontrada(s). Confira antes de importar:</p>
              <div className="border rounded-lg overflow-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell>{r.tipo_projeto}</TableCell>
                        <TableCell>{r.empresa}</TableCell>
                        <TableCell>{r.value != null ? `R$ ${r.value.toLocaleString("pt-BR")}` : "—"}</TableCell>
                        <TableCell>{r.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 20 && <p className="text-xs text-muted-foreground">Mostrando 20 de {rows.length} linhas</p>}
              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing ? "Importando..." : `Importar ${rows.length} proposta(s)`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
