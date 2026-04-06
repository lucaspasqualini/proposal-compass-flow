import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useProposal, useCreateProposal, useUpdateProposal } from "@/hooks/useProposals";
import { useClients } from "@/hooks/useClients";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { proposalStatusLabels } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Plus, ExternalLink, Trash2, FileDown } from "lucide-react";
import { generateProposalPptx } from "@/lib/generateProposalPptx";
import type { Database } from "@/integrations/supabase/types";
import { useCreateClient } from "@/hooks/useClients";

type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];

interface Parcela {
  descricao: string;
  valor: number | null;
  data_vencimento: string;
}

const emptyParcela: Parcela = { descricao: "", valor: null, data_vencimento: "" };

export default function PropostaForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { data: existing, isLoading } = useProposal(id);
  const { data: clients } = useClients();
  const { user } = useAuth();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const createProject = useCreateProject();
  const createClient = useCreateClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const [form, setForm] = useState<ProposalInsert & { empresa?: string; payment_type?: string }>({
    title: "",
    client_id: null,
    description: "",
    scope: "",
    value: null,
    status: "em_elaboracao",
    validity_date: null,
    payment_terms: "",
    created_by: null,
    tipo_projeto: "",
    data_envio: null,
    data_aprovacao: null,
    data_fup: null,
    cliente_contato: null,
    indicador: "",
    observacoes: "",
    empresa: "",
    payment_type: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        client_id: existing.client_id,
        description: existing.description,
        scope: existing.scope,
        value: existing.value,
        status: existing.status,
        validity_date: existing.validity_date,
        payment_terms: existing.payment_terms,
        created_by: existing.created_by,
        tipo_projeto: existing.tipo_projeto ?? "",
        data_envio: existing.data_envio,
        data_aprovacao: existing.data_aprovacao,
        data_fup: existing.data_fup,
        cliente_contato: existing.cliente_contato ?? null,
        indicador: existing.indicador ?? "",
        observacoes: existing.observacoes ?? "",
        empresa: (existing as any).empresa ?? "",
        payment_type: (existing as any).payment_type ?? "",
      });
      const saved = (existing as any).parcelas;
      if (Array.isArray(saved) && saved.length > 0) {
        setParcelas(saved);
      }
    }
  }, [existing]);

  // Pre-fill description from last proposal for selected client
  useEffect(() => {
    if (!form.client_id || isEdit) return;
    const fetchLastDescription = async () => {
      const { data } = await supabase
        .from("proposals")
        .select("description")
        .eq("client_id", form.client_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.description) {
        setForm((prev) => ({ ...prev, description: data.description }));
      }
    };
    fetchLastDescription();
  }, [form.client_id, isEdit]);

  const addParcela = () => {
    if (parcelas.length >= 5) return;
    setParcelas([...parcelas, { ...emptyParcela }]);
  };

  const updateParcela = (idx: number, field: keyof Parcela, value: any) => {
    setParcelas((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const removeParcela = (idx: number) => {
    setParcelas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        ...form,
        parcelas: parcelas.length > 0 ? parcelas : [],
      } as any;

      if (isEdit) {
        const oldStatus = existing?.status;
        await updateProposal.mutateAsync({ id: id!, ...payload });
        toast({ title: "Proposta atualizada" });

        if (form.status === "ganha" && oldStatus !== "ganha") {
          try {
            await createProject.mutateAsync({
              title: form.title,
              client_id: form.client_id,
              proposal_id: id!,
              description: form.description,
              budget: form.value,
              status: "em_andamento",
            });
            toast({ title: "Projeto criado automaticamente!" });
          } catch {
            toast({ title: "Erro ao criar projeto automaticamente", variant: "destructive" });
          }
        }
      } else {
        await createProposal.mutateAsync({ ...payload, created_by: user?.id ?? null });
        toast({ title: "Proposta criada" });
      }
      navigate("/propostas");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (isEdit && isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const selectedClient = clients?.find((c) => c.id === form.client_id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Editar Proposta" : "Nova Proposta"}</h1>
          {isEdit && existing?.proposal_number && (
            <p className="text-sm text-muted-foreground">Código: {existing.proposal_number}</p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          {/* Código */}
          {isEdit && (
            <div className="grid gap-2">
              <Label>Código</Label>
              <Input value={existing?.proposal_number ?? ""} disabled />
            </div>
          )}

          {/* Projeto */}
          <div className="grid gap-2">
            <Label>Projeto *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          {/* Tipo de Projeto */}
          <div className="grid gap-2">
            <Label>Tipo de Projeto</Label>
            <Input
              value={form.tipo_projeto ?? ""}
              onChange={(e) => setForm({ ...form, tipo_projeto: e.target.value })}
              placeholder="Ex: Consultoria, Auditoria, Assessoria..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data de Envio</Label>
              <Input type="date" value={form.data_envio ?? ""} onChange={(e) => setForm({ ...form, data_envio: e.target.value || null })} />
            </div>
            <div className="grid gap-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(proposalStatusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Data de Aprovação</Label>
              <Input type="date" value={form.data_aprovacao ?? ""} onChange={(e) => setForm({ ...form, data_aprovacao: e.target.value || null })} />
            </div>
          </div>

          {/* Data FUP */}
          <div className="grid gap-2">
            <Label>Data de Follow-up</Label>
            <Input type="date" value={form.data_fup ?? ""} onChange={(e) => setForm({ ...form, data_fup: e.target.value || null })} />
          </div>

          {/* Empresa */}
          <div className="grid gap-2">
            <Label>Empresa</Label>
            <Select value={form.empresa ?? ""} onValueChange={(v) => setForm({ ...form, empresa: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Valore Empresarial">Valore Empresarial</SelectItem>
                <SelectItem value="Meden Goiania">Meden Goiania</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cliente + link */}
          <div className="grid gap-2">
            <Label>Cliente</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={form.client_id ?? ""} onValueChange={(v) => {
                  if (v === "__new__") { setShowNewClient(true); return; }
                  setForm({ ...form, client_id: v || null });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Adicionar novo cliente</span>
                    </SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClient && (
                <Button variant="outline" size="icon" asChild>
                  <Link to={`/clientes/${selectedClient.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Indicador */}
          <div className="grid gap-2">
            <Label>Indicador</Label>
            <Input value={form.indicador ?? ""} onChange={(e) => setForm({ ...form, indicador: e.target.value })} placeholder="Quem indicou" />
          </div>

          {/* Entendimento da Situação */}
          <div className="grid gap-2">
            <Label>Entendimento da Situação</Label>
            <Textarea
              rows={4}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o contexto e a situação identificada no cliente..."
            />
          </div>

          {/* Escopo do Trabalho */}
          <div className="grid gap-2">
            <Label>Escopo do Trabalho</Label>
            <Textarea
              rows={4}
              value={form.scope ?? ""}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              placeholder="Detalhe o escopo dos serviços a serem prestados..."
            />
          </div>

          {/* Observações */}
          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Forma de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={form.payment_type ?? ""} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="etapas">Por Etapas</SelectItem>
                <SelectItem value="prazo">Por Prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.payment_type && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Parcelas ({parcelas.length}/5)</Label>
                {parcelas.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={addParcela}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Parcela
                  </Button>
                )}
              </div>

              {parcelas.map((p, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Parcela {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeParcela(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={p.descricao}
                      onChange={(e) => updateParcela(idx, "descricao", e.target.value)}
                      placeholder={form.payment_type === "etapas" ? "Ex: Entrega do diagnóstico" : "Ex: 30 dias após assinatura"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input type="number" step="0.01" value={p.valor ?? ""} onChange={(e) => updateParcela(idx, "valor", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Data de Vencimento</Label>
                      <Input type="date" value={p.data_vencimento} onChange={(e) => updateParcela(idx, "data_vencimento", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              {parcelas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhuma parcela adicionada. Clique em "Adicionar Parcela" acima.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={createProposal.isPending || updateProposal.isPending}>
          {isEdit ? "Salvar" : "Criar Proposta"}
        </Button>
        {isEdit && (
          <Button
            variant="outline"
            onClick={async () => {
              const clientName = selectedClient?.name || "Cliente";
              try {
                await generateProposalPptx({
                  proposal_number: existing?.proposal_number || form.title,
                  title: form.title,
                  client_name: clientName,
                  description: form.description ?? null,
                  scope: form.scope ?? null,
                  value: form.value ?? null,
                  parcelas: parcelas,
                  payment_type: form.payment_type ?? null,
                  data_envio: form.data_envio ?? null,
                  empresa: form.empresa ?? null,
                  tipo_projeto: form.tipo_projeto ?? null,
                });
                toast({ title: "PPT gerado com sucesso!" });
              } catch {
                toast({ title: "Erro ao gerar PPT", variant: "destructive" });
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-1" /> Gerar PPT
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate("/propostas")}>Cancelar</Button>
      </div>

      {/* Dialog novo cliente */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Adicione um novo cliente à base de dados.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome do Cliente *</Label>
              <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <Button
              disabled={!newClientName.trim() || createClient.isPending}
              onClick={async () => {
                try {
                  const created = await createClient.mutateAsync({ name: newClientName.trim() });
                  setForm((prev) => ({ ...prev, client_id: created.id }));
                  setNewClientName("");
                  setShowNewClient(false);
                  toast({ title: "Cliente criado com sucesso" });
                } catch {
                  toast({ title: "Erro ao criar cliente", variant: "destructive" });
                }
              }}
            >
              Salvar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
