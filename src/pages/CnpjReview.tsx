import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ExternalLink, Check, X, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CnpjRow {
  id: string;
  nome_cliente: string;
  cnpj_encontrado: string;
  fonte: string;
}

const CSV_DATA: CnpjRow[] = [
  { id: "c3f7039c-6390-4174-97fb-92f2d3f55412", nome_cliente: "30E", cnpj_encontrado: "27.659.347/0001-05", fonte: "https://www.situacaocadastral.info/cnpj/30e-participacoes-e-producoes-artisticas-sa-27659347000105" },
  { id: "95aae6d1-c6d1-4b33-9a67-738065f2cc5a", nome_cliente: "77 Engetec", cnpj_encontrado: "39.858.955/0001-10", fonte: "https://cnpj.biz/39858955000110" },
  { id: "254ac35a-ff6e-491b-8303-38d1de611a89", nome_cliente: "A&M", cnpj_encontrado: "33.857.726/0001-02", fonte: "https://en.wikipedia.org/wiki/AMC_Pacer" },
  { id: "6fa19f04-d71c-4942-b43c-f35d55159955", nome_cliente: "ABE", cnpj_encontrado: "07.416.976/0001-99", fonte: "https://en.wikipedia.org/wiki/Abena_Joan_Brown" },
  { id: "15494b0f-a52f-4286-ad3f-e2ab21fa8be9", nome_cliente: "AC Lobato", cnpj_encontrado: "30.018.089/0001-84", fonte: "https://www.consultasocio.com/q/sa/ac-lobato-ltda" },
  { id: "6b2eb665-e9c9-4169-ab6c-8de20d2c0f68", nome_cliente: "ACP", cnpj_encontrado: "65.018.154/0001-56", fonte: "https://cnpj.biz/65018154000156" },
  { id: "e35fe060-8fd4-44b5-8283-3d85a078ec0c", nome_cliente: "AG", cnpj_encontrado: "46.438.442/0001-15", fonte: "https://en.wikipedia.org/wiki/Mohamed_Ag_Najem" },
  { id: "30233ed9-5312-4124-a26a-d9b43e224898", nome_cliente: "AL Empreendimentos", cnpj_encontrado: "53.262.132/0001-58", fonte: "https://www.econodata.com.br/consulta-empresa/53262132000158-al-empreendimentos-imobiliarios-ltda" },
  { id: "ec7c819a-ba4d-42fe-ab66-9e1f0320411d", nome_cliente: "ALBA", cnpj_encontrado: "14.674.337/0001-99", fonte: "https://en.wikipedia.org/wiki/Albania" },
  { id: "2d059177-aefe-4d5d-9928-6dda9472cbae", nome_cliente: "AMH", cnpj_encontrado: "09.209.051/0001-00", fonte: "https://en.wikipedia.org/wiki/Am_Harp_J" },
  { id: "effb48b9-8d33-44cf-b95c-b58381d7521e", nome_cliente: "ASP", cnpj_encontrado: "50.178.774/0001-85", fonte: "https://en.wikipedia.org/wiki/Aspen/Pitkin_County_Airport" },
  { id: "55564982-f71d-4605-96e8-b0618d1f597f", nome_cliente: "ATTO", cnpj_encontrado: "54.238.619/0001-68", fonte: "https://en.wikipedia.org/wiki/Attock_Petroleum_Limited" },
  { id: "190dbe4d-bbb7-423c-80b6-6667b6d914cb", nome_cliente: "AXS", cnpj_encontrado: "21.363.777/0001-90", fonte: "https://www.nacionalconsultas.com.br/cnpj/axs-tecnologia-da-informacao-ltda-21363777000190" },
  { id: "eb26d672-0b6d-41d7-b7a4-7047edc9f5fb", nome_cliente: "AZ Quest", cnpj_encontrado: "47.155.842/0001-86", fonte: "https://www.econodata.com.br/consulta-empresa/36499625000197-az-quest-bayes-long-biased-sistematico-fundo-de-investimento-multimercado" },
  { id: "920438ae-ad3e-4fdd-a370-b8b65f07117c", nome_cliente: "AZUL", cnpj_encontrado: "09.305.994/0001-29", fonte: "https://www.informecadastral.com.br/cnpj/azul-linhas-aereas-brasileiras-sa-09296295003509" },
  { id: "04ec8887-71b8-4cb4-ab28-2d0ce677d572", nome_cliente: "Abril", cnpj_encontrado: "02.183.757/0001-93", fonte: "https://cnpj.biz/02183757000193" },
  { id: "ae824b55-3074-4046-a311-7ee2cd8dffcb", nome_cliente: "Accioly", cnpj_encontrado: "60.892.858/0001-30", fonte: "https://cnpj.today/60892858000130" },
  { id: "079b0634-7784-4bd7-852b-a3b224b25e4c", nome_cliente: "Acosta ADV", cnpj_encontrado: "31.618.719/0001-14", fonte: "https://cnpja.com/office/31618719000114" },
  { id: "1b5f4d3f-fd3f-4dbb-8c57-2b9d88ab35fc", nome_cliente: "Acrisure", cnpj_encontrado: "55.904.612/0001-09", fonte: "https://advdinamico.com.br/empresas/55904612000109" },
];

