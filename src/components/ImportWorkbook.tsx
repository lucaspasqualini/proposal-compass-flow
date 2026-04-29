import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import {
  parseDate, parseNumber, parseString,
  normalizeProposalStatus, normalizeProjectStatus,
  makeColumnGetter, buildLowerMap, matchByName, splitTeamNames,
  readWorkbookFromArrayBuffer, findSheet,
} from "@/lib/importWorkbook";

interface ProposalRow {
  proposal_number: string | null;
  title: string;
  tipo_projeto: string | null;
  data_envio: string | null;
  value: number | null;
  status: string;
  data_aprovacao: string | null;
  data_fup: string | null;
  empresa: string | null;
  cliente_contato: string | null;
  indicador: string | null;
  observacoes: string | null;
}

interface ProjectRow {
  title: string;
  empresa: string | null;
  proposal_number: string | null;
  status: string;
  etapa: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  description: string | null;
  team_names: string[];
}

function parseProposalRow(row: any): ProposalRow | null {
  const get = makeColumnGetter(row);
  const title = parseString(get(["projeto", "título", "titulo", "title", "nome"]));
  if (!title) return null;
  return {
    proposal_number: parseString(get(["número", "numero", "proposal_number", "n°", "nº", "número da proposta"])),
    title,
    tipo_projeto: parseString(get(["tipo"])),
    data_envio: parseDate(get(["envio", "data de envio"])),
    value: parseNumber(get(["valor", "value", "preço"])),
    status: normalizeProposalStatus(get(["status"])),
    data_aprovacao: parseDate(get(["aprovação", "aprovacao", "data de aprovação"])),
    data_fup: parseDate(get(["fup", "follow", "acompanhamento"])),
    empresa: parseString(get(["empresa", "company"])),
    cliente_contato: parseString(get(["contato", "contact", "cliente"])),
    indicador: parseString(get(["indicador", "indicação", "referral"])),
    observacoes: parseString(get(["observ", "obs", "notas", "notes"])),
  };
}

function parseProjectRow(row: any): ProjectRow | null {
  const get = makeColumnGetter(row);
  const title = parseString(get(["projeto", "título", "titulo", "title", "nome"]));
  if (!title) return null;
  return {
    title,
    empresa: parseString(get(["empresa", "cliente", "company"])),
    proposal_number: parseString(get(["proposta", "número da proposta", "proposal_number", "nº proposta"])),
    status: normalizeProjectStatus(get(["status"])),
    etapa: parseString(get(["etapa", "stage", "fase"])),
    start_date: parseDate(get(["início", "inicio", "start", "data início"])),
    end_date: parseDate(get(["fim", "término", "termino", "end", "data fim"])),
    budget: parseNumber(get(["orçamento", "orcamento", "budget", "valor"])),
    description: parseString(get(["descrição", "descricao", "description"])),
    team_names: splitTeamNames(get(["equipe", "alocaç", "alocac", "consultor", "team", "membros"])),
  };
}

interface Props {
  defaultTab?: "proposals" | "projects";
  triggerLabel?: string;
}

