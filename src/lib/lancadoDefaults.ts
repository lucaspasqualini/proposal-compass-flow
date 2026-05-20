import { format } from "date-fns";
import { addBusinessDays } from "./businessDays";

// Calcula os defaults a serem aplicados ao mudar status para "lancado".
// - invoice_date vazio → hoje
// - due_date vazio → invoice_date + 5 dias úteis
export function computeLancadoDefaults(receivable: {
  invoice_date?: string | null;
  due_date?: string | null;
}): Record<string, string> {
  const updates: Record<string, string> = {};
  const invoiceDate = receivable.invoice_date
    ? new Date(receivable.invoice_date + "T12:00:00")
    : new Date();
  if (!receivable.invoice_date) {
    updates.invoice_date = format(invoiceDate, "yyyy-MM-dd");
  }
  if (!receivable.due_date) {
    updates.due_date = format(addBusinessDays(invoiceDate, 5), "yyyy-MM-dd");
  }
  return updates;
}
