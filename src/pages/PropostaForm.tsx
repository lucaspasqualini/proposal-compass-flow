import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProposal, useCreateProposal, useUpdateProposal } from "@/hooks/useProposals";
import { useClients } from "@/hooks/useClients";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { proposalStatusLabels } from "@/lib/format";
import { ArrowLeft, FolderKanban } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

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

  const [form, setForm] = useState<ProposalInsert>({
    title: "",
    client_id: null,
    description: "",
    scope: "",
    value: null,
    status: "rascunho",
    validity_date: null,
    payment_terms: "",
    created_by: null,
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
      });
    }
  }, [existing]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    try {
      if (isEdit) {
        await updateProposal.mutateAsync({ id: id!, ...form });
        toast({ title: "Proposta atualizada" });
      } else {
        await createProposal.mutateAsync({ ...form, created_by: user?.id ?? null });
        toast({ title: "Proposta criada" });
      }
      navigate("/propostas");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleConvertToProject = async () => {
    try {
      await createProject.mutateAsync({
        title: form.title,
        client_id: form.client_id,
        proposal_id: id!,
        description: form.description,
        budget: form.value,
        status: "planejamento",
      });
      if (form.status !== "aprovada") {
        await updateProposal.mutateAsync({ id: id!, status: "aprovada" });
      }
      toast({ title: "Projeto criado a partir da proposta!" });
      navigate("/projetos");
    } catch {
      toast({ title: "Erro ao converter", variant: "destructive" });
    }
  };

  if (isEdit && isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Editar Proposta" : "Nova Proposta"}</h1>
        </div>
        {isEdit && (
          <Button variant="outline" className="ml-auto" onClick={handleConvertToProject}>
            <FolderKanban className="h-4 w-4 mr-1" /> Converter em Projeto
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Select value={form.client_id ?? ""} onValueChange={(v) => setForm({ ...form, client_id: v || null })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.value ?? ""}
                onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Validade</Label>
              <Input
                type="date"
                value={form.validity_date ?? ""}
                onChange={(e) => setForm({ ...form, validity_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Escopo</Label>
            <Textarea
              rows={3}
              value={form.scope ?? ""}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Condições de Pagamento</Label>
            <Textarea
              rows={2}
              value={form.payment_terms ?? ""}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
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
