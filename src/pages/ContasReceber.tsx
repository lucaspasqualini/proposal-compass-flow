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
import { Search, DollarSign, AlertTriangle, TrendingUp, CalendarIcon, Check } from "lucide-react";
import { format, isBefore, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const receivableStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

const receivableStatusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  pago: "bg-success/10 text-success",
  atrasado: "bg-destructive/10 text-destructive",
};

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
    const statusPriority: Record<string, number> = { atrasado: 0, pendente: 1, pago: 2 };
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
      else { totalPendente += amt; }
      if (r.effectiveStatus !== "pago" && r.due_date) {
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
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
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
                    <TableHead>Nº Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                    <TableHead className="w-[120px]">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byProject.map((p) => {
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
                    <TableHead>Nº Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recebimento</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{(r.proposals as any)?.proposal_number || "—"}</TableCell>
                      <TableCell>{(r.clients as any)?.name || "—"}</TableCell>
                      <TableCell>{r.description || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                      <TableCell>{formatDate(r.due_date)}</TableCell>
                      <TableCell>
                        <Badge className={receivableStatusColors[r.effectiveStatus] || ""}>
                          {receivableStatusLabels[r.effectiveStatus] || r.effectiveStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.paid_at ? formatDate(r.paid_at) : "—"}</TableCell>
                      <TableCell>
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
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
