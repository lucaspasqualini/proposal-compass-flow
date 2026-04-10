import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Building2, MapPin, CheckCircle2 } from "lucide-react";

interface CnpjNameResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  uf?: string;
  municipio?: string;
  situacao_cadastral?: string;
  cnae_principal?: string;
  cnae_descricao?: string;
}

interface CnpjNameSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSelect: (cnpj: string) => void;
}

export default function CnpjNameSearchDialog({
  open,
  onOpenChange,
  initialName = "",
  onSelect,
}: CnpjNameSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CnpjNameResult[]>([]);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (searchTerm.trim().length < 3) {
      toast({ title: "Digite pelo menos 3 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResults([]);
    setSearched(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/search-cnpj-by-name?nome=${encodeURIComponent(searchTerm.trim())}`;

      const response = await fetch(url, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao buscar");
      }

      const data = await response.json();
      setResults(data.results || []);

      if (!data.results?.length) {
        toast({ title: "Nenhum resultado encontrado", description: "Tente um nome diferente" });
      }
    } catch (err: any) {
      toast({ title: err.message || "Erro ao buscar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: CnpjNameResult) => {
    const cnpjDigits = result.cnpj.replace(/\D/g, "");
    onSelect(cnpjDigits);
    onOpenChange(false);
    setResults([]);
    setSearched(false);
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setResults([]);
      setSearched(false);
    } else {
      setSearchTerm(initialName);
    }
  };

  const formatCnpjDisplay = (cnpj: string) => {
    const d = cnpj.replace(/\D/g, "");
    if (d.length !== 14) return cnpj;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Buscar CNPJ por Nome</DialogTitle>
          <DialogDescription>
            Pesquise o nome da empresa para encontrar o CNPJ correspondente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Nome da empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Buscando empresas...</span>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum resultado encontrado. Tente outro nome.
            </div>
          )}

          {results.length > 0 && (
            <ScrollArea className="max-h-[45vh]">
              <div className="space-y-2">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer space-y-1"
                    onClick={() => handleSelect(r)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {r.razao_social || r.nome_fantasia || "—"}
                        </span>
                      </div>
                      {r.situacao_cadastral && (
                        <Badge
                          variant={r.situacao_cadastral === "ATIVA" ? "default" : "destructive"}
                          className="text-[10px] shrink-0"
                        >
                          {r.situacao_cadastral}
                        </Badge>
                      )}
                    </div>
                    {r.nome_fantasia && r.razao_social && r.nome_fantasia !== r.razao_social && (
                      <p className="text-xs text-muted-foreground pl-6">{r.nome_fantasia}</p>
                    )}
                    <div className="flex items-center gap-3 pl-6 text-xs text-muted-foreground">
                      <span className="font-mono">{formatCnpjDisplay(r.cnpj)}</span>
                      {(r.municipio || r.uf) && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {[r.municipio, r.uf].filter(Boolean).join("/")}
                        </span>
                      )}
                    </div>
                    {r.cnae_descricao && (
                      <p className="text-[11px] text-muted-foreground pl-6 truncate">{r.cnae_descricao}</p>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
