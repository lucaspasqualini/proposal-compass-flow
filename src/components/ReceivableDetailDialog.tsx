import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency, formatDate } from "@/lib/format";
import { Separator } from "@/components/ui/separator";
import { useUpdateReceivable } from "@/hooks/useReceivables";
import { useUpdateClient } from "@/hooks/useClients";
import { useClientContacts, useCreateClientContact, useUpdateClientContact } from "@/hooks/useClientContacts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ContactCombobox from "@/components/ContactCombobox";

import { computeLancadoDefaults } from "@/lib/lancadoDefaults";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  lancado: "Lançado",
  pago: "Pago",
  cancelado: "Cancelado",
  pdd: "PDD",
  atrasado: "Atrasado",
};

const statusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  lancado: "bg-info/10 text-info",
  pago: "bg-success/10 text-success",
  cancelado: "bg-muted text-muted-foreground",
  pdd: "bg-destructive/10 text-destructive",
  atrasado: "bg-destructive/10 text-destructive",
};

const editableStatuses = [
  { value: "pendente", label: "Pendente" },
  { value: "lancado", label: "Lançado" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
  { value: "pdd", label: "PDD" },
];

interface ReceivableDetailDialogProps {
  receivable: any | null;
  parcelaLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Normaliza CNPJ apenas para comparação (não para exibição)
const normalizeCnpj = (s: string) => (s || "").replace(/\D/g, "");

export default function ReceivableDetailDialog({ receivable, parcelaLabel, open, onOpenChange }: ReceivableDetailDialogProps) {
  const updateReceivable = useUpdateReceivable();
  const updateClient = useUpdateClient();
  const createContact = useCreateClientContact();
  const updateContact = useUpdateClientContact();
  const qc = useQueryClient();
  const { toast } = useToast();

  const client = receivable?.clients as any;
  const proposal = receivable?.proposals as any;
  const { data: clientContacts } = useClientContacts(client?.id);

  const amount = receivable?.amount || 0;

  const defaultTaxes = useMemo(() => ({
    cofins: receivable?.cofins ?? +(amount * 0.03).toFixed(2),
    csll: receivable?.csll ?? +(amount * 0.01).toFixed(2),
    irpj: receivable?.irpj ?? +(amount * 0.015).toFixed(2),
    pis: receivable?.pis ?? +(amount * 0.0065).toFixed(2),
  }), [receivable?.id, amount]);

  const [cofins, setCofins] = useState(defaultTaxes.cofins);
  const [csll, setCsll] = useState(defaultTaxes.csll);
  const [irpj, setIrpj] = useState(defaultTaxes.irpj);
  const [pis, setPis] = useState(defaultTaxes.pis);
  const [nfe, setNfe] = useState(receivable?.nfe_number || "");
  const [responsavel, setResponsavel] = useState(receivable?.responsavel_projeto || "");
  const [cnpj, setCnpj] = useState(client?.cnpj || "");
  const [contato, setContato] = useState(client?.contact_name || "");
  const [email, setEmail] = useState(client?.email || "");
  const [editingDate, setEditingDate] = useState<string | null>(null);

  useEffect(() => {
    if (receivable) {
      setCofins(receivable.cofins ?? +(amount * 0.03).toFixed(2));
      setCsll(receivable.csll ?? +(amount * 0.01).toFixed(2));
      setIrpj(receivable.irpj ?? +(amount * 0.015).toFixed(2));
      setPis(receivable.pis ?? +(amount * 0.0065).toFixed(2));
      setNfe(receivable.nfe_number || "");
      setResponsavel(receivable.responsavel_projeto || "");
      const c = receivable.clients as any;
      setCnpj(c?.cnpj || "");
      setContato(c?.contact_name || "");
      setEmail(c?.email || "");
      setEditingDate(null);
    }
  }, [receivable?.id, amount]);

  if (!receivable) return null;

  const valorLiquido = amount - cofins - csll - irpj - pis;

  const handleStatusChange = async (newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus !== "pago") updates.paid_at = null;
    if (newStatus === "lancado") Object.assign(updates, computeLancadoDefaults(receivable));
    try {
      await updateReceivable.mutateAsync({ id: receivable.id, ...updates });
      toast({ title: "Status atualizado" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleDateChange = async (field: string, date: Date | undefined) => {
    if (!date) return;
    const updates: any = { [field]: format(date, "yyyy-MM-dd") };
    if (field === "paid_at" && receivable.status !== "pago") updates.status = "pago";
    try {
      await updateReceivable.mutateAsync({ id: receivable.id, ...updates });
      toast({ title: "Data atualizada" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
    setEditingDate(null);
  };

  const handleContatoSelect = (c: { name: string; email?: string | null }) => {
    setContato(c.name);
    if (c.email) setEmail(c.email);
  };

  const handleSaveAll = async () => {
    try {
      // 1. Receivable
      await updateReceivable.mutateAsync({
        id: receivable.id,
        cofins, csll, irpj, pis,
        nfe_number: nfe || null,
        responsavel_projeto: responsavel || null,
      });

      // 2. Cliente — contato/email principais + CNPJ principal se vazio
      if (client?.id) {
        const clientUpdates: any = {};
        if ((contato || "") !== (client.contact_name || "")) clientUpdates.contact_name = contato || null;
        if ((email || "") !== (client.email || "")) clientUpdates.email = email || null;
        if (!client.cnpj && cnpj) clientUpdates.cnpj = cnpj;

        // CNPJ adicional → cnpjs_vinculados
        const novoCnpj = (cnpj || "").trim();
        const principal = (client?.cnpj || "").trim();
        if (novoCnpj && principal && normalizeCnpj(novoCnpj) !== normalizeCnpj(principal)) {
          const vinculados: any[] = Array.isArray(client?.cnpjs_vinculados) ? client.cnpjs_vinculados : [];
          const jaVinculado = vinculados.some((v) => normalizeCnpj(typeof v === "string" ? v : v?.cnpj) === normalizeCnpj(novoCnpj));
          if (!jaVinculado) {
            clientUpdates.cnpjs_vinculados = [...vinculados, { cnpj: novoCnpj, added_from: "receivable", added_at: new Date().toISOString() }];
          }
        }

        if (Object.keys(clientUpdates).length > 0) {
          await updateClient.mutateAsync({ id: client.id, ...clientUpdates });
        }

        // 3. Contato → criar ou atualizar em client_contacts
        const n = (contato || "").trim();
        const m = (email || "").trim();
        if (n) {
          const existing = (clientContacts ?? []).find(
            (c) => c.name.trim().toLowerCase() === n.toLowerCase()
          );
          if (!existing) {
            await createContact.mutateAsync({ client_id: client.id, name: n, email: m || null });
          } else if (m && (existing.email || "") !== m) {
            await updateContact.mutateAsync({ id: existing.id, email: m });
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      if (client?.id) qc.invalidateQueries({ queryKey: ["client_contacts", client.id] });

      toast({ title: "Alterações salvas" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    }
  };

  const DateField = ({ label, field, value }: { label: string; field: string; value: string | null }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Popover open={editingDate === field} onOpenChange={(o) => setEditingDate(o ? field : null)}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-sm font-normal gap-1">
            {value ? formatDate(value) : "—"}
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value + "T12:00:00") : undefined}
            onSelect={(d) => handleDateChange(field, d)}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const cnpjPrincipal = (client?.cnpj || "").trim();
  const cnpjDiverge = !!cnpj && normalizeCnpj(cnpj) !== normalizeCnpj(cnpjPrincipal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Detalhes da Parcela — {parcelaLabel}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Projeto & Cliente */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Nº Projeto</p>
                <p className="font-mono text-sm font-medium">{proposal?.proposal_number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nome do Projeto</p>
                <p className="text-sm font-medium">{proposal?.title || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="text-sm">{proposal?.empresa || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo de Projeto</p>
                <p className="text-sm">{proposal?.tipo_projeto || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">CNPJ Faturamento</p>
                <Input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-8 text-sm font-mono"
                />
                {cnpjDiverge && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Diferente do principal — será vinculado ao cadastro.
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contato</p>
                <ContactCombobox
                  value={contato}
                  onChange={setContato}
                  onSelect={handleContatoSelect}
                  contacts={(clientContacts ?? []).map((c) => ({
                    id: c.id, name: c.name, email: c.email, phone: c.phone, cargo: c.cargo,
                  }))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Responsável / Previsão de emissão / Parcela */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                <Input
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <DateField label="Previsão de emissão" field="previsao_nf" value={receivable.previsao_nf} />
              <div>
                <p className="text-xs text-muted-foreground">Parcela</p>
                <p className="text-sm">{receivable.parcela_label || `${(receivable.parcela_index ?? 0) + 1}`}</p>
              </div>
            </div>


            {receivable.status_origem && /A MAIS|A MENOS|SEM NF/i.test(receivable.status_origem) && (
              <div>
                <Badge variant="outline" className="text-xs">
                  {receivable.status_origem.replace(/^\(\d+\)\s*/, "")}
                </Badge>
              </div>
            )}

            <Separator />

            {/* NFe & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1"># NFe</p>
                <Input
                  value={nfe}
                  onChange={(e) => setNfe(e.target.value)}
                  placeholder="Número da NFe"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Select
                  value={receivable.effectiveStatus === "atrasado" ? "pendente" : receivable.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <Badge className={`${statusColors[receivable.effectiveStatus] || ""} text-xs`}>
                      {statusLabels[receivable.effectiveStatus] || receivable.effectiveStatus}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {editableStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Financeiro */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor da Parcela</p>
                <p className="text-lg font-bold">{formatCurrency(amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Líquido</p>
                <p className="text-lg font-bold text-success">{formatCurrency(valorLiquido)}</p>
              </div>
            </div>

            {(receivable.valor_proposta != null || receivable.valor_nf != null || receivable.valor_recebido != null) && (
              <div className="grid grid-cols-3 gap-4 rounded-md border bg-muted/30 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Proposta</p>
                  <p className="text-sm font-medium">{receivable.valor_proposta != null ? formatCurrency(receivable.valor_proposta) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor NF</p>
                  <p className="text-sm font-medium">{receivable.valor_nf != null ? formatCurrency(receivable.valor_nf) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Recebido</p>
                  <p className="text-sm font-medium">{receivable.valor_recebido != null ? formatCurrency(receivable.valor_recebido) : "—"}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Datas editáveis */}
            <div className="grid grid-cols-3 gap-4">
              <DateField label="Previsão de recebimento" field="due_date" value={receivable.due_date} />
              <DateField label="Emissão Fatura" field="invoice_date" value={receivable.invoice_date} />
              <DateField label="Recebimento" field="paid_at" value={receivable.paid_at} />
            </div>

            <Separator />

            {/* Impostos */}
            <p className="text-sm font-medium">Impostos</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "COFINS (3%)", value: cofins, setter: setCofins, field: "cofins" },
                { label: "CSLL (1%)", value: csll, setter: setCsll, field: "csll" },
                { label: "IRPJ (1,5%)", value: irpj, setter: setIrpj, field: "irpj" },
                { label: "PIS (0,65%)", value: pis, setter: setPis, field: "pis" },
              ].map((tax) => (
                <div key={tax.field}>
                  <p className="text-xs text-muted-foreground mb-1">{tax.label}</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={tax.value}
                    onChange={(e) => tax.setter(+e.target.value || 0)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>

            {receivable.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm">{receivable.notes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
