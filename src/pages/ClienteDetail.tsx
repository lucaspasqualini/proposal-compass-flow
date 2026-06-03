import { useParams, useNavigate } from "react-router-dom";
import { useClient, useUpdateClient } from "@/hooks/useClients";
import { useProposals } from "@/hooks/useProposals";
import {
  useClientContacts,
  useCreateClientContact,
  useDeleteClientContact,
} from "@/hooks/useClientContacts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  formatCurrency,
  formatDate,
  proposalStatusLabels,
  proposalStatusColors,
} from "@/lib/format";
import {
  ArrowLeft,
  Building2,
  FileText,
  FolderKanban,
  Save,
  Search,
  Users,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Hash,
  Calendar,
  Linkedin as LinkedinIcon,
  Globe,
  Receipt,
  Plus,
  Trash2,
  ChevronRight,
  Factory,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import CnpjLookupDialog, { type CnpjConfirmData } from "@/components/CnpjLookupDialog";
import ProjectDetailDialog from "@/components/ProjectDetailDialog";
import ProposalDetailDialog from "@/components/ProposalDetailDialog";
import { ClientLogo } from "@/components/ClientLogo";
import { useUserRole } from "@/hooks/useUserRole";

const RECEIVABLE_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  pago: "Pago",
  cancelado: "Cancelado",
  atrasado: "Atrasado",
};

