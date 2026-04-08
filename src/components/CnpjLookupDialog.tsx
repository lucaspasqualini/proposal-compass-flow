import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Check, Users, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface CnpjFullData {
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
  capital_social: number | null;
  natureza_juridica: string;
  cnae_principal: string;
  cnae_descricao: string;
  porte: string;
  data_abertura: string;
  descricao_tipo_logradouro: string;
  qsa: Array<{
    nome: string;
    qualificacao: string;
    data_entrada: string;
    faixa_etaria: string;
  }>;
}

export interface CnpjConfirmData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  address: string;
  phone: string;
  email: string;
  contact_name: string;
  capital_social: number | null;
  natureza_juridica: string;
  cnae_principal: string;
  cnae_descricao: string;
  porte: string;
  data_abertura: string;
  situacao_cadastral: string;
  qsa: CnpjFullData["qsa"];
}

interface CnpjLookupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: CnpjConfirmData) => void;
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
  const [result, setResult] = useState<CnpjFullData | null>(null);
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
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao consultar");
      }

      setResult(await response.json());
    } catch (err: any) {
      toast({ title: err.message || "Erro ao consultar CNPJ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;

    const addressParts = [
      result.descricao_tipo_logradouro,
      result.logradouro,
      result.numero,
      result.complemento,
      result.bairro,
      result.municipio ? `${result.municipio}/${result.uf}` : result.uf,
      result.cep,
    ].filter(Boolean);

    onConfirm({
      cnpj: formatCnpjInput(result.cnpj),
      razao_social: result.razao_social || "",
      nome_fantasia: result.nome_fantasia || "",
      address: addressParts.join(", "),
      phone: result.telefone || "",
      email: result.email || "",
      contact_name: "",
      capital_social: result.capital_social,
      natureza_juridica: result.natureza_juridica || "",
      cnae_principal: result.cnae_principal || "",
      cnae_descricao: result.cnae_descricao || "",
      porte: result.porte || "",
      data_abertura: result.data_abertura || "",
      situacao_cadastral: result.situacao_cadastral || "",
      qsa: result.qsa || [],
    });

    onOpenChange(false);
    setCnpjInput("");
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setCnpjInput(""); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
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
            <ScrollArea className="max-h-[60vh]">
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Resultado encontrado</h4>
                  </div>
                  <Badge variant={result.situacao_cadastral === "ATIVA" ? "default" : "destructive"}>
                    {result.situacao_cadastral}
                  </Badge>
                </div>

                {/* Company Info */}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">CNPJ</Label>
                      <p className="font-mono">{formatCnpjInput(result.cnpj)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Natureza Jurídica</Label>
                      <p>{result.natureza_juridica || "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Capital Social</Label>
                      <p>{result.capital_social != null ? formatCurrency(result.capital_social) : "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Porte</Label>
                      <p>{result.porte || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Data Abertura</Label>
                      <p>{result.data_abertura || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Atividade Principal (CNAE)</Label>
                    <p>{result.cnae_principal ? `${result.cnae_principal} - ${result.cnae_descricao}` : "—"}</p>
                  </div>
                  {result.logradouro && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Endereço</Label>
                      <p>{[result.descricao_tipo_logradouro, result.logradouro, result.numero, result.complemento, result.bairro, result.municipio ? `${result.municipio}/${result.uf}` : "", result.cep].filter(Boolean).join(", ")}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
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
                </div>

                {/* QSA */}
                {result.qsa && result.qsa.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground">Quadro Societário ({result.qsa.length})</Label>
                    </div>
                    <div className="space-y-1">
                      {result.qsa.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                          <span className="font-medium">{s.nome}</span>
                          <Badge variant="outline" className="text-xs">{s.qualificacao}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleConfirm} className="w-full">
                  <Check className="h-4 w-4 mr-1" /> Confirmar e Preencher Dados
                </Button>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
