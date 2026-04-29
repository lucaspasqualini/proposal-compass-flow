import { useState, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { useProposals, useDeleteProposal, useUpdateProposal } from "@/hooks/useProposals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, proposalStatusLabels, proposalStatusColors } from "@/lib/format";
import { compareProjectNumbers } from "@/lib/projectNumber";
import { syncProposalProjectStatus } from "@/lib/syncProposalProject";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, TrendingUp, TrendingDown, Clock, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ImportWorkbook from "@/components/ImportWorkbook";
import ProposalDetailDialog from "@/components/ProposalDetailDialog";
import { RoleGuard } from "@/components/RoleGuard";
type SortKey = "proposal_number" | "title" | "client" | "value" | "status" | "data_envio" | "data_aprovacao" | "tipo_projeto";
type SortDir = "asc" | "desc";

export default function Propostas() {
  const { data: proposals, isLoading } = useProposals();
  const queryClient = useQueryClient();
  const deleteProposal = useDeleteProposal();
  const updateProposal = useUpdateProposal();
  const { toast } = useToast();
  const [search, setSearch] = usePersistedState("propostas:search", "");
  const [statusFilter, setStatusFilter] = usePersistedState<string>("propostas:status", "all");
  const [empresaFilter, setEmpresaFilter] = usePersistedState<string>("propostas:empresa", "all");
  const [yearFilter, setYearFilter] = usePersistedState<string>("propostas:year", "all");
  const [monthFilter, setMonthFilter] = usePersistedState<string>("propostas:month", "all");
  const [sortKey, setSortKey] = usePersistedState<SortKey>("propostas:sortKey", "status");
  const [sortDir, setSortDir] = usePersistedState<SortDir>("propostas:sortDir", "asc");
  const [hidePerdida, setHidePerdida] = usePersistedState("propostas:hidePerdida", false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const availableYears = useMemo(() => {
    if (!proposals) return [];
    const years = new Set<string>();
    proposals.forEach((p) => {
      const d = (p as any).data_envio;
      if (d) {
        const y = d.substring(0, 4);
        years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [proposals]);

  const filtered = useMemo(() => {
    if (!proposals) return [];
    let list = proposals.filter((p) => {
      const s = search.toLowerCase();
      const matchSearch =
        p.title.toLowerCase().includes(s) ||
        (p.proposal_number ?? "").toLowerCase().includes(s) ||
        ((p.clients as any)?.name ?? "").toLowerCase().includes(s) ||
        ((p as any).empresa ?? "").toLowerCase().includes(s);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchEmpresa = empresaFilter === "all" || (p as any).empresa === empresaFilter;
      const matchYear = yearFilter === "all" || ((p as any).data_envio ?? "").startsWith(yearFilter);
      const matchMonth = monthFilter === "all" || ((p as any).data_envio ?? "").substring(5, 7) === monthFilter;
      const matchHide = !hidePerdida || p.status !== "perdida";
      return matchSearch && matchStatus && matchEmpresa && matchYear && matchMonth && matchHide;
    });

    const statusPriority: Record<string, number> = {
      em_elaboracao: 0,
      em_negociacao: 1,
      ganha: 2,
      perdida: 3,
    };

    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "proposal_number": {
          const cmp = compareProjectNumbers(a.proposal_number, b.proposal_number);
          return sortDir === "asc" ? cmp : -cmp;
        }
        case "status": {
          const pa = statusPriority[a.status] ?? 99;
          const pb = statusPriority[b.status] ?? 99;
          const cmp = sortDir === "asc" ? pa - pb : pb - pa;
          if (cmp !== 0) return cmp;
          // 2nd tiebreaker: data_envio desc (most recent first)
          const da = (a as any).data_envio ?? "";
          const db = (b as any).data_envio ?? "";
          const dateCmp = db.localeCompare(da);
          if (dateCmp !== 0) return dateCmp;
          // 3rd tiebreaker: Nº Projeto hierarchy (YY desc, then XXXX desc)
          return -compareProjectNumbers(a.proposal_number, b.proposal_number);
        }
        case "title": va = a.title; vb = b.title; break;
        case "client": va = (a.clients as any)?.name ?? ""; vb = (b.clients as any)?.name ?? ""; break;
        case "value": va = Number(a.value) || 0; vb = Number(b.value) || 0; break;
        case "data_envio": va = (a as any).data_envio ?? ""; vb = (b as any).data_envio ?? ""; break;
        case "data_aprovacao": va = (a as any).data_aprovacao ?? ""; vb = (b as any).data_aprovacao ?? ""; break;
        case "tipo_projeto": va = (a as any).tipo_projeto ?? ""; vb = (b as any).tipo_projeto ?? ""; break;
        default: va = ""; vb = "";
      }
      if (typeof va === "string") {
        const cmp = va.localeCompare(vb, "pt-BR", { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return list;
  }, [proposals, search, statusFilter, empresaFilter, yearFilter, monthFilter, sortKey, sortDir, hidePerdida]);

  const stats = useMemo(() => {
    const ganhas = filtered.filter((p) => p.status === "ganha");
    const perdidas = filtered.filter((p) => p.status === "perdida");
    const negociacao = filtered.filter((p) => p.status === "em_negociacao");
    return {
      ganhas: { count: ganhas.length, value: ganhas.reduce((s, p) => s + (Number(p.value) || 0), 0) },
      perdidas: { count: perdidas.length, value: perdidas.reduce((s, p) => s + (Number(p.value) || 0), 0) },
      negociacao: { count: negociacao.length, value: negociacao.reduce((s, p) => s + (Number(p.value) || 0), 0) },
    };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProposal.mutateAsync(id);
      toast({ title: "Proposta removida" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleInlineStatusChange = async (id: string, newStatus: string) => {
    try {
      const currentProposal = proposals?.find((proposal) => proposal.id === id);
      const updatedProposal = await updateProposal.mutateAsync({ id, status: newStatus as any });
      const syncAction = await syncProposalProjectStatus({
        proposal: updatedProposal,
        previousStatus: currentProposal?.status,
      });

      if (syncAction) {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }

      toast({
        title:
          syncAction === "created"
            ? "Status atualizado e projeto criado"
            : syncAction === "reactivated"
              ? "Status atualizado e projeto reativado"
              : syncAction === "cancelled"
                ? "Status atualizado e projeto cancelado"
                : "Status atualizado",
      });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleInlineDateChange = async (id: string, date: Date | undefined) => {
    try {
      await updateProposal.mutateAsync({
        id,
        data_aprovacao: date ? format(date, "yyyy-MM-dd") : null,
      } as any);
      toast({ title: "Data de aprovação atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar data", variant: "destructive" });
    }
  };

  const empresas = useMemo(() => {
    if (!proposals) return [];
    const set = new Set(proposals.map((p) => (p as any).empresa).filter(Boolean));
    return Array.from(set).sort();
  }, [proposals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">Gerencie suas propostas comerciais</p>
        </div>
        <div className="flex gap-2">
          <ImportWorkbook defaultTab="proposals" />
          <Button
            variant="outline"
            onClick={() => {
              const rows = filtered.map((p) => ({
                "Nº do Projeto": p.proposal_number || "",
                "Nome do Projeto": p.title,
                "Tipo": (p as any).tipo_projeto || "",
                "Cliente": (p.clients as any)?.name || "",
                "Valor": Number(p.value) || 0,
                "Status": proposalStatusLabels[p.status] || p.status,
                "Data de Envio": (p as any).data_envio ? formatDate((p as any).data_envio) : "",
                "Data de Aprovação": (p as any).data_aprovacao ? formatDate((p as any).data_aprovacao) : "",
              }));
              exportToExcel(rows, "propostas");
            }}
          >
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Proposta
          </Button>
        </div>
      </div>

      {/* Dashboard de subtotais — escondido para Consultor */}
      <RoleGuard allowed={["socio", "gerente_projetos", "estagiario", "administrativo"]}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ganhas</p>
              <p className="text-lg font-bold">{stats.ganhas.count} <span className="text-sm font-normal text-muted-foreground">• {formatCurrency(stats.ganhas.value)}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Perdidas</p>
              <p className="text-lg font-bold">{stats.perdidas.count} <span className="text-sm font-normal text-muted-foreground">• {formatCurrency(stats.perdidas.value)}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Em Negociação</p>
              <p className="text-lg font-bold">{stats.negociacao.count} <span className="text-sm font-normal text-muted-foreground">• {formatCurrency(stats.negociacao.value)}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
      </RoleGuard>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(proposalStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Centro de Custo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Centros de Custo</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Anos</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Meses</SelectItem>
            {[
              ["01", "Janeiro"], ["02", "Fevereiro"], ["03", "Março"], ["04", "Abril"],
              ["05", "Maio"], ["06", "Junho"], ["07", "Julho"], ["08", "Agosto"],
              ["09", "Setembro"], ["10", "Outubro"], ["11", "Novembro"], ["12", "Dezembro"],
            ].map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox id="hide-perdida" checked={hidePerdida} onCheckedChange={(v) => setHidePerdida(!!v)} />
          <label htmlFor="hide-perdida" className="text-sm text-muted-foreground cursor-pointer select-none">Ocultar perdidas</label>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("proposal_number")}>
                      <span className="flex items-center">Nº do Projeto <SortIcon col="proposal_number" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("title")}>
                      <span className="flex items-center">Nome do Projeto <SortIcon col="title" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell whitespace-nowrap" onClick={() => toggleSort("tipo_projeto")}>
                      <span className="flex items-center">Tipo <SortIcon col="tipo_projeto" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort("client")}>
                      <span className="flex items-center">Cliente <SortIcon col="client" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("value")}>
                      <span className="flex items-center">Valor <SortIcon col="value" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                      <span className="flex items-center">Status <SortIcon col="status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell whitespace-nowrap" onClick={() => toggleSort("data_envio")}>
                      <span className="flex items-center">Data de Envio <SortIcon col="data_envio" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell whitespace-nowrap" onClick={() => toggleSort("data_aprovacao")}>
                      <span className="flex items-center">Data de Aprovação <SortIcon col="data_aprovacao" /></span>
                    </TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhuma proposta encontrada
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProposalId(p.id)}>
                      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">{p.proposal_number || "—"}</TableCell>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{(p as any).tipo_projeto || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        {(p.clients as any)?.name ? (
                          <Link
                            to={`/clientes/${p.client_id}`}
                            className="text-primary hover:underline"
                          >
                            {(p.clients as any).name}
                          </Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatCurrency(Number(p.value))}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={p.status}
                          onValueChange={(v) => handleInlineStatusChange(p.id, v)}
                        >
                          <SelectTrigger className="h-7 w-auto min-w-[120px] border-none shadow-none p-0 focus:ring-0">
                            <Badge variant="secondary" className={proposalStatusColors[p.status]}>
                              {proposalStatusLabels[p.status]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(proposalStatusLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{(p as any).data_envio ? formatDate((p as any).data_envio) : "—"}</TableCell>
                      <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-sm hover:underline text-left flex items-center gap-1">
                              {(p as any).data_aprovacao ? formatDate((p as any).data_aprovacao) : <span className="text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Definir</span>}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              locale={ptBR}
                              selected={(p as any).data_aprovacao ? new Date((p as any).data_aprovacao + "T00:00:00") : undefined}
                              onSelect={(date) => handleInlineDateChange(p.id, date)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedProposalId(p.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover proposta?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(p.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProposalDetailDialog
        proposalId={selectedProposalId}
        open={!!selectedProposalId}
        onOpenChange={(open) => { if (!open) setSelectedProposalId(null); }}
      />

      <ProposalDetailDialog
        proposalId={null}
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        isNew
      />
    </div>
  );
}