import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function ReceivableDetailDialog({ receivable, parcelaLabel, open, onOpenChange }: ReceivableDetailDialogProps) {
  const updateReceivable = useUpdateReceivable();
  const { toast } = useToast();

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
  const [editingDate, setEditingDate] = useState<string | null>(null);

  useEffect(() => {
    if (receivable) {
      setCofins(receivable.cofins ?? +(amount * 0.03).toFixed(2));
      setCsll(receivable.csll ?? +(amount * 0.01).toFixed(2));
      setIrpj(receivable.irpj ?? +(amount * 0.015).toFixed(2));
      setPis(receivable.pis ?? +(amount * 0.0065).toFixed(2));
      setNfe(receivable.nfe_number || "");
      setEditingDate(null);
    }
  }, [receivable?.id, amount]);

  if (!receivable) return null;

  const proposal = receivable.proposals as any;
  const client = receivable.clients as any;
  const valorLiquido = amount - cofins - csll - irpj - pis;

  const handleUpdate = async (updates: Record<string, any>) => {
    try {
      await updateReceivable.mutateAsync({ id: receivable.id, ...updates });
      toast({ title: "Parcela atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus !== "pago") updates.paid_at = null;
    handleUpdate(updates);
  };

  const handleDateChange = (field: string, date: Date | undefined) => {
    if (!date) return;
    handleUpdate({ [field]: format(date, "yyyy-MM-dd") });
    setEditingDate(null);
  };

  const handleTaxBlur = (field: string, value: number) => {
    handleUpdate({ [field]: value });
  };

  const handleNfeBlur = () => {
    if (nfe !== (receivable.nfe_number || "")) {
      handleUpdate({ nfe_number: nfe || null });
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
                <p className="text-xs text-muted-foreground">CNPJ Cliente</p>
                <p className="text-sm font-mono">{client?.cnpj || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contato</p>
                <p className="text-sm">{client?.contact_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm truncate">{client?.email || "—"}</p>
              </div>
            </div>

            <Separator />

            {/* NFe & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1"># NFe</p>
                <Input
                  value={nfe}
                  onChange={(e) => setNfe(e.target.value)}
                  onBlur={handleNfeBlur}
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

            <Separator />

            {/* Datas editáveis */}
            <div className="grid grid-cols-3 gap-4">
              <DateField label="Previsão de Faturamento" field="due_date" value={receivable.due_date} />
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
                    onBlur={() => handleTaxBlur(tax.field, tax.value)}
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
