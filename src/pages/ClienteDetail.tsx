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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, proposalStatusLabels, proposalStatusColors } from "@/lib/format";
import { ArrowLeft, Building2, FileText, FolderKanban, Save, Search, Users, Briefcase, MapPin, Phone, Mail, Hash, Calendar, Scale, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import CnpjLookupDialog, { type CnpjConfirmData } from "@/components/CnpjLookupDialog";
import ProjectDetailDialog from "@/components/ProjectDetailDialog";
import ProposalDetailDialog from "@/components/ProposalDetailDialog";
import { ClientLogo } from "@/components/ClientLogo";
import { Globe } from "lucide-react";

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
    name: "",
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    notes: "",
    capital_social: null as number | null,
    natureza_juridica: "",
    cnae_principal: "",
    cnae_descricao: "",
    porte: "",
    data_abertura: "",
    situacao_cadastral: "",
    qsa: [] as Array<{ nome: string; qualificacao: string; data_entrada: string; faixa_etaria: string }>,
  });
  const [cnpjDialogOpen, setCnpjDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  // Filters
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState<string>("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name ?? "",
        cnpj: client.cnpj ?? "",
        razao_social: (client as any).razao_social ?? "",
        nome_fantasia: (client as any).nome_fantasia ?? "",
        contact_name: client.contact_name ?? "",
        email: client.email ?? "",
        phone: client.phone ?? "",
        website: (client as any).website ?? "",
        address: client.address ?? "",
        notes: client.notes ?? "",
        capital_social: (client as any).capital_social ?? null,
        natureza_juridica: (client as any).natureza_juridica ?? "",
        cnae_principal: (client as any).cnae_principal ?? "",
        cnae_descricao: (client as any).cnae_descricao ?? "",
        porte: (client as any).porte ?? "",
        data_abertura: (client as any).data_abertura ?? "",
        situacao_cadastral: (client as any).situacao_cadastral ?? "",
        qsa: (client as any).qsa ?? [],
      });
    }
  }, [client]);

  const filteredProposals = useMemo(() => {
    let list = proposals;
    if (proposalStatusFilter !== "all") list = list.filter((p) => p.status === proposalStatusFilter);
    if (proposalSearch) {
      const s = proposalSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          (p.proposal_number ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [proposals, proposalSearch, proposalStatusFilter]);

  const filteredProjects = useMemo(() => {
    let list = projects ?? [];
    if (projectStatusFilter !== "all") list = list.filter((p) => p.status === projectStatusFilter);
    if (projectSearch) {
      const s = projectSearch.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(s));
    }
    return list;
  }, [projects, projectSearch, projectStatusFilter]);

  const handleSave = async () => {
    try {
      await updateClient.mutateAsync({
        id: id!,
        name: form.name,
        cnpj: form.cnpj,
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone,
        website: form.website,
        address: form.address,
        notes: form.notes,
        capital_social: form.capital_social,
        natureza_juridica: form.natureza_juridica,
        cnae_principal: form.cnae_principal,
        cnae_descricao: form.cnae_descricao,
        porte: form.porte,
        data_abertura: form.data_abertura || null,
        situacao_cadastral: form.situacao_cadastral,
        qsa: form.qsa,
      } as any);
      toast({ title: "Cliente atualizado" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleCnpjConfirm = (data: CnpjConfirmData) => {
    setForm((prev) => ({
      ...prev,
      name: data.nome_fantasia || data.razao_social || prev.name,
      cnpj: data.cnpj,
      razao_social: data.razao_social || prev.razao_social,
      nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
      address: data.address || prev.address,
      phone: data.phone || prev.phone,
      email: data.email || prev.email,
      contact_name: data.contact_name || prev.contact_name,
      capital_social: data.capital_social ?? prev.capital_social,
      natureza_juridica: data.natureza_juridica || prev.natureza_juridica,
      cnae_principal: data.cnae_principal || prev.cnae_principal,
      cnae_descricao: data.cnae_descricao || prev.cnae_descricao,
      porte: data.porte || prev.porte,
      data_abertura: data.data_abertura || prev.data_abertura,
      situacao_cadastral: data.situacao_cadastral || prev.situacao_cadastral,
      qsa: data.qsa?.length ? data.qsa : prev.qsa,
    }));
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">Cliente não encontrado</div>;

  const wonProposals = proposals.filter((p) => p.status === "ganha");
  const totalValue = proposals.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const wonValue = wonProposals.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const conversionRate = proposals.length > 0 ? Math.round((wonProposals.length / proposals.length) * 100) : 0;

  const projectStatusLabelsMap: Record<string, string> = {
    em_andamento: "Em Andamento",
    em_pausa: "Em Pausa",
    aguardando_retorno: "Aguardando Retorno",
    finalizado: "Finalizado",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4">
          <ClientLogo
            client={{ name: client.name, website: (client as any).website, email: client.email }}
            size="lg"
          />
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

        {/* Propostas Tab */}
        <TabsContent value="propostas">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou número..."
                    className="pl-9"
                    value={proposalSearch}
                    onChange={(e) => setProposalSearch(e.target.value)}
                  />
                </div>
                <Select value={proposalStatusFilter} onValueChange={setProposalStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(proposalStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredProposals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhuma proposta encontrada</div>
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
                    {filteredProposals.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProposalId(p.id)}>
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

        {/* Projetos Tab */}
        <TabsContent value="projetos">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título..."
                    className="pl-9"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                </div>
                <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(projectStatusLabelsMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredProjects.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum projeto encontrado</div>
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
                    {filteredProjects.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProjectId(p.id)}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{projectStatusLabelsMap[p.status] ?? p.status}</Badge>
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

        {/* Dados Cadastrais Tab */}
        <TabsContent value="dados">
          <div className="space-y-6">
            {/* Informações da Empresa */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Informações da Empresa
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCnpjDialogOpen(true)}>
                    <Search className="h-4 w-4 mr-1" /> Consultar CNPJ
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="font-semibold">Nome do Cliente (usado no sistema)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome exibido no sistema" />
                  <p className="text-xs text-muted-foreground">Preenchido automaticamente pelo Nome Fantasia ao consultar CNPJ, mas pode ser editado manualmente.</p>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1"><Hash className="h-3 w-3" /> CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Situação Cadastral</Label>
                    <Input value={form.situacao_cadastral} onChange={(e) => setForm({ ...form, situacao_cadastral: e.target.value })} placeholder="ATIVA" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Razão Social</Label>
                  <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} placeholder="Razão social completa" />
                </div>
                <div className="grid gap-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} placeholder="Nome fantasia" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Natureza Jurídica</Label>
                    <Input value={form.natureza_juridica} onChange={(e) => setForm({ ...form, natureza_juridica: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Capital Social</Label>
                    <Input
                      type="number"
                      value={form.capital_social ?? ""}
                      onChange={(e) => setForm({ ...form, capital_social: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Porte</Label>
                    <Input value={form.porte} onChange={(e) => setForm({ ...form, porte: e.target.value })} placeholder="Ex: ME, EPP, DEMAIS" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> CNAE Principal</Label>
                    <Input value={form.cnae_principal} onChange={(e) => setForm({ ...form, cnae_principal: e.target.value })} placeholder="Código" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição CNAE</Label>
                    <Input value={form.cnae_descricao} onChange={(e) => setForm({ ...form, cnae_descricao: e.target.value })} placeholder="Descrição da atividade" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Data de Abertura</Label>
                  <Input type="date" value={form.data_abertura} onChange={(e) => setForm({ ...form, data_abertura: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            {/* Contato e Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Contato e Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1"><Users className="h-3 w-3" /> Nome do Contato</Label>
                    <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Website</Label>
                    <Input
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="empresa.com.br"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Endereço</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            {/* Quadro Societário */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" /> Quadro Societário e Administração
                  {form.qsa.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{form.qsa.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {form.qsa.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum sócio ou administrador cadastrado. Consulte o CNPJ para importar automaticamente.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Qualificação</TableHead>
                        <TableHead className="hidden md:table-cell">Entrada</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.qsa.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{s.qualificacao}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{s.data_entrada ? formatDate(s.data_entrada) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotações gerais sobre o cliente..." />
                <Button onClick={handleSave} disabled={updateClient.isPending} className="w-fit">
                  <Save className="h-4 w-4 mr-1" /> Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CnpjLookupDialog
        open={cnpjDialogOpen}
        onOpenChange={setCnpjDialogOpen}
        onConfirm={handleCnpjConfirm}
      />
      <ProjectDetailDialog
        projectId={selectedProjectId}
        open={!!selectedProjectId}
        onOpenChange={(open) => { if (!open) setSelectedProjectId(null); }}
      />
      <ProposalDetailDialog
        proposalId={selectedProposalId}
        open={!!selectedProposalId}
        onOpenChange={(open) => { if (!open) setSelectedProposalId(null); }}
      />
    </div>
  );
}
