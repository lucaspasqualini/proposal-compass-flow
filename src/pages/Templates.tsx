import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, FileText, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ProposalTemplate {
  id: string;
  tipo_projeto: string;
  scope_text: string;
}

const TemplatesPropostas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newTipo, setNewTipo] = useState("");
  const [newScope, setNewScope] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["proposal-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .order("tipo_projeto");
      if (error) throw error;
      return data as ProposalTemplate[];
    },
  });

  const handleSave = async (template: ProposalTemplate) => {
    const newText = drafts[template.id];
    if (newText === undefined) return;
    setSaving(true);
    const { error } = await supabase
      .from("proposal_templates")
      .update({ scope_text: newText })
      .eq("id", template.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      setDrafts((d) => { const n = { ...d }; delete n[template.id]; return n; });
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      toast({ title: "Template salvo" });
    }
  };

  const handleAdd = async () => {
    if (!newTipo.trim()) {
      toast({ title: "Informe o tipo de laudo", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("proposal_templates")
      .insert({ tipo_projeto: newTipo.trim(), scope_text: newScope });
    setSaving(false);
    if (error) {
      toast({ title: error.message.includes("duplicate") ? "Tipo já existe" : "Erro ao criar", variant: "destructive" });
    } else {
      setNewTipo("");
      setNewScope("");
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      toast({ title: "Template criado" });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("proposal_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      toast({ title: "Template excluído" });
    }
  };

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Tipo de laudo (ex: Avaliação de Imóveis, Laudo Ambiental...)"
            value={newTipo}
            onChange={(e) => setNewTipo(e.target.value)}
          />
          <Textarea
            placeholder="Texto do escopo para esse tipo de laudo..."
            value={newScope}
            onChange={(e) => setNewScope(e.target.value)}
            rows={4}
          />
          <Button onClick={handleAdd} disabled={saving} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      {templates.map((t) => {
        const draft = drafts[t.id];
        const hasChange = draft !== undefined && draft !== t.scope_text;
        return (
          <Card key={t.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">{t.tipo_projeto}</CardTitle>
              <div className="flex gap-2">
                {hasChange && (
                  <Button size="sm" onClick={() => handleSave(t)} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={draft ?? t.scope_text}
                onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                rows={6}
                placeholder="Texto do escopo..."
              />
            </CardContent>
          </Card>
        );
      })}

      {templates.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          Nenhum template cadastrado. Adicione o primeiro acima.
        </p>
      )}
    </div>
  );
};

const Templates = () => {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Templates</h1>
      <Tabs defaultValue="propostas">
        <TabsList>
          <TabsTrigger value="propostas" className="gap-1.5">
            <FileText className="h-4 w-4" /> Templates Propostas
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-4 w-4" /> Email Comercial
          </TabsTrigger>
        </TabsList>
        <TabsContent value="propostas">
          <TemplatesPropostas />
        </TabsContent>
        <TabsContent value="email">
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Em breve — seção de templates de e-mail comercial.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Templates;
