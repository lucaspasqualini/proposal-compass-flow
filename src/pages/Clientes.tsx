import { useState, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useNavigate } from "react-router-dom";
import { useCreateClient, useDeleteClient } from "@/hooks/useClients";
import { useClientsWithStats } from "@/hooks/useClientStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Building2, FileText, FolderKanban, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClientLogo } from "@/components/ClientLogo";
import { useUserRole } from "@/hooks/useUserRole";

type SortKey = "name" | "proposal_count" | "project_count" | "won_value" | "last_proposal_date";
type SortDir = "asc" | "desc";

export default function Clientes() {
  const { isConsultor } = useUserRole();
  const canEdit = !isConsultor;
  const { data: clients, isLoading } = useClientsWithStats();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = usePersistedState("clientes:search", "");
  const [sortKey, setSortKey] = usePersistedState<SortKey>("clientes:sortKey", "name");
  const [sortDir, setSortDir] = usePersistedState<SortDir>("clientes:sortDir", "asc");
  const [showNew, setShowNew] = useState(false);
  const [filterCnpj, setFilterCnpj] = usePersistedState<"all" | "sem_cnpj" | "com_cnpj">("clientes:filterCnpj", "all");
  const [newName, setNewName] = useState("");
  const [newCnpj, setNewCnpj] = useState("");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    if (!clients) return [];
    const s = search.toLowerCase();
    let list = clients.filter(
      (c) => c.name.toLowerCase().includes(s) || (c.cnpj ?? "").toLowerCase().includes(s)
    );
    if (filterCnpj === "sem_cnpj") list = list.filter((c) => !c.cnpj);
    if (filterCnpj === "com_cnpj") list = list.filter((c) => !!c.cnpj);
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "name": va = a.name; vb = b.name; break;
        case "proposal_count": va = a.proposal_count; vb = b.proposal_count; break;
        case "project_count": va = a.project_count; vb = b.project_count; break;
        case "won_value": va = a.won_value; vb = b.won_value; break;
        case "last_proposal_date": va = a.last_proposal_date ?? ""; vb = b.last_proposal_date ?? ""; break;
      }
      if (typeof va === "string") {
        const cmp = va.localeCompare(vb, "pt-BR", { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [clients, search, sortKey, sortDir, filterCnpj]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteClient.mutateAsync(id);
      toast({ title: "Cliente removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createClient.mutateAsync({ name: newName.trim(), cnpj: newCnpj.trim() || null });
      toast({ title: "Cliente criado" });
      setNewName("");
      setNewCnpj("");
      setShowNew(false);
    } catch {
      toast({ title: "Erro ao criar", variant: "destructive" });
    }
  };

  // Summary stats
  const totalClients = clients?.length ?? 0;
  const activeClients = clients?.filter((c) => c.is_active).length ?? 0;
  const totalRevenue = clients?.reduce((s, c) => s + c.won_value, 0) ?? 0;
  const semCnpj = clients?.filter((c) => !c.cnpj).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Cliente
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary opacity-60" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold">{totalClients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary opacity-60" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Ativos</p>
              <p className="text-xl font-bold">{activeClients}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary opacity-60" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita Total (Propostas Ganhas)</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou CNPJ..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterCnpj === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCnpj("all")}
          >
            Todos ({totalClients})
          </Button>
          <Button
            variant={filterCnpj === "sem_cnpj" ? "destructive" : "outline"}
            size="sm"
            onClick={() => setFilterCnpj("sem_cnpj")}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Sem CNPJ ({semCnpj})
          </Button>
          <Button
            variant={filterCnpj === "com_cnpj" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCnpj("com_cnpj")}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Com CNPJ ({totalClients - semCnpj})
          </Button>
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
                    <TableHead className="w-[52px]"></TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      <span className="flex items-center">Cliente <SortIcon col="name" /></span>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                    <TableHead className="cursor-pointer select-none text-center" onClick={() => toggleSort("proposal_count")}>
                      <span className="flex items-center justify-center">Propostas <SortIcon col="proposal_count" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-center hidden sm:table-cell" onClick={() => toggleSort("project_count")}>
                      <span className="flex items-center justify-center">Projetos <SortIcon col="project_count" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("won_value")}>
                      <span className="flex items-center">Valor Ganho <SortIcon col="won_value" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden lg:table-cell whitespace-nowrap" onClick={() => toggleSort("last_proposal_date")}>
                      <span className="flex items-center">Última Proposta <SortIcon col="last_proposal_date" /></span>
                    </TableHead>
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/clientes/${c.id}`)}>
                      <TableCell className="py-2">
                        <ClientLogo
                          client={{ name: c.name, website: (c as any).website, email: (c as any).email }}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {c.cnpj ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {c.cnpj}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-500">
                            <AlertCircle className="h-3 w-3" />
                            Pendente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{c.proposal_count}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{c.project_count}</TableCell>
                      <TableCell className="hidden md:table-cell">{c.won_value > 0 ? formatCurrency(c.won_value) : "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{c.last_proposal_date ? formatDate(c.last_proposal_date) : "—"}</TableCell>
                      <TableCell>
                        {canEdit && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => handleDelete(e, c.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New client dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Adicione um novo cliente à sua base.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div className="grid gap-2">
              <Label>CNPJ</Label>
              <Input value={newCnpj} onChange={(e) => setNewCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <Button disabled={!newName.trim() || createClient.isPending} onClick={handleCreate}>
              Salvar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