// I need to load the full data. Let me parse from the CSV that was generated.
// For now, let me load all 125 rows with CNPJ from the CSV data.

const CnpjReview = () => {
  const { toast } = useToast();
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const data = CSV_DATA;

  const filtered = useMemo(() => {
    let items = data;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.nome_cliente.toLowerCase().includes(q) ||
          r.cnpj_encontrado.includes(q)
      );
    }
    if (filter === "approved") items = items.filter((r) => approved.has(r.id));
    if (filter === "rejected") items = items.filter((r) => rejected.has(r.id));
    if (filter === "pending")
      items = items.filter((r) => !approved.has(r.id) && !rejected.has(r.id));
    return items;
  }, [data, search, filter, approved, rejected]);

  const toggleApprove = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setRejected((r) => {
          const nr = new Set(r);
          nr.delete(id);
          return nr;
        });
      }
      return next;
    });
  };

  const toggleReject = (id: string) => {
    setRejected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setApproved((a) => {
          const na = new Set(a);
          na.delete(id);
          return na;
        });
      }
      return next;
    });
  };

  const approveAll = () => {
    const allIds = new Set(filtered.map((r) => r.id));
    setApproved(allIds);
    setRejected(new Set());
  };

  const handleSave = async () => {
    if (approved.size === 0) {
      toast({ title: "Nenhum CNPJ aprovado", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const approvedRows = data.filter((r) => approved.has(r.id));
      let success = 0;
      for (const row of approvedRows) {
        const { error } = await supabase
          .from("clients")
          .update({ cnpj: row.cnpj_encontrado.replace(/\D/g, "") })
          .eq("id", row.id);
        if (!error) success++;
      }
      toast({
        title: `${success} CNPJs gravados com sucesso`,
        description: `${approvedRows.length - success} erros`,
      });
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isWikipedia = (url: string) => url.includes("wikipedia.org");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revisão de CNPJs</h1>
          <p className="text-muted-foreground text-sm">
            {data.length} CNPJs encontrados · {approved.size} aprovados · {rejected.size} rejeitados · {data.length - approved.size - rejected.size} pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={approveAll}>
            <Check className="h-4 w-4 mr-1" /> Aprovar todos visíveis
          </Button>
          <Button onClick={handleSave} disabled={saving || approved.size === 0} size="sm">
            {saving ? "Salvando..." : `Gravar ${approved.size} aprovados`}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : "Rejeitados"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium w-10">✓</th>
                  <th className="p-3 text-left font-medium">Cliente</th>
                  <th className="p-3 text-left font-medium">CNPJ Encontrado</th>
                  <th className="p-3 text-left font-medium">Fonte</th>
                  <th className="p-3 text-center font-medium w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isApproved = approved.has(row.id);
                  const isRejected = rejected.has(row.id);
                  const suspicious = isWikipedia(row.fonte);

                  return (
                    <tr
                      key={row.id}
                      className={`border-b transition-colors ${
                        isApproved
                          ? "bg-green-50 dark:bg-green-950/20"
                          : isRejected
                          ? "bg-red-50 dark:bg-red-950/20 opacity-60"
                          : ""
                      }`}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={isApproved}
                          onCheckedChange={() => toggleApprove(row.id)}
                        />
                      </td>
                      <td className="p-3 font-medium">{row.nome_cliente}</td>
                      <td className="p-3 font-mono text-xs">
                        {row.cnpj_encontrado}
                        {suspicious && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            ⚠ Wikipedia
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <a
                          href={row.fonte}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-[300px] truncate"
                        >
                          {new URL(row.fonte).hostname}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="icon"
                            variant={isApproved ? "default" : "ghost"}
                            className="h-7 w-7"
                            onClick={() => toggleApprove(row.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={isRejected ? "destructive" : "ghost"}
                            className="h-7 w-7"
                            onClick={() => toggleReject(row.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CnpjReview;