function normalizeUrl(value?: string | null) {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export default function ClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConsultor } = useUserRole();
  const canEdit = !isConsultor;
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();
  const { data: allProposals } = useProposals();
  const { data: contacts } = useClientContacts(id);
  const createContact = useCreateClientContact();
  const deleteContact = useDeleteClientContact();

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

  const { data: receivables } = useQuery({
    queryKey: ["receivables-by-client", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables")
        .select(
          "id, description, amount, due_date, status, paid_at, parcela_label, proposal_id, proposals(proposal_number, title)"
        )
        .eq("client_id", id!)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
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
    linkedin: "",
    industria: "",
    address: "",
    notes: "",
    capital_social: null as number | null,
    natureza_juridica: "",
    cnae_principal: "",
    cnae_descricao: "",
    porte: "",
    data_abertura: "",
    situacao_cadastral: "",
    qsa: [] as Array<{
      nome: string;
      qualificacao: string;
      data_entrada: string;
      faixa_etaria: string;
    }>,
    cnpjs_vinculados: [] as Array<{ cnpj: string; razao_social?: string | null; label?: string | null; contact_name?: string | null; email?: string | null; contacts?: Array<{ name: string; email?: string | null }> }>,
  });
  const [cnpjDialogOpen, setCnpjDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  // Filters
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState<string>("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");
  const [receivableStatusFilter, setReceivableStatusFilter] = useState<string>("all");
  const [contactSearch, setContactSearch] = useState("");

  // New contact dialog
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    cargo: "",
    email: "",
    phone: "",
    linkedin: "",
  });

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
        linkedin: (client as any).linkedin ?? "",
        industria: (client as any).industria ?? "",
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
        cnpjs_vinculados: (client as any).cnpjs_vinculados ?? [],
      });
    }
  }, [client]);

  const filteredProposals = useMemo(() => {
    let list = proposals;
    if (proposalStatusFilter !== "all")
      list = list.filter((p) => p.status === proposalStatusFilter);
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
    if (projectStatusFilter !== "all")
      list = list.filter((p) => p.status === projectStatusFilter);
    if (projectSearch) {
      const s = projectSearch.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(s));
    }
    return list;
  }, [projects, projectSearch, projectStatusFilter]);

  const filteredReceivables = useMemo(() => {
    let list = receivables ?? [];
    if (receivableStatusFilter !== "all")
      list = list.filter((r) => r.status === receivableStatusFilter);
    return list;
  }, [receivables, receivableStatusFilter]);

  const filteredContacts = useMemo(() => {
    let list = contacts ?? [];
    if (contactSearch) {
      const s = contactSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.cargo ?? "").toLowerCase().includes(s) ||
          (c.email ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [contacts, contactSearch]);

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
        linkedin: form.linkedin,
        industria: form.industria,
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
        cnpjs_vinculados: form.cnpjs_vinculados,
      } as any);
      toast({ title: "Empresa atualizada" });
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

  const handleCreateContact = async () => {
    if (!id || !newContact.name.trim()) return;
    try {
      await createContact.mutateAsync({
        client_id: id,
        name: newContact.name.trim(),
        cargo: newContact.cargo.trim() || null,
        email: newContact.email.trim() || null,
        phone: newContact.phone.trim() || null,
        linkedin: newContact.linkedin.trim() || null,
      });
      toast({ title: "Contato criado" });
      setNewContact({ name: "", cargo: "", email: "", phone: "", linkedin: "" });
      setNewContactOpen(false);
    } catch {
      toast({ title: "Erro ao criar contato", variant: "destructive" });
    }
  };

  const handleDeleteContact = async (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    if (!id) return;
    try {
      await deleteContact.mutateAsync({ id: contactId, clientId: id });
      toast({ title: "Contato removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  if (isLoading)
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!client)
    return <div className="p-8 text-center text-muted-foreground">Empresa não encontrada</div>;

  const wonProposals = proposals.filter((p) => p.status === "ganha");
  const totalValue = proposals.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const wonValue = wonProposals.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const conversionRate =
    proposals.length > 0
      ? Math.round((wonProposals.length / proposals.length) * 100)
      : 0;

  const projectStatusLabelsMap: Record<string, string> = {
    em_andamento: "Em Andamento",
    em_pausa: "Em Pausa",
    aguardando_retorno: "Aguardando Retorno",
    finalizado: "Finalizado",
  };

  const websiteUrl = normalizeUrl(form.website);
  const linkedinUrl = normalizeUrl(form.linkedin);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-start gap-4 flex-1">
          <ClientLogo
            client={{ name: client.name, website: (client as any).website, email: client.email }}
            size="lg"
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.cnpj && (
              <p className="text-sm text-muted-foreground">CNPJ: {client.cnpj}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary hover:underline"
                  >
                    {form.website}
                  </a>
                ) : (
                  <span className="italic">Site não informado</span>
                )}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <LinkedinIcon className="h-3.5 w-3.5" />
                {linkedinUrl ? (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary hover:underline"
                  >
                    Linkedin
                  </a>
                ) : (
                  <span className="italic">Linkedin não informado</span>
                )}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Factory className="h-3.5 w-3.5" />
                {form.industria ? (
                  <span>{form.industria}</span>
                ) : (
                  <span className="italic">Indústria não informada</span>
                )}
              </span>
            </div>
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

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="contatos" className="gap-1">
            <Users className="h-4 w-4" /> Contatos ({contacts?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="propostas" className="gap-1">
            <FileText className="h-4 w-4" /> Propostas ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="projetos" className="gap-1">
            <FolderKanban className="h-4 w-4" /> Projetos ({projects?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="receber" className="gap-1">
            <Receipt className="h-4 w-4" /> Contas a Receber ({receivables?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Dados Cadastrais Tab */}
        <TabsContent value="dados">
          <fieldset disabled={!canEdit} className="contents">
            <div className="space-y-6">
              {/* Informações da Empresa */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" /> Informações da Empresa
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCnpjDialogOpen(true)}
                    >
                      <Search className="h-4 w-4 mr-1" /> Consultar CNPJ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="font-semibold">Nome (usado no sistema)</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nome exibido no sistema"
                    />
                    <p className="text-xs text-muted-foreground">
                      Preenchido automaticamente pelo Nome Fantasia ao consultar CNPJ, mas pode
                      ser editado manualmente.
                    </p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <Hash className="h-3 w-3" /> CNPJ
                      </Label>
                      <Input
                        value={form.cnpj}
                        onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Situação Cadastral</Label>
                      <Input
                        value={form.situacao_cadastral}
                        onChange={(e) =>
                          setForm({ ...form, situacao_cadastral: e.target.value })
                        }
                        placeholder="ATIVA"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Razão Social</Label>
                    <Input
                      value={form.razao_social}
                      onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                      placeholder="Razão social completa"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nome Fantasia</Label>
                    <Input
                      value={form.nome_fantasia}
                      onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                      placeholder="Nome fantasia"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Natureza Jurídica</Label>
                      <Input
                        value={form.natureza_juridica}
                        onChange={(e) =>
                          setForm({ ...form, natureza_juridica: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Capital Social</Label>
                      <Input
                        type="number"
                        value={form.capital_social ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            capital_social: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Porte</Label>
                      <Input
                        value={form.porte}
                        onChange={(e) => setForm({ ...form, porte: e.target.value })}
                        placeholder="Ex: ME, EPP, DEMAIS"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> CNAE Principal
                      </Label>
                      <Input
                        value={form.cnae_principal}
                        onChange={(e) =>
                          setForm({ ...form, cnae_principal: e.target.value })
                        }
                        placeholder="Código"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Descrição CNAE</Label>
                      <Input
                        value={form.cnae_descricao}
                        onChange={(e) =>
                          setForm({ ...form, cnae_descricao: e.target.value })
                        }
                        placeholder="Descrição da atividade"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1">
                      <Factory className="h-3 w-3" /> Indústria
                    </Label>
                    <Input
                      value={form.industria}
                      onChange={(e) => setForm({ ...form, industria: e.target.value })}
                      placeholder="Ex: Tecnologia, Varejo, Saúde"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Data de Abertura
                    </Label>
                    <Input
                      type="date"
                      value={form.data_abertura}
                      onChange={(e) =>
                        setForm({ ...form, data_abertura: e.target.value })
                      }
                    />
                  </div>

                  <Separator />

                  {/* Contato e endereço — mesclados aqui */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Site
                      </Label>
                      <Input
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="empresa.com.br"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <LinkedinIcon className="h-3 w-3" /> Linkedin
                      </Label>
                      <Input
                        value={form.linkedin}
                        onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                        placeholder="linkedin.com/company/..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email principal
                      </Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Telefone principal
                      </Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Endereço
                    </Label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* CNPJs Vinculados (faturamento) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hash className="h-5 w-5" /> CNPJs Vinculados
                      {form.cnpjs_vinculados.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{form.cnpjs_vinculados.length}</Badge>
                      )}
                    </CardTitle>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm({
                            ...form,
                            cnpjs_vinculados: [...form.cnpjs_vinculados, { cnpj: "", razao_social: "", label: "", contact_name: "", email: "" }],
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" /> Adicionar CNPJ
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    CNPJs adicionais usados para faturamento (além do CNPJ principal). Adicionados automaticamente
                    quando um CNPJ diferente é informado em Contas a Receber, com razão social buscada via consulta CNPJ.
                  </p>
                  {form.cnpjs_vinculados.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum CNPJ vinculado.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {form.cnpjs_vinculados.map((v, i) => (
                        <div key={i} className="rounded-md border p-3 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_1fr_auto] gap-2 items-center">
                            <Input
                              value={v.cnpj}
                              onChange={(e) => {
                                const arr = [...form.cnpjs_vinculados];
                                arr[i] = { ...arr[i], cnpj: e.target.value };
                                setForm({ ...form, cnpjs_vinculados: arr });
                              }}
                              placeholder="00.000.000/0000-00"
                              className="font-mono text-sm"
                            />
                            <Input
                              value={v.razao_social ?? ""}
                              onChange={(e) => {
                                const arr = [...form.cnpjs_vinculados];
                                arr[i] = { ...arr[i], razao_social: e.target.value };
                                setForm({ ...form, cnpjs_vinculados: arr });
                              }}
                              placeholder="Razão social"
                              className="text-sm"
                            />
                            <Input
                              value={v.label ?? ""}
                              onChange={(e) => {
                                const arr = [...form.cnpjs_vinculados];
                                arr[i] = { ...arr[i], label: e.target.value };
                                setForm({ ...form, cnpjs_vinculados: arr });
                              }}
                              placeholder="Apelido (ex: Filial SP)"
                              className="text-sm"
                            />
                            {canEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    cnpjs_vinculados: form.cnpjs_vinculados.filter((_, idx) => idx !== i),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              value={v.contact_name ?? ""}
                              onChange={(e) => {
                                const arr = [...form.cnpjs_vinculados];
                                arr[i] = { ...arr[i], contact_name: e.target.value };
                                setForm({ ...form, cnpjs_vinculados: arr });
                              }}
                              placeholder="Contato vinculado a este CNPJ"
                              className="text-sm"
                            />
                            <Input
                              value={v.email ?? ""}
                              onChange={(e) => {
                                const arr = [...form.cnpjs_vinculados];
                                arr[i] = { ...arr[i], email: e.target.value };
                                setForm({ ...form, cnpjs_vinculados: arr });
                              }}
                              placeholder="Email do contato"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quadro Societário */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" /> Quadro Societário e Administração
                    {form.qsa.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {form.qsa.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {form.qsa.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum sócio ou administrador cadastrado. Consulte o CNPJ para importar
                      automaticamente.
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
                            <TableCell className="hidden md:table-cell">
                              {s.data_entrada ? formatDate(s.data_entrada) : "—"}
                            </TableCell>
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
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Anotações gerais sobre a empresa..."
                  />
                  {canEdit && (
                    <Button
                      onClick={handleSave}
                      disabled={updateClient.isPending}
                      className="w-fit"
                    >
                      <Save className="h-4 w-4 mr-1" /> Salvar Alterações
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </fieldset>
        </TabsContent>

        {/* Contatos Tab */}
        <TabsContent value="contatos">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, cargo ou email..."
                    className="pl-9"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                </div>
                {canEdit && (
                  <Button onClick={() => setNewContactOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Novo Contato
                  </Button>
                )}
              </div>
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum contato cadastrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Telefone</TableHead>
                      <TableHead className="hidden lg:table-cell">Última interação</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/clientes/${id}/contatos/${c.id}`)
                        }
                      >
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.cargo || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {c.phone || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {c.last_interaction_at
                            ? `${formatDate(c.last_interaction_at)}${
                                c.last_interaction_type
                                  ? ` — ${c.last_interaction_type}`
                                  : ""
                              }`
                            : "—"}
                        </TableCell>
                        <TableCell className="flex items-center gap-1 justify-end">
                          {canEdit && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover contato?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => handleDeleteContact(e, c.id)}
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                <Select
                  value={proposalStatusFilter}
                  onValueChange={setProposalStatusFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(proposalStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredProposals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma proposta encontrada
                </div>
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
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedProposalId(p.id)}
                      >
                        <TableCell className="font-mono text-xs">
                          {p.proposal_number || "—"}
                        </TableCell>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {(p as any).tipo_projeto || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(Number(p.value))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={proposalStatusColors[p.status]}>
                            {proposalStatusLabels[p.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {(p as any).data_envio
                            ? formatDate((p as any).data_envio)
                            : formatDate(p.created_at)}
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
                <Select
                  value={projectStatusFilter}
                  onValueChange={setProjectStatusFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(projectStatusLabelsMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredProjects.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum projeto encontrado
                </div>
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
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedProjectId(p.id)}
                      >
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {projectStatusLabelsMap[p.status] ?? p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(Number(p.budget))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(p.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contas a Receber Tab */}
        <TabsContent value="receber">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end">
                <Select
                  value={receivableStatusFilter}
                  onValueChange={setReceivableStatusFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(RECEIVABLE_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredReceivables.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma conta a receber encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proposta</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                      <TableHead className="hidden md:table-cell">Valor</TableHead>
                      <TableHead className="hidden lg:table-cell">Recebido em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.map((r: any) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => r.proposal_id && setSelectedProposalId(r.proposal_id)}
                      >
                        <TableCell className="font-mono text-xs">
                          {r.proposals?.proposal_number || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.parcela_label || r.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {RECEIVABLE_STATUS_LABELS[r.status] ?? r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {r.due_date ? formatDate(r.due_date) : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(Number(r.amount) || 0)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {r.paid_at ? formatDate(r.paid_at) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
        onOpenChange={(open) => {
          if (!open) setSelectedProjectId(null);
        }}
      />
      <ProposalDetailDialog
        proposalId={selectedProposalId}
        open={!!selectedProposalId}
        onOpenChange={(open) => {
          if (!open) setSelectedProposalId(null);
        }}
      />

      {/* New contact dialog */}
      <Dialog open={newContactOpen} onOpenChange={setNewContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
            <DialogDescription>
              Adicione um contato vinculado a esta empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input
                value={newContact.name}
                onChange={(e) =>
                  setNewContact({ ...newContact, name: e.target.value })
                }
                placeholder="Nome completo"
              />
            </div>
            <div className="grid gap-2">
              <Label>Cargo</Label>
              <Input
                value={newContact.cargo}
                onChange={(e) =>
                  setNewContact({ ...newContact, cargo: e.target.value })
                }
                placeholder="Ex: Diretor de TI"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Linkedin</Label>
              <Input
                value={newContact.linkedin}
                onChange={(e) =>
                  setNewContact({ ...newContact, linkedin: e.target.value })
                }
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <Button
              disabled={!newContact.name.trim() || createContact.isPending}
              onClick={handleCreateContact}
            >
              Salvar Contato
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