export default function ImportWorkbook({ defaultTab = "proposals", triggerLabel = "Importar Excel" }: Props) {
  const [open, setOpen] = useState(false);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setProposals([]); setProjects([]); setError(null); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const sheets = readWorkbookFromArrayBuffer(evt.target?.result as ArrayBuffer);
        const sheetNames = Object.keys(sheets);
        console.log("[Import] Abas encontradas:", sheetNames);

        let propSheet = findSheet(sheets, ["proposta", "proposals"]);
        let projSheet = findSheet(sheets, ["projeto", "projects"]);

        // Fallback: se só existe uma aba e nenhuma bateu, assume conforme defaultTab
        if (!propSheet && !projSheet && sheetNames.length === 1) {
          const only = sheets[sheetNames[0]];
          if (defaultTab === "projects") projSheet = only;
          else propSheet = only;
          console.log(`[Import] Aba única "${sheetNames[0]}" tratada como ${defaultTab}`);
        }

        if (!propSheet && !projSheet) {
          setError(`Nenhuma aba 'Propostas' ou 'Projetos' encontrada. Abas no arquivo: ${sheetNames.join(", ")}`);
          return;
        }

        const props = (propSheet ?? []).map(parseProposalRow).filter((r): r is ProposalRow => !!r);
        const projs = (projSheet ?? []).map(parseProjectRow).filter((r): r is ProjectRow => !!r);
        console.log(`[Import] Parseadas ${props.length} propostas, ${projs.length} projetos`);

        if (props.length === 0 && projs.length === 0) {
          setError("Arquivo lido, mas nenhuma linha válida encontrada. Verifique se há uma coluna 'Projeto' / 'Título' preenchida.");
          return;
        }

        setProposals(props);
        setProjects(projs);
        if (props.length > 0 && (defaultTab === "proposals" || projs.length === 0)) setActiveTab("proposals");
        else if (projs.length > 0) setActiveTab("projects");
      } catch (err) {
        console.error("[Import] Erro:", err);
        setError("Erro ao ler o arquivo. Verifique o formato.");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    setImporting(true);
    let propInserted = 0, propUpdated = 0;
    let projInserted = 0, projUpdated = 0;
    let allocCreated = 0;
    const warnings: string[] = [];

    try {
      // Lookups
      const [{ data: clientsData }, { data: teamData }, { data: existingProps }] = await Promise.all([
        supabase.from("clients").select("id, name"),
        supabase.from("team_members").select("id, name").eq("is_active", true),
        supabase.from("proposals").select("id, proposal_number, title, client_id"),
      ]);

      const clientMap = buildLowerMap(clientsData ?? []);
      const teamMap = buildLowerMap(teamData ?? []);
      const propByNumber = new Map<string, string>();
      (existingProps ?? []).forEach((p) => {
        if (p.proposal_number) propByNumber.set(p.proposal_number.toLowerCase(), p.id);
      });

      // ---- Propostas: upsert por proposal_number ----
      for (const r of proposals) {
        const client_id = matchByName(clientMap, r.empresa);
        if (r.empresa && !client_id) warnings.push(`Cliente não encontrado: "${r.empresa}"`);

        const payload = {
          title: r.title,
          tipo_projeto: r.tipo_projeto,
          data_envio: r.data_envio,
          value: r.value,
          status: r.status as any,
          data_aprovacao: r.data_aprovacao,
          data_fup: r.data_fup,
          client_id,
          cliente_contato: r.cliente_contato,
          indicador: r.indicador,
          observacoes: r.observacoes,
          empresa: r.empresa,
        };

        const existingId = r.proposal_number ? propByNumber.get(r.proposal_number.toLowerCase()) : undefined;
        if (existingId) {
          const { error } = await supabase.from("proposals").update(payload).eq("id", existingId);
          if (error) throw error;
          propUpdated++;
        } else {
          const insertPayload: any = { ...payload };
          if (r.proposal_number) insertPayload.proposal_number = r.proposal_number;
          const { data, error } = await supabase.from("proposals").insert(insertPayload).select("id, proposal_number").single();
          if (error) throw error;
          if (data?.proposal_number) propByNumber.set(data.proposal_number.toLowerCase(), data.id);
          propInserted++;
        }
      }

      // ---- Projetos: upsert por (title + client_id) ----
      const { data: existingProjects } = await supabase.from("projects").select("id, title, client_id");
      const projKey = (title: string, clientId: string | null) => `${title.toLowerCase()}|${clientId ?? ""}`;
      const projMap = new Map<string, string>();
      (existingProjects ?? []).forEach((p) => projMap.set(projKey(p.title, p.client_id), p.id));

      for (const r of projects) {
        const client_id = matchByName(clientMap, r.empresa);
        if (r.empresa && !client_id) warnings.push(`Cliente não encontrado: "${r.empresa}"`);

        const proposal_id = r.proposal_number ? propByNumber.get(r.proposal_number.toLowerCase()) ?? null : null;
        if (r.proposal_number && !proposal_id) warnings.push(`Proposta não encontrada: "${r.proposal_number}"`);

        const payload: any = {
          title: r.title,
          client_id,
          proposal_id,
          status: r.status,
          etapa: r.etapa ?? "iniciado",
          start_date: r.start_date,
          end_date: r.end_date,
          budget: r.budget,
          description: r.description,
        };

        const k = projKey(r.title, client_id);
        let projectId = projMap.get(k);
        if (projectId) {
          const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
          if (error) throw error;
          projUpdated++;
        } else {
          const { data, error } = await supabase.from("projects").insert(payload).select("id").single();
          if (error) throw error;
          projectId = data!.id;
          projMap.set(k, projectId);
          projInserted++;
        }

        // Alocações: substitui as atuais
        if (r.team_names.length > 0 && projectId) {
          await supabase.from("project_allocations").delete().eq("project_id", projectId);
          const allocs: any[] = [];
          for (const name of r.team_names) {
            const team_member_id = matchByName(teamMap, name);
            if (!team_member_id) {
              warnings.push(`Membro não encontrado: "${name}"`);
              continue;
            }
            allocs.push({ project_id: projectId, team_member_id });
          }
          if (allocs.length > 0) {
            const { error } = await supabase.from("project_allocations").insert(allocs);
            if (error) throw error;
            allocCreated += allocs.length;
          }
        }
      }

      const summary = [
        proposals.length > 0 && `Propostas: ${propInserted} novas, ${propUpdated} atualizadas`,
        projects.length > 0 && `Projetos: ${projInserted} novos, ${projUpdated} atualizados`,
        allocCreated > 0 && `${allocCreated} alocações`,
      ].filter(Boolean).join(" • ");

      toast({
        title: "Importação concluída",
        description: summary + (warnings.length > 0 ? ` (${warnings.length} avisos)` : ""),
      });
      if (warnings.length > 0) console.warn("Import warnings:", warnings);

      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao importar", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const totalRows = proposals.length + projects.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Importar Propostas e Projetos do Excel</DialogTitle>
          <DialogDescription>
            Envie um arquivo .xlsx com abas <strong>Propostas</strong> e/ou <strong>Projetos</strong>. Registros existentes serão atualizados (proposta por número; projeto por título + cliente).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              <strong>Aba Propostas:</strong> Número, Projeto, Tipo, Empresa, Valor, Status, Data de Envio, Data de Aprovação, Data de FUP, Cliente/Contato, Indicador, Observações<br />
              <strong>Aba Projetos:</strong> Projeto, Empresa, Proposta (nº), Status, Etapa, Data Início, Data Fim, Orçamento, Descrição, Equipe (nomes separados por vírgula)
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Selecionar arquivo</Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {totalRows > 0 && (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="proposals" disabled={proposals.length === 0}>
                    Propostas <Badge variant="secondary" className="ml-2">{proposals.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="projects" disabled={projects.length === 0}>
                    Projetos <Badge variant="secondary" className="ml-2">{projects.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="proposals">
                  <div className="border rounded-lg overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposals.slice(0, 50).map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{r.proposal_number ?? "—"}</TableCell>
                            <TableCell className="font-medium">{r.title}</TableCell>
                            <TableCell>{r.empresa ?? "—"}</TableCell>
                            <TableCell>{r.value != null ? `R$ ${r.value.toLocaleString("pt-BR")}` : "—"}</TableCell>
                            <TableCell>{r.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {proposals.length > 50 && <p className="text-xs text-muted-foreground mt-1">Mostrando 50 de {proposals.length}</p>}
                </TabsContent>

                <TabsContent value="projects">
                  <div className="border rounded-lg overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Proposta</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Etapa</TableHead>
                          <TableHead>Equipe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.slice(0, 50).map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{r.title}</TableCell>
                            <TableCell>{r.empresa ?? "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{r.proposal_number ?? "—"}</TableCell>
                            <TableCell>{r.status}</TableCell>
                            <TableCell>{r.etapa ?? "—"}</TableCell>
                            <TableCell className="text-xs">{r.team_names.join(", ") || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {projects.length > 50 && <p className="text-xs text-muted-foreground mt-1">Mostrando 50 de {projects.length}</p>}
                </TabsContent>
              </Tabs>

              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing ? "Importando..." : `Importar ${proposals.length} proposta(s) + ${projects.length} projeto(s)`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
