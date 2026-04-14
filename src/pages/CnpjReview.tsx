import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ExternalLink, Check, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CnpjRow {
  id: string;
  client_id: string;
  client_name: string;
  cnpj_found: string;
  source_url: string | null;
  status: string;
}

const CnpjReview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [localOverrides, setLocalOverrides] = useState<Record<string, "approved" | "rejected">>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cnpj-review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cnpj_review_queue")
        .select("*")
        .order("client_name");
      if (error) throw error;
      return data as CnpjRow[];
    },
  });

  const getStatus = (row: CnpjRow) => localOverrides[row.id] ?? row.status;

  const filtered = useMemo(() => {
    let items = rows;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(r => r.client_name.toLowerCase().includes(q) || r.cnpj_found.includes(q));
    }
    if (filter !== "all") {
      items = items.filter(r => getStatus(r) === filter);
    }
    return items;
  }, [rows, search, filter, localOverrides]);

  const counts = useMemo(() => {
    let approved = 0, rejected = 0, pending = 0;
    rows.forEach(r => {
      const s = getStatus(r);
      if (s === "approved") approved++;
      else if (s === "rejected") rejected++;
      else pending++;
    });
    return { approved, rejected, pending, total: rows.length };
  }, [rows, localOverrides]);

  const toggleStatus = (id: string, target: "approved" | "rejected") => {
    setLocalOverrides(prev => {
      const current = prev[id] ?? rows.find(r => r.id === id)?.status;
      if (current === target) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: target };
    });
  };

  const setAllVisible = (target: "approved" | "rejected") => {
    setLocalOverrides(prev => {
      const next = { ...prev };
      filtered.forEach(r => { next[r.id] = target; });
      return next;
    });
  };

  const handleSave = async () => {
    const changed = Object.entries(localOverrides);
    if (changed.length === 0) {
      toast({ title: "Nenhuma alteração para salvar" });
      return;
    }
    setSaving(true);
    try {
      let savedClients = 0;

      for (const [id, status] of changed) {
        // Update review queue status
        await supabase.from("cnpj_review_queue").update({ status }).eq("id", id);

        // If approved, also update client CNPJ
        if (status === "approved") {
          const row = rows.find(r => r.id === id);
          if (row) {
            const { error } = await supabase
              .from("clients")
              .update({ cnpj: row.cnpj_found.replace(/\D/g, "") })
              .eq("id", row.client_id);
            if (!error) savedClients++;
          }
        }
      }

      setLocalOverrides({});
      queryClient.invalidateQueries({ queryKey: ["cnpj-review"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: `${changed.length} revisões salvas, ${savedClients} CNPJs gravados nos clientes` });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isWikipedia = (url: string | null) => url?.includes("wikipedia.org") ?? false;
  const getSafeDomain = (url: string | null) => {
    if (!url) return "—";
    try { return new URL(url).hostname; } catch { return url.slice(0, 40); }
  };

  const changedCount = Object.keys(localOverrides).length;

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Revisão de CNPJs</h1>
          <p className="text-muted-foreground text-sm">
            {counts.total} encontrados · <span className="text-green-600">{counts.approved} aprovados</span> · <span className="text-red-500">{counts.rejected} rejeitados</span> · {counts.pending} pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAllVisible("approved")}>
            <Check className="h-4 w-4 mr-1" /> Aprovar visíveis
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAllVisible("rejected")}>
            <X className="h-4 w-4 mr-1" /> Rejeitar visíveis
          </Button>
          <Button onClick={handleSave} disabled={saving || changedCount === 0} size="sm">
            {saving ? "Salvando..." : `Salvar ${changedCount} alterações`}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {{ all: "Todos", pending: "Pendentes", approved: "Aprovados", rejected: "Rejeitados" }[f]}
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
                {filtered.map(row => {
                  const status = getStatus(row);
                  const isApproved = status === "approved";
                  const isRejected = status === "rejected";
                  const suspicious = isWikipedia(row.source_url);
                  const hasChange = row.id in localOverrides;
                  return (
                    <tr key={row.id} className={`border-b transition-colors ${isApproved ? "bg-green-50 dark:bg-green-950/20" : isRejected ? "bg-red-50 dark:bg-red-950/20 opacity-60" : ""} ${hasChange ? "ring-1 ring-inset ring-primary/30" : ""}`}>
                      <td className="p-3"><Checkbox checked={isApproved} onCheckedChange={() => toggleStatus(row.id, "approved")} /></td>
                      <td className="p-3 font-medium">{row.client_name}</td>
                      <td className="p-3 font-mono text-xs">
                        {row.cnpj_found}
                        {suspicious && <Badge variant="destructive" className="ml-2 text-[10px]">⚠ Wikipedia</Badge>}
                      </td>
                      <td className="p-3">
                        {row.source_url ? (
                          <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-[300px] truncate">
                            {getSafeDomain(row.source_url)}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant={isApproved ? "default" : "ghost"} className="h-7 w-7" onClick={() => toggleStatus(row.id, "approved")}><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant={isRejected ? "destructive" : "ghost"} className="h-7 w-7" onClick={() => toggleStatus(row.id, "rejected")}><X className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum resultado encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CnpjReview;
