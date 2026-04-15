import { useState, useMemo } from "react";
import { useReceivables, useUpdateReceivable } from "@/hooks/useReceivables";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { compareProjectNumbers } from "@/lib/projectNumber";
import ReceivableDetailDialog from "@/components/ReceivableDetailDialog";
import { Search, DollarSign, AlertTriangle, TrendingUp, CalendarIcon, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, isBefore, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const receivableStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  lancado: "Lançado",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  pdd: "PDD",
};

const receivableStatusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  lancado: "bg-info/10 text-info",
  pago: "bg-success/10 text-success",
  atrasado: "bg-destructive/10 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
  pdd: "bg-destructive/20 text-destructive",
};

const editableStatuses = [
  { value: "pendente", label: "Pendente" },
  { value: "lancado", label: "Lançado" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
  { value: "pdd", label: "PDD" },
];

type ParcelaSortKey = "number" | "title" | "parcela" | "amount" | "nfe" | "due_date" | "invoice_date" | "status" | "paid_at";
type ProjectSortKey = "number" | "client" | "title" | "total" | "received" | "pending";
type SortDir = "asc" | "desc";

export default function ContasReceber() {
  const { data: receivables, isLoading } = useReceivables();
  const updateReceivable = useUpdateReceivable();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [payDate, setPayDate] = useState<Date | undefined>(new Date());
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<any | null>(null);
  const [parcelaSortKey, setParcelaSortKey] = useState<ParcelaSortKey | null>(null);
  const [parcelaSortDir, setParcelaSortDir] = useState<SortDir>("asc");
  const [projectSortKey, setProjectSortKey] = useState<ProjectSortKey | null>(null);
  const [projectSortDir, setProjectSortDir] = useState<SortDir>("asc");

  // Count total parcelas per proposal for X/Y format
  const parcelaTotals = useMemo(() => {
    if (!receivables) return new Map<string, number>();
    const map = new Map<string, number>();
    receivables.forEach((r) => {
      map.set(r.proposal_id, (map.get(r.proposal_id) || 0) + 1);
    });
    return map;
  }, [receivables]);

  // Derive effective status (overdue check)
  const enriched = useMemo(() => {
    if (!receivables) return [];
    const today = startOfDay(new Date());
    return receivables.map((r) => {
      let effectiveStatus = r.status;
      if (r.status === "pendente" && r.due_date && isBefore(new Date(r.due_date), today)) {
        effectiveStatus = "atrasado";
      }
      return { ...r, effectiveStatus };
    });
  }, [receivables]);

  // Filters
  const years = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((r) => {
      if (r.due_date) set.add(r.due_date.substring(0, 4));
      else {
        const pn = (r.proposals as any)?.proposal_number || "";
        const m = pn.match(/_(\d{2})$/);
        if (m) set.add("20" + m[1]);
      }
    });
    return Array.from(set).sort().reverse();
  }, [enriched]);

  const empresas = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((r) => {
      const e = (r.proposals as any)?.empresa;
      if (e) set.add(e);
    });
    return Array.from(set).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    const statusPriority: Record<string, number> = { atrasado: 0, pendente: 1, lancado: 2, pago: 3, cancelado: 4, pdd: 5 };
    return enriched
      .filter((r) => {
        const pn = (r.proposals as any)?.proposal_number || "";
        const clientName = (r.clients as any)?.name || "";
        const title = (r.proposals as any)?.title || "";
        const q = search.toLowerCase();
        if (q && !pn.toLowerCase().includes(q) && !clientName.toLowerCase().includes(q) && !title.toLowerCase().includes(q)) return false;
        if (statusFilter !== "all" && r.effectiveStatus !== statusFilter) return false;
        if (yearFilter !== "all") {
          const yr = r.due_date?.substring(0, 4) || "";
          const pnYr = pn.match(/_(\d{2})$/)?.[1];
          const fullYr = pnYr ? "20" + pnYr : "";
          if (yr !== yearFilter && fullYr !== yearFilter) return false;
        }
        if (empresaFilter !== "all" && (r.proposals as any)?.empresa !== empresaFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const sp = (statusPriority[a.effectiveStatus] ?? 1) - (statusPriority[b.effectiveStatus] ?? 1);
        if (sp !== 0) return sp;
        const da = a.due_date || "9999-12-31";
        const db = b.due_date || "9999-12-31";
        if (da !== db) return da.localeCompare(db);
        const pnA = (a.proposals as any)?.proposal_number || "";
        const pnB = (b.proposals as any)?.proposal_number || "";
        return -compareProjectNumbers(pnA, pnB);
      });
  }, [enriched, search, statusFilter, yearFilter, empresaFilter]);

  // Dashboard stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    let totalPendente = 0, totalPago = 0, totalAtrasado = 0, countAtrasado = 0, previsaoMes = 0;
    enriched.forEach((r) => {
      const amt = r.amount || 0;
      if (r.effectiveStatus === "pago") totalPago += amt;
      else if (r.effectiveStatus === "atrasado") { totalAtrasado += amt; countAtrasado++; totalPendente += amt; }
      else if (r.effectiveStatus === "cancelado" || r.effectiveStatus === "pdd") { /* skip */ }
      else { totalPendente += amt; }
      if (r.effectiveStatus !== "pago" && r.effectiveStatus !== "cancelado" && r.effectiveStatus !== "pdd" && r.due_date) {
        const d = new Date(r.due_date);
        if (d >= monthStart && d <= monthEnd) previsaoMes += amt;
      }
    });
    return { totalPendente, totalPago, totalAtrasado, countAtrasado, previsaoMes };
  }, [enriched]);

  // Project-level aggregation
  const byProject = useMemo(() => {
    const map = new Map<string, { proposalNumber: string; client: string; title: string; total: number; received: number; pending: number; items: typeof filtered }>();
    filtered.forEach((r) => {
      const pid = r.proposal_id;
      if (!map.has(pid)) {
        map.set(pid, {
          proposalNumber: (r.proposals as any)?.proposal_number || "",
          client: (r.clients as any)?.name || "",
          title: (r.proposals as any)?.title || "",
          total: 0, received: 0, pending: 0, items: [],
        });
      }
      const entry = map.get(pid)!;
      const amt = r.amount || 0;
      entry.total += amt;
      if (r.effectiveStatus === "pago") entry.received += amt;
      else entry.pending += amt;
      entry.items.push(r);
    });
    return Array.from(map.values()).sort((a, b) => -compareProjectNumbers(a.proposalNumber, b.proposalNumber));
  }, [filtered]);

  const handleMarkPaid = async (id: string) => {
    if (!payDate) return;
    try {
      await updateReceivable.mutateAsync({
        id,
        status: "pago",
        paid_at: format(payDate, "yyyy-MM-dd"),
      });
      setPayingId(null);
      toast({ title: "Parcela marcada como paga" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleUnmarkPaid = async (id: string) => {
    try {
      await updateReceivable.mutateAsync({ id, status: "pendente", paid_at: null });
      toast({ title: "Parcela revertida para pendente" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: any = { id, status: newStatus };
      if (newStatus !== "pago") {
        updates.paid_at = null;
      }
      await updateReceivable.mutateAsync(updates);
      toast({ title: `Status alterado para ${receivableStatusLabels[newStatus]}` });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleDateInline = async (id: string, field: string, date: Date) => {
    try {
      await updateReceivable.mutateAsync({ id, [field]: format(date, "yyyy-MM-dd") } as any);
      toast({ title: "Data atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const getParcelaLabel = (r: any) => {
    const total = parcelaTotals.get(r.proposal_id) || 1;
    const index = r.parcela_index + 1;
    return `${index}/${total}`;
  };

  const handleParcelaSort = (key: ParcelaSortKey) => {
    if (parcelaSortKey === key) setParcelaSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setParcelaSortKey(key); setParcelaSortDir("asc"); }
  };

  const handleProjectSort = (key: ProjectSortKey) => {
    if (projectSortKey === key) setProjectSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setProjectSortKey(key); setProjectSortDir("asc"); }
  };

  const ParcelaSortIcon = ({ col }: { col: ParcelaSortKey }) => {
    if (parcelaSortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return parcelaSortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const ProjectSortIcon = ({ col }: { col: ProjectSortKey }) => {
    if (projectSortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return projectSortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortedParcelas = useMemo(() => {
    if (!parcelaSortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (parcelaSortKey) {
        case "number": va = (a.proposals as any)?.proposal_number || ""; vb = (b.proposals as any)?.proposal_number || ""; break;
        case "title": va = (a.proposals as any)?.title || ""; vb = (b.proposals as any)?.title || ""; break;
        case "parcela": va = a.parcela_index; vb = b.parcela_index; break;
        case "amount": va = a.amount || 0; vb = b.amount || 0; break;
        case "nfe": va = a.nfe_number || ""; vb = b.nfe_number || ""; break;
        case "due_date": va = a.due_date || "9999"; vb = b.due_date || "9999"; break;
        case "invoice_date": va = a.invoice_date || "9999"; vb = b.invoice_date || "9999"; break;
        case "status": va = a.effectiveStatus; vb = b.effectiveStatus; break;
        case "paid_at": va = a.paid_at || "9999"; vb = b.paid_at || "9999"; break;
        default: va = ""; vb = "";
      }
      if (typeof va === "number" && typeof vb === "number") {
        return parcelaSortDir === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
      return parcelaSortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, parcelaSortKey, parcelaSortDir]);

  const sortedProjects = useMemo(() => {
    if (!projectSortKey) return byProject;
    return [...byProject].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (projectSortKey) {
        case "number": va = a.proposalNumber; vb = b.proposalNumber; break;
        case "client": va = a.client; vb = b.client; break;
        case "title": va = a.title; vb = b.title; break;
        case "total": va = a.total; vb = b.total; break;
        case "received": va = a.received; vb = b.received; break;
        case "pending": va = a.pending; vb = b.pending; break;
        default: va = ""; vb = "";
      }
      if (typeof va === "number" && typeof vb === "number") {
        return projectSortDir === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
      return projectSortDir === "asc" ? cmp : -cmp;
    });
  }, [byProject, projectSortKey, projectSortDir]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Contas a Receber</h1>

      {/* Dashboard Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" /> Total Pendente
            </div>
            <div className="text-xl font-bold">{formatCurrency(stats.totalPendente)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" /> Total Recebido
            </div>
            <div className="text-xl font-bold text-success">{formatCurrency(stats.totalPago)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <AlertTriangle className="h-4 w-4" /> Atrasadas
            </div>
            <div className="text-xl font-bold text-destructive">{stats.countAtrasado} ({formatCurrency(stats.totalAtrasado)})</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CalendarIcon className="h-4 w-4" /> Previsão do Mês
            </div>
            <div className="text-xl font-bold">{formatCurrency(stats.previsaoMes)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar projeto, cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="lancado">Lançado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="pdd">PDD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {empresas.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="parcelas">
        <TabsList>
          <TabsTrigger value="projetos">Por Projeto</TabsTrigger>
          <TabsTrigger value="parcelas">Por Parcela</TabsTrigger>
        </TabsList>

        <TabsContent value="projetos">
          <Card>
            <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleProjectSort("number")}>Nº Projeto <ProjectSortIcon col="number" /></button></TableHead>
                    <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleProjectSort("client")}>Cliente <ProjectSortIcon col="client" /></button></TableHead>
                    <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleProjectSort("title")}>Título <ProjectSortIcon col="title" /></button></TableHead>
                    <TableHead className="text-right"><button className="flex items-center ml-auto hover:text-foreground transition-colors" onClick={() => handleProjectSort("total")}>Valor Total <ProjectSortIcon col="total" /></button></TableHead>
                    <TableHead className="text-right"><button className="flex items-center ml-auto hover:text-foreground transition-colors" onClick={() => handleProjectSort("received")}>Recebido <ProjectSortIcon col="received" /></button></TableHead>
                    <TableHead className="text-right"><button className="flex items-center ml-auto hover:text-foreground transition-colors" onClick={() => handleProjectSort("pending")}>Pendente <ProjectSortIcon col="pending" /></button></TableHead>
                    <TableHead className="w-[120px]">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProjects.map((p) => {
                    const pct = p.total > 0 ? Math.round((p.received / p.total) * 100) : 0;
                    return (
                      <TableRow key={p.proposalNumber}>
                        <TableCell className="font-mono text-xs">{p.proposalNumber}</TableCell>
                        <TableCell>{p.client}</TableCell>
                        <TableCell>{p.title}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.total)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(p.received)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.pending)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {byProject.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parcelas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("number")}>Nº Projeto <ParcelaSortIcon col="number" /></button></TableHead>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("title")}>Nome do Projeto <ParcelaSortIcon col="title" /></button></TableHead>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("parcela")}>Parcela <ParcelaSortIcon col="parcela" /></button></TableHead>
                     <TableHead className="text-right"><button className="flex items-center ml-auto hover:text-foreground transition-colors" onClick={() => handleParcelaSort("amount")}>Valor <ParcelaSortIcon col="amount" /></button></TableHead>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("nfe")}># NFe <ParcelaSortIcon col="nfe" /></button></TableHead>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("due_date")}>Previsão <ParcelaSortIcon col="due_date" /></button></TableHead>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("invoice_date")}>Emissão <ParcelaSortIcon col="invoice_date" /></button></TableHead>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("status")}>Status <ParcelaSortIcon col="status" /></button></TableHead>
                     <TableHead><button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleParcelaSort("paid_at")}>Recebimento <ParcelaSortIcon col="paid_at" /></button></TableHead>
                     <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedParcelas.map((r) => {
                    const parcelaLabel = getParcelaLabel(r);
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedReceivable(r)}
                      >
                        <TableCell className="font-mono text-xs">{(r.proposals as any)?.proposal_number || "—"}</TableCell>
                         <TableCell className="max-w-[200px] truncate">{(r.proposals as any)?.title || "—"}</TableCell>
                         <TableCell className="font-mono text-sm">{parcelaLabel}</TableCell>
                         <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                         <TableCell className="text-xs">{r.nfe_number || "—"}</TableCell>
                         <TableCell onClick={(e) => e.stopPropagation()}>
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button variant="ghost" size="sm" className="h-7 px-1 text-xs font-normal gap-1">
                                 {r.due_date ? formatDate(r.due_date) : "—"}
                                 <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-3" align="start">
                               <Calendar mode="single" selected={r.due_date ? new Date(r.due_date + "T12:00:00") : undefined} onSelect={(d) => { if (d) handleDateInline(r.id, "due_date", d); }} locale={ptBR} />
                             </PopoverContent>
                           </Popover>
                         </TableCell>
                         <TableCell onClick={(e) => e.stopPropagation()}>
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button variant="ghost" size="sm" className="h-7 px-1 text-xs font-normal gap-1">
                                 {r.invoice_date ? formatDate(r.invoice_date) : "—"}
                                 <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-3" align="start">
                               <Calendar mode="single" selected={r.invoice_date ? new Date(r.invoice_date + "T12:00:00") : undefined} onSelect={(d) => { if (d) handleDateInline(r.id, "invoice_date", d); }} locale={ptBR} />
                             </PopoverContent>
                           </Popover>
                         </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={r.effectiveStatus === "atrasado" ? "pendente" : r.status}
                            onValueChange={(val) => handleStatusChange(r.id, val)}
                          >
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                              <Badge className={`${receivableStatusColors[r.effectiveStatus] || ""} text-xs`}>
                                {receivableStatusLabels[r.effectiveStatus] || r.effectiveStatus}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {editableStatuses.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{r.paid_at ? formatDate(r.paid_at) : "—"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {r.effectiveStatus === "pago" ? (
                            <Button variant="ghost" size="sm" onClick={() => handleUnmarkPaid(r.id)} title="Reverter">
                              ↩
                            </Button>
                          ) : (
                            <Popover open={payingId === r.id} onOpenChange={(open) => { setPayingId(open ? r.id : null); setPayDate(new Date()); }}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Check className="h-3 w-3 mr-1" /> Pagar
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3" align="end">
                                <p className="text-sm font-medium mb-2">Data de recebimento:</p>
                                <Calendar mode="single" selected={payDate} onSelect={setPayDate} locale={ptBR} />
                                <Button className="w-full mt-2" size="sm" onClick={() => handleMarkPaid(r.id)} disabled={!payDate}>
                                  Confirmar Pagamento
                                </Button>
                              </PopoverContent>
                            </Popover>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceivableDetailDialog
        receivable={selectedReceivable}
        parcelaLabel={selectedReceivable ? getParcelaLabel(selectedReceivable) : ""}
        open={!!selectedReceivable}
        onOpenChange={(open) => { if (!open) setSelectedReceivable(null); }}
      />
    </div>
  );
}
