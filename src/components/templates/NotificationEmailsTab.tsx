import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mail, Save, Send, Eye, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface NotificationTemplate {
  id: string;
  key: string;
  nome: string;
  descricao: string | null;
  assunto: string;
  corpo_html: string;
  placeholders: string[];
  ativo: boolean;
}

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  "project-etapa-change": {
    destinatario: "João Silva",
    projeto: "Diagnóstico Empresa X",
    cliente: "Empresa X Ltda",
    etapa_anterior: "Iniciado",
    etapa_nova: "Minuta",
  },
};

export default function NotificationEmailsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Partial<NotificationTemplate>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewTpl, setPreviewTpl] = useState<NotificationTemplate | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);

  // Status do Gmail conectado
  const { data: gmail, refetch: refetchGmail, isFetching: gmailLoading } = useQuery({
    queryKey: ["gmail-account"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-gmail-account");
      if (error) throw error;
      return data as { connected: boolean; email?: string; error?: string };
    },
  });

  // Templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_email_templates")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        placeholders: Array.isArray(t.placeholders) ? t.placeholders : [],
      })) as NotificationTemplate[];
    },
  });

  // Email padrão para teste
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !testEmail) setTestEmail(data.user.email);
    });
  }, [testEmail]);

  const getValue = <K extends keyof NotificationTemplate>(t: NotificationTemplate, k: K): NotificationTemplate[K] => {
    const d = drafts[t.id];
    if (d && d[k] !== undefined) return d[k] as NotificationTemplate[K];
    return t[k];
  };

  const setDraft = (id: string, patch: Partial<NotificationTemplate>) => {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), ...patch } }));
  };

  const isDirty = (id: string) => !!drafts[id] && Object.keys(drafts[id]).length > 0;

  const handleSave = async (t: NotificationTemplate) => {
    const patch = drafts[t.id];
    if (!patch) return;
    setSavingId(t.id);
    const { error } = await supabase
      .from("notification_email_templates")
      .update(patch)
      .eq("id", t.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setDrafts((d) => {
        const n = { ...d };
        delete n[t.id];
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast({ title: "Template salvo" });
    }
  };

  const handleToggleAtivo = async (t: NotificationTemplate, ativo: boolean) => {
    const { error } = await supabase
      .from("notification_email_templates")
      .update({ ativo })
      .eq("id", t.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    }
  };

  const handleInsertPlaceholder = (t: NotificationTemplate, field: "assunto" | "corpo_html", ph: string) => {
    const current = (getValue(t, field) as string) || "";
    setDraft(t.id, { [field]: current + `{{${ph}}}` } as any);
  };

  const handleSendTest = async (t: NotificationTemplate) => {
    if (!testEmail) {
      toast({ title: "Informe o email de destino", variant: "destructive" });
      return;
    }
    setTestingId(t.id);
    const { data, error } = await supabase.functions.invoke("send-notification-test-email", {
      body: {
        template_key: t.key,
        recipient_email: testEmail,
        sample_data: SAMPLE_DATA[t.key] || {},
      },
    });
    setTestingId(null);
    if (error || (data as any)?.error) {
      toast({
        title: "Falha no envio",
        description: (data as any)?.error || error?.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Email de teste enviado", description: `Para ${testEmail}` });
    }
  };

  return (
    <div className="space-y-4">
      {/* Card do remetente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Conta de envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gmailLoading ? (
            <p className="text-sm text-muted-foreground">Verificando conexão...</p>
          ) : gmail?.connected ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Conectado como <strong>{gmail.email}</strong>
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchGmail()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Trocar conta",
                      description:
                        "Para trocar a conta, peça ao Lovable: \"conectar outra conta Gmail\".",
                    });
                  }}
                >
                  Trocar conta
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Nenhuma conta conectada</p>
                <p className="text-muted-foreground">
                  Os emails não serão enviados até que uma conta Gmail seja conectada. Peça ao
                  Lovable: "conectar Gmail".
                </p>
              </div>
            </div>
          )}
          <div className="pt-2 border-t">
            <Label className="text-xs">Email para testes</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1 max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de templates */}
      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum template cadastrado. Novos gatilhos aparecerão aqui automaticamente.
        </p>
      ) : (
        templates.map((t) => {
          const dirty = isDirty(t.id);
          return (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{t.nome}</CardTitle>
                    {t.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{t.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`ativo-${t.id}`} className="text-sm">
                      Ativo
                    </Label>
                    <Switch
                      id={`ativo-${t.id}`}
                      checked={getValue(t, "ativo") as boolean}
                      onCheckedChange={(v) => handleToggleAtivo(t, v)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {t.placeholders.length > 0 && (
                  <div>
                    <Label className="text-xs">Variáveis disponíveis (clique para inserir no corpo)</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {t.placeholders.map((ph) => (
                        <Badge
                          key={ph}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => handleInsertPlaceholder(t, "corpo_html", ph)}
                        >
                          {`{{${ph}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Assunto</Label>
                  <Input
                    value={getValue(t, "assunto") as string}
                    onChange={(e) => setDraft(t.id, { assunto: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Corpo do email (HTML)</Label>
                  <Textarea
                    value={getValue(t, "corpo_html") as string}
                    onChange={(e) => setDraft(t.id, { corpo_html: e.target.value })}
                    rows={12}
                    className="mt-1 font-mono text-xs"
                  />
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setPreviewTpl(t)}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Pré-visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendTest(t)}
                    disabled={testingId === t.id || !gmail?.connected}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {testingId === t.id ? "Enviando..." : "Enviar teste"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(t)}
                    disabled={!dirty || savingId === t.id}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {savingId === t.id ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewTpl} onOpenChange={(o) => !o && setPreviewTpl(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização: {previewTpl?.nome}</DialogTitle>
          </DialogHeader>
          {previewTpl && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Assunto: </span>
                <strong>
                  {Object.entries(SAMPLE_DATA[previewTpl.key] || {}).reduce(
                    (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
                    (drafts[previewTpl.id]?.assunto ?? previewTpl.assunto) as string
                  )}
                </strong>
              </div>
              <div className="border rounded-md p-4 bg-white">
                <div
                  dangerouslySetInnerHTML={{
                    __html: Object.entries(SAMPLE_DATA[previewTpl.key] || {}).reduce(
                      (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
                      (drafts[previewTpl.id]?.corpo_html ?? previewTpl.corpo_html) as string
                    ),
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTpl(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
