import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Check } from "lucide-react";

interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  situacao_cadastral: string;
}

interface CnpjLookupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    cnpj: string;
    address: string;
    phone: string;
    email: string;
    contact_name: string;
  }) => void;
}

function formatCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function CnpjLookupDialog({ open, onOpenChange, onConfirm }: CnpjLookupDialogProps) {
  const [cnpjInput, setCnpjInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CnpjData | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    const digits = cnpjInput.replace(/\D/g, "");
    if (digits.length !== 14) {
      toast({ title: "CNPJ deve conter 14 dígitos", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/search-cnpj?cnpj=${digits}`;
      
      const response = await fetch(url, {
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao consultar");
      }

      const cnpjData: CnpjData = await response.json();
      setResult(cnpjData);
    } catch (err: any) {
      toast({ title: err.message || "Erro ao consultar CNPJ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;

    const addressParts = [
      result.logradouro,
      result.numero,
      result.complemento,
      result.bairro,
      result.municipio ? `${result.municipio}/${result.uf}` : result.uf,
      result.cep,
    ].filter(Boolean);

    onConfirm({
      cnpj: formatCnpjInput(result.cnpj),
      address: addressParts.join(", "),
      phone: result.telefone || "",
      email: result.email || "",
      contact_name: "",
    });

    onOpenChange(false);
    setCnpjInput("");
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setCnpjInput(""); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Consultar CNPJ</DialogTitle>
          <DialogDescription>
            Digite o CNPJ para buscar os dados cadastrais da empresa na Receita Federal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={(e) => setCnpjInput(formatCnpjInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>

          {result && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Resultado encontrado</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${result.situacao_cadastral === "ATIVA" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {result.situacao_cadastral}
                </span>
              </div>

              <div className="grid gap-2 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Razão Social</Label>
                  <p className="font-medium">{result.razao_social}</p>
                </div>
                {result.nome_fantasia && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome Fantasia</Label>
                    <p>{result.nome_fantasia}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">CNPJ</Label>
                  <p className="font-mono">{formatCnpjInput(result.cnpj)}</p>
                </div>
                {result.logradouro && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Endereço</Label>
                    <p>{[result.logradouro, result.numero, result.complemento, result.bairro, result.municipio ? `${result.municipio}/${result.uf}` : ""].filter(Boolean).join(", ")}</p>
                  </div>
                )}
                {result.telefone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p>{result.telefone}</p>
                  </div>
                )}
                {result.email && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p>{result.email}</p>
                  </div>
                )}
              </div>

              <Button onClick={handleConfirm} className="w-full">
                <Check className="h-4 w-4 mr-1" /> Confirmar e Preencher Dados
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
