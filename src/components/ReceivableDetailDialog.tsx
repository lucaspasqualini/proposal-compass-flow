import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Separator } from "@/components/ui/separator";

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

interface ReceivableDetailDialogProps {
  receivable: any | null;
  parcelaLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReceivableDetailDialog({ receivable, parcelaLabel, open, onOpenChange }: ReceivableDetailDialogProps) {
  if (!receivable) return null;

  const proposal = receivable.proposals as any;
  const client = receivable.clients as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Detalhes da Parcela — {parcelaLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Projeto & Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Nº Projeto</p>
              <p className="font-mono text-sm font-medium">{proposal?.proposal_number || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium">{client?.name || "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Nome do Projeto</p>
            <p className="text-sm font-medium">{proposal?.title || "—"}</p>
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

          <Separator />

          {/* Financeiro */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor da Parcela</p>
              <p className="text-lg font-bold">{formatCurrency(receivable.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={statusColors[receivable.effectiveStatus] || ""}>
                {statusLabels[receivable.effectiveStatus] || receivable.effectiveStatus}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Previsão de Faturamento</p>
              <p className="text-sm">{formatDate(receivable.due_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Emissão Fatura</p>
              <p className="text-sm">{formatDate(receivable.invoice_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebimento</p>
              <p className="text-sm">{formatDate(receivable.paid_at)}</p>
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
