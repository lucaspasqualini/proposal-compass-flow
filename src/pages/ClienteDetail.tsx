import { useParams, useNavigate } from "react-router-dom";
import { useClient, useUpdateClient } from "@/hooks/useClients";
import { useProposals } from "@/hooks/useProposals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, proposalStatusLabels, proposalStatusColors } from "@/lib/format";
import { ArrowLeft, Building2, FileText, FolderKanban, Save, Search } from "lucide-react";
import { useState, useEffect } from "react";
import CnpjLookupDialog from "@/components/CnpjLookupDialog";
import ProjectDetailDialog from "@/components/ProjectDetailDialog";

export default function ClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();
  const { data: allProposals } = useProposals();

  const { data: projects } = useQuery({
    queryKey: ["projects-by-client", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const proposals = allProposals?.filter((p) => p.client_id === id) ?? [];

  const [form, setForm] = useState({
    cnpj: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [cnpjDialogOpen, setCnpjDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setForm({
        cnpj: client.cnpj ?? "",
        contact_name: client.contact_name ?? "",
        email: client.email ?? "",
        phone: client.phone ?? "",
        address: client.address ?? "",
        notes: client.notes ?? "",
      });
    }
  }, [client]);

  const handleSave = async () => {
    try {
      await updateClient.mutateAsync({ id: id!, ...form });
      toast({ title: "Cliente atualizado" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!client) {
    return <div className="p-8 text-center text-muted-foreground">Cliente não encontrado</div>;
  }

  const wonProposals = proposals.filter((p) => p.status === "ganha");
  const totalValue = proposals.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const wonValue = wonProposals.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const conversionRate = proposals.length > 0 ? Math.round((wonProposals.length / proposals.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {client.cnpj}</p>}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Propostas</p>
            <p className="text-2xl font-bold">{proposals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Projetos</p>
            <p className="text-2xl font-bold">{projects?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor Ganho</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(wonValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversão</p>
            <p className="text-2xl font-bold">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="propostas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="propostas" className="gap-1">
            <FileText className="h-4 w-4" /> Propostas ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="projetos" className="gap-1">
            <FolderKanban className="h-4 w-4" /> Projetos ({projects?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
        </TabsList>

        <TabsContent value="propostas">
          <Card>
            <CardContent className="p-0">
              {proposals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhuma proposta para este cliente</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead className="hidden md:table-cell">Tipo</TableHead>
                      <TableHead className="hidden md:table-cell">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/propostas/${p.id}`)}
                      >
                        <TableCell className="font-mono text-xs">{p.proposal_number || "—"}</TableCell>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{(p as any).tipo_projeto || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatCurrency(Number(p.value))}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={proposalStatusColors[p.status]}>
                            {proposalStatusLabels[p.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {(p as any).data_envio ? formatDate((p as any).data_envio) : formatDate(p.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projetos">
          <Card>
            <CardContent className="p-0">
              {!projects?.length ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum projeto para este cliente</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Orçamento</TableHead>
                      <TableHead className="hidden md:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/projetos/${p.id}`)}
                      >
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatCurrency(Number(p.budget))}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatDate(p.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>CNPJ</Label>
                  <div className="flex gap-2">
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                    <Button type="button" variant="outline" size="icon" onClick={() => setCnpjDialogOpen(true)} title="Consultar CNPJ">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Contato</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={handleSave} disabled={updateClient.isPending} className="w-fit">
                <Save className="h-4 w-4 mr-1" /> Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CnpjLookupDialog
        open={cnpjDialogOpen}
        onOpenChange={setCnpjDialogOpen}
        onConfirm={(data) => {
          setForm((prev) => ({
            ...prev,
            cnpj: data.cnpj,
            address: data.address || prev.address,
            phone: data.phone || prev.phone,
            email: data.email || prev.email,
            contact_name: data.contact_name || prev.contact_name,
          }));
        }}
      />
    </div>
  );
}
