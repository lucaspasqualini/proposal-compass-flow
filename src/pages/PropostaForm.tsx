import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProposal, useCreateProposal, useUpdateProposal } from "@/hooks/useProposals";
import { useClients } from "@/hooks/useClients";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { proposalStatusLabels } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useCreateClient } from "@/hooks/useClients";

type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];

export default function PropostaForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { data: existing, isLoading } = useProposal(id);
  const { data: clients } = useClients();
  const { user } = useAuth();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<ProposalInsert & { empresa?: string }>({
    title: "",
    client_id: null,
    description: "",
    scope: "",
    value: null,
    status: "rascunho",
    validity_date: null,
    payment_terms: "",
    created_by: null,
    tipo_projeto: "",
    data_envio: null,
    data_aprovacao: null,
    data_fup: null,
    cliente_contato: "",
    indicador: "",
    observacoes: "",
    empresa: "",
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
        cliente_contato: existing.cliente_contato ?? "",
        indicador: existing.indicador ?? "",
        observacoes: existing.observacoes ?? "",
        empresa: (existing as any).empresa ?? "",
      });
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

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    try {
      if (isEdit) {
        const oldStatus = existing?.status;
        await updateProposal.mutateAsync({ id: id!, ...form });
        toast({ title: "Proposta atualizada" });

        if (form.status === "aprovada" && oldStatus !== "aprovada") {
          try {
            await createProject.mutateAsync({
              title: form.title,
              client_id: form.client_id,
              proposal_id: id!,
              description: form.description,
              budget: form.value,
              status: "planejamento",
            });
            toast({ title: "Projeto criado automaticamente!" });
          } catch {
            toast({ title: "Erro ao criar projeto automaticamente", variant: "destructive" });
          }
        }
      } else {
        await createProposal.mutateAsync({ ...form, created_by: user?.id ?? null });
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
          {/* Código (read-only, auto-generated) */}
          {isEdit && (
            <div className="grid gap-2">
              <Label>Código</Label>
              <Input value={existing?.proposal_number ?? ""} disabled />
            </div>
          )}

          {/* Projeto (título) */}
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
            {/* Data de Envio */}
            <div className="grid gap-2">
              <Label>Data de Envio</Label>
              <Input
                type="date"
                value={form.data_envio ?? ""}
                onChange={(e) => setForm({ ...form, data_envio: e.target.value || null })}
              />
            </div>

            {/* Valor */}
            <div className="grid gap-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.value ?? ""}
                onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
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

            {/* Data de Aprovação */}
            <div className="grid gap-2">
              <Label>Data de Aprovação</Label>
              <Input
                type="date"
                value={form.data_aprovacao ?? ""}
                onChange={(e) => setForm({ ...form, data_aprovacao: e.target.value || null })}
              />
            </div>
          </div>

          {/* Data de FUP */}
          <div className="grid gap-2">
            <Label>Data de Follow-up</Label>
            <Input
              type="date"
              value={form.data_fup ?? ""}
              onChange={(e) => setForm({ ...form, data_fup: e.target.value || null })}
            />
          </div>

          {/* Empresa (entidade) */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente (select from clients table) */}
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Select value={form.client_id ?? ""} onValueChange={(v) => {
                const client = clients?.find((c) => c.id === v);
                setForm({
                  ...form,
                  client_id: v || null,
                  cliente_contato: client?.contact_name ?? form.cliente_contato ?? "",
                });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente (contato) */}
            <div className="grid gap-2">
              <Label>Contato</Label>
              <Input
                value={form.cliente_contato ?? ""}
                onChange={(e) => setForm({ ...form, cliente_contato: e.target.value })}
                placeholder="Nome do contato"
              />
            </div>
          </div>

          {/* Indicador */}
          <div className="grid gap-2">
            <Label>Indicador</Label>
            <Input
              value={form.indicador ?? ""}
              onChange={(e) => setForm({ ...form, indicador: e.target.value })}
              placeholder="Quem indicou"
            />
          </div>

          {/* Observações */}
          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.observacoes ?? ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={createProposal.isPending || updateProposal.isPending}>
              {isEdit ? "Salvar" : "Criar Proposta"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/propostas")}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
