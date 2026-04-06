import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProject, useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useProposals } from "@/hooks/useProposals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { projectStatusLabels } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

export default function ProjetoForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { data: existing, isLoading } = useProject(id);
  const { data: clients } = useClients();
  const { data: proposals } = useProposals();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<ProjectInsert>({
    title: "",
    client_id: null,
    proposal_id: null,
    description: "",
    status: "em_andamento",
    start_date: null,
    end_date: null,
    budget: null,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        client_id: existing.client_id,
        proposal_id: existing.proposal_id,
        description: existing.description,
        status: existing.status,
        start_date: existing.start_date,
        end_date: existing.end_date,
        budget: existing.budget,
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
        await updateProject.mutateAsync({ id: id!, ...form });
        toast({ title: "Projeto atualizado" });
      } else {
        await createProject.mutateAsync(form);
        toast({ title: "Projeto criado" });
      }
      navigate("/projetos");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (isEdit && isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projetos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? "Editar Projeto" : "Novo Projeto"}</h1>
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
                  {Object.entries(projectStatusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data Início</Label>
              <Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} />
            </div>
            <div className="grid gap-2">
              <Label>Data Fim</Label>
              <Input type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Orçamento (R$)</Label>
            <Input type="number" step="0.01" value={form.budget ?? ""} onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="grid gap-2">
            <Label>Proposta Vinculada</Label>
            <Select value={form.proposal_id ?? ""} onValueChange={(v) => setForm({ ...form, proposal_id: v || null })}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                {proposals?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={createProject.isPending || updateProject.isPending}>
              {isEdit ? "Salvar" : "Criar Projeto"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/projetos")}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
