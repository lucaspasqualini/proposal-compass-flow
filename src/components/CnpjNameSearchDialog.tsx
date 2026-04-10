import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Building2, MapPin, ExternalLink } from "lucide-react";

interface CnpjNameSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSelect: (cnpj: string) => void;
}

function formatCnpjDisplay(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function CnpjNameSearchDialog({
  open,
  onOpenChange,
  initialName = "",
  onSelect,
}: CnpjNameSearchDialogProps) {
  const [cnpjInput, setCnpjInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCnpjSearch = async () => {
    const digits = cnpjInput.replace(/\D/g, "");
    if (digits.length !== 14) {
      toast({ title: "CNPJ deve conter 14 dígitos", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      onSelect(digits);
      onOpenChange(false);
      setCnpjInput("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setCnpjInput("");
    }
  };

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(initialName + " CNPJ")}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar CNPJ por Nome</DialogTitle>
          <DialogDescription>
            Encontre o CNPJ da empresa e preencha os dados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Help find the CNPJ */}
          <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <Label className="font-semibold text-sm">Empresa: {initialName || "—"}</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Pesquise o CNPJ da empresa em um dos serviços abaixo e depois cole o número aqui:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(googleSearchUrl, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> Google
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://cnpjs.dev/?q=${encodeURIComponent(initialName)}`, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> CNPJ.dev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://casadosdados.com.br/solucao/cnpj?q=${encodeURIComponent(initialName)}`, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> Casa dos Dados
              </Button>
            </div>
          </div>

          {/* Step 2: Enter the CNPJ */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Cole o CNPJ encontrado</Label>
            <div className="flex gap-2">
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={(e) => setCnpjInput(formatCnpjInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleCnpjSearch()}
                className="flex-1 font-mono"
                autoFocus
              />
              <Button onClick={handleCnpjSearch} disabled={loading || cnpjInput.replace(/\D/g, "").length !== 14}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Consultar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ao consultar, os dados cadastrais serão preenchidos automaticamente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
