import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProposal, useUpdateProposal, useCreateProposal } from "@/hooks/useProposals";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { proposalStatusLabels, proposalStatusColors, formatCurrency } from "@/lib/format";
import { generateProposalPptx } from "@/lib/generateProposalPptx";
import { Plus, Trash2, FileDown, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];

const TIPOS_PROJETO = [
  "Ass. Perícia", "CI/GAI", "Contábil", "CPC 04", "Criminal", "Gerencial",
  "Impairment", "Interno", "Inventário", "LSA", "M&A", "Marcação de Cotas",
  "OPA", "Perícia", "Planejamento", "PPA", "RJ Laudos", "RJ Advisor",
  "RVU", "SAF", "Outros",
];

interface Parcela {
  descricao: string;
  valor: number | null;
  data_vencimento: string;
}

const emptyParcela: Parcela = { descricao: "", valor: null, data_vencimento: "" };

interface EtapaParcela {
  descricao: "inicio" | "minuta" | "assinatura";
  valor: number | null;
}

interface ProposalDetailDialogProps {
  proposalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNew?: boolean;
}

export default function ProposalDetailDialog({ proposalId, open, onOpenChange, isNew }: ProposalDetailDialogProps) {
  const isEdit = !!proposalId && !isNew;
  const { data: existing, isLoading } = useProposal(isEdit ? proposalId! : undefined);
  const { data: clients } = useClients();
  const { user } = useAuth();
  const updateProposal = useUpdateProposal();
  const createProposal = useCreateProposal();
  const createProject = useCreateProject();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [etapasMode, setEtapasMode] = useState<"percent" | "value">("percent");
  const [etapas, setEtapas] = useState<EtapaParcela[]>([
    { descricao: "inicio", valor: null },
    { descricao: "minuta", valor: null },
    { descricao: "assinatura", valor: null },
  ]);

  const [form, setForm] = useState<ProposalInsert & { empresa?: string; payment_type?: string; about_company?: string }>({
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
    about_company: "",
  });

  useEffect(() => {
    if (existing && isEdit) {
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
        about_company: (existing as any).about_company ?? "",
      });
      const saved = (existing as any).parcelas;
      if (Array.isArray(saved) && saved.length > 0) {
        // Check if saved parcelas are etapas format
        const isEtapasFormat = saved.some((p: any) => ["inicio", "minuta", "assinatura"].includes(p.descricao));
        if (isEtapasFormat && (existing as any).payment_type === "etapas") {
          const mapped: EtapaParcela[] = [
            { descricao: "inicio", valor: saved.find((p: any) => p.descricao === "inicio")?.valor ?? null },
            { descricao: "minuta", valor: saved.find((p: any) => p.descricao === "minuta")?.valor ?? null },
            { descricao: "assinatura", valor: saved.find((p: any) => p.descricao === "assinatura")?.valor ?? null },
          ];
          setEtapas(mapped);
          // Detect if values are percentages (all <= 100 and sum ~100)
          const sum = mapped.reduce((s, e) => s + (e.valor ?? 0), 0);
          setEtapasMode(sum > 0 && sum <= 100 ? "percent" : "value");
          setParcelas([]);
        } else {
          setParcelas(saved);
          setEtapas([
            { descricao: "inicio", valor: null },
            { descricao: "minuta", valor: null },
            { descricao: "assinatura", valor: null },
          ]);
        }
      } else {
        setParcelas([]);
      }
    }
  }, [existing, isEdit]);

  useEffect(() => {
    if (isNew && open) {
      setForm({
        title: "", client_id: null, description: "", scope: "", value: null,
        status: "em_elaboracao", validity_date: null, payment_terms: "",
        created_by: null, tipo_projeto: "", data_envio: null, data_aprovacao: null,
        data_fup: null, cliente_contato: null, indicador: "", observacoes: "",
        empresa: "", payment_type: "", about_company: "",
      });
      setParcelas([]);
      setEtapas([
        { descricao: "inicio", valor: null },
        { descricao: "minuta", valor: null },
        { descricao: "assinatura", valor: null },
      ]);
    }
  }, [isNew, open]);

  useEffect(() => {
    if (!form.client_id || isEdit) return;
    const fetchLastProposalData = async () => {
      const { data } = await supabase
        .from("proposals")
        .select("description, about_company, payment_type, parcelas")
        .eq("client_id", form.client_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setForm((prev) => ({
          ...prev,
          ...(data.description ? { description: data.description } : {}),
          ...((data as any).about_company ? { about_company: (data as any).about_company } : {}),
          ...((data as any).payment_type ? { payment_type: (data as any).payment_type } : {}),
        }));
        // Auto-fill parcelas/etapas
        const savedParcelas = (data as any).parcelas;
        const paymentType = (data as any).payment_type;
        if (Array.isArray(savedParcelas) && savedParcelas.length > 0) {
          const isEtapasFormat = savedParcelas.some((p: any) => ["inicio", "minuta", "assinatura"].includes(p.descricao));
          if (isEtapasFormat && paymentType === "etapas") {
            setEtapas([
              { descricao: "inicio", valor: savedParcelas.find((p: any) => p.descricao === "inicio")?.valor ?? null },
              { descricao: "minuta", valor: savedParcelas.find((p: any) => p.descricao === "minuta")?.valor ?? null },
              { descricao: "assinatura", valor: savedParcelas.find((p: any) => p.descricao === "assinatura")?.valor ?? null },
            ]);
            const sum = savedParcelas.reduce((s: number, e: any) => s + (e.valor ?? 0), 0);
            setEtapasMode(sum > 0 && sum <= 100 ? "percent" : "value");
            setParcelas([]);
          } else {
            setParcelas(savedParcelas);
          }
        }
      }
    };
    fetchLastProposalData();
  }, [form.client_id, isEdit]);

  const etapasSum = useMemo(() => etapas.reduce((s, e) => s + (e.valor ?? 0), 0), [etapas]);
  const etapasValid = useMemo(() => {
    if (etapasMode === "percent") return Math.abs(etapasSum - 100) < 0.01;
    return form.value ? Math.abs(etapasSum - form.value) < 0.01 : true;
  }, [etapasMode, etapasSum, form.value]);

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

  const updateEtapa = (idx: number, valor: number | null) => {
    setEtapas((prev) => prev.map((e, i) => (i === idx ? { ...e, valor } : e)));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    try {
      let savedParcelas: any[] = [];
      if (form.payment_type === "etapas") {
        savedParcelas = etapas.map((e) => ({
          descricao: e.descricao,
          valor: e.valor,
          mode: etapasMode,
        }));
      } else if (form.payment_type === "prazo") {
        savedParcelas = parcelas;
      }

      const payload = {
        ...form,
        parcelas: savedParcelas,
      } as any;

      if (isEdit) {
        const oldStatus = existing?.status;
        await updateProposal.mutateAsync({ id: proposalId!, ...payload });
        toast({ title: "Proposta atualizada" });

        if (form.status === "ganha" && oldStatus !== "ganha") {
          try {
            await createProject.mutateAsync({
              title: form.title,
              client_id: form.client_id,
              proposal_id: proposalId!,
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
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const selectedClient = clients?.find((c) => c.id === form.client_id);

  const etapaLabels: Record<string, string> = {
    inicio: "Início",
    minuta: "Minuta",
    assinatura: "Assinatura",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-hidden flex flex-col" style={{ paddingTop: '1.5rem' }}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              {isEdit && existing?.proposal_number && (
                <p className="text-xs font-mono text-muted-foreground">{existing.proposal_number}</p>
              )}
              <DialogTitle className="text-xl">{isEdit ? "Editar Proposta" : "Nova Proposta"}</DialogTitle>
            </div>
            {isEdit && (
              <Badge variant="secondary" className={proposalStatusColors[form.status]}>
                {proposalStatusLabels[form.status]}
              </Badge>
            )}
          </div>
          <DialogDescription className="sr-only">Formulário de proposta comercial</DialogDescription>
        </DialogHeader>

        {isEdit && isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">

              {/* ── IDENTIFICAÇÃO ── */}
              <section>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identificação</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Projeto *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Projeto</Label>
                    <Select value={form.tipo_projeto ?? ""} onValueChange={(v) => setForm({ ...form, tipo_projeto: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_PROJETO.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                              <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Novo cliente</span>
                            </SelectItem>
                            {clients?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedClient && (
                        <Button variant="outline" size="icon" asChild onClick={() => onOpenChange(false)}>
                          <Link to={`/clientes/${selectedClient.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Indicador</Label>
                    <Input value={form.indicador ?? ""} onChange={(e) => setForm({ ...form, indicador: e.target.value })} placeholder="Quem indicou" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contato do Cliente</Label>
                    <Input value={form.cliente_contato ?? ""} onChange={(e) => setForm({ ...form, cliente_contato: e.target.value })} placeholder="Nome do contato" />
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
              </section>

              <Separator />

              {/* ── DATAS ── */}
              <section>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Data de Envio</Label>
                    <Input type="date" value={form.data_envio ?? ""} onChange={(e) => setForm({ ...form, data_envio: e.target.value || null })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data de Aprovação</Label>
                    <Input type="date" value={form.data_aprovacao ?? ""} onChange={(e) => setForm({ ...form, data_aprovacao: e.target.value || null })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Follow-up</Label>
                    <Input type="date" value={form.data_fup ?? ""} onChange={(e) => setForm({ ...form, data_fup: e.target.value || null })} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── VALOR E PAGAMENTO ── */}
              <section>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Valor e Pagamento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="grid gap-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Forma de Pagamento</Label>
                    <Select value={form.payment_type ?? ""} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="etapas">Por Etapas</SelectItem>
                        <SelectItem value="prazo">Por Prazo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Por Etapas */}
                {form.payment_type === "etapas" && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Distribuição por Etapas</span>
                      <Select value={etapasMode} onValueChange={(v: any) => setEtapasMode(v)}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentual (%)</SelectItem>
                          <SelectItem value="value">Valor (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      {etapas.map((e, idx) => (
                        <div key={e.descricao} className="flex items-center gap-3">
                          <span className="text-sm w-24 font-medium">{etapaLabels[e.descricao]}</span>
                          <Input
                            type="number"
                            step="0.01"
                            className="flex-1"
                            placeholder={etapasMode === "percent" ? "%" : "R$"}
                            value={e.valor ?? ""}
                            onChange={(ev) => updateEtapa(idx, ev.target.value ? Number(ev.target.value) : null)}
                          />
                          {etapasMode === "percent" && e.valor != null && form.value != null && (
                            <span className="text-xs text-muted-foreground w-28 text-right">
                              = {formatCurrency((e.valor / 100) * form.value)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className={`text-sm font-medium text-right ${etapasValid ? "text-green-600" : "text-destructive"}`}>
                      Total: {etapasMode === "percent" ? `${etapasSum.toFixed(1)}%` : formatCurrency(etapasSum)}
                      {etapasMode === "percent" && !etapasValid && " (deve somar 100%)"}
                      {etapasMode === "value" && !etapasValid && form.value && ` (deve somar ${formatCurrency(form.value)})`}
                    </div>
                  </div>
                )}

                {/* Por Prazo */}
                {form.payment_type === "prazo" && (
                  <div className="space-y-3">
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
                          <Input value={p.descricao} onChange={(e) => updateParcela(idx, "descricao", e.target.value)} placeholder="Ex: 30 dias após assinatura" />
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
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhuma parcela adicionada.</p>
                    )}
                  </div>
                )}
              </section>

              <Separator />

              {/* ── DESCRIÇÃO ── */}
              <section>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Descrição</h4>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>A Empresa</Label>
                    <Textarea
                      rows={4}
                      value={form.about_company ?? ""}
                      onChange={(e) => setForm({ ...form, about_company: e.target.value })}
                      placeholder="Descreva a empresa do cliente..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Entendimento da Situação</Label>
                    <Textarea
                      rows={4}
                      value={form.description ?? ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descreva o contexto e a situação identificada no cliente..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Escopo do Trabalho</Label>
                    <Textarea
                      rows={4}
                      value={form.scope ?? ""}
                      onChange={(e) => setForm({ ...form, scope: e.target.value })}
                      placeholder="Detalhe o escopo dos serviços a serem prestados..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Observações</Label>
                    <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── AÇÕES ── */}
              <div className="flex gap-3 pt-2">
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
                          client_razao_social: selectedClient?.name || null,
                          client_cnpj: selectedClient?.cnpj || null,
                          client_contato: form.cliente_contato ?? null,
                          about_company: form.about_company ?? null,
                          description: form.description ?? null,
                          scope: form.scope ?? null,
                          value: form.value ?? null,
                          parcelas: form.payment_type === "etapas"
                            ? etapas.map(e => ({ descricao: e.descricao, valor: e.valor, data_vencimento: "" }))
                            : parcelas,
                          payment_type: form.payment_type ?? null,
                          data_envio: form.data_envio ?? null,
                          empresa: form.empresa ?? null,
                          tipo_projeto: form.tipo_projeto ?? null,
                          etapas: etapas,
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
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              </div>
            </div>
          </ScrollArea>
        )}

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
      </DialogContent>
    </Dialog>
  );
}
