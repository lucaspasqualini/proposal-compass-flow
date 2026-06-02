import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users, Linkedin, Phone, Mail } from "lucide-react";
import { formatDate } from "@/lib/format";

type SortKey = "name" | "cargo" | "client_name" | "last_interaction_at";
type SortDir = "asc" | "desc";

type Row = {
  id: string;
  client_id: string;
  name: string;
  cargo: string | null;
  linkedin: string | null;
  phone: string | null;
  email: string | null;
  last_interaction_at: string | null;
  clients: { id: string; name: string } | null;
};

export default function Contatos() {
  const navigate = useNavigate();
  const [search, setSearch] = usePersistedState("contatos:search", "");
  const [sortKey, setSortKey] = usePersistedState<SortKey>("contatos:sortKey", "name");
  const [sortDir, setSortDir] = usePersistedState<SortDir>("contatos:sortDir", "asc");

  const { data, isLoading } = useQuery({
    queryKey: ["client_contacts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("id, client_id, name, cargo, linkedin, phone, email, last_interaction_at, clients(id, name)")
        .order("name");
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.toLowerCase();
    const list = data.filter((c) => {
      const company = c.clients?.name ?? "";
      return (
        c.name.toLowerCase().includes(s) ||
        (c.cargo ?? "").toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s) ||
        company.toLowerCase().includes(s)
      );
    });
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "name": va = a.name; vb = b.name; break;
        case "cargo": va = a.cargo ?? ""; vb = b.cargo ?? ""; break;
        case "client_name": va = a.clients?.name ?? ""; vb = b.clients?.name ?? ""; break;
        case "last_interaction_at": va = a.last_interaction_at ?? ""; vb = b.last_interaction_at ?? ""; break;
      }
      if (typeof va === "string") {
        const cmp = va.localeCompare(vb, "pt-BR", { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [data, search, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">Todos os contatos vinculados às empresas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary opacity-60" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold">{data?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, cargo, empresa..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      <span className="flex items-center">Nome <SortIcon col="name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("cargo")}>
                      <span className="flex items-center">Cargo <SortIcon col="cargo" /></span>
                    </TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("client_name")}>
                      <span className="flex items-center">Empresa <SortIcon col="client_name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("last_interaction_at")}>
                      <span className="flex items-center">Última Interação <SortIcon col="last_interaction_at" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum contato encontrado
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/clientes/${c.client_id}/contatos/${c.id}`)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.cargo ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.linkedin ? (
                          <a
                            href={c.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Linkedin className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[120px]">{c.linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {c.phone}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {c.clients ? (
                          <button
                            className="text-primary hover:underline"
                            onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.client_id}`); }}
                          >
                            {c.clients.name}
                          </button>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.last_interaction_at ? formatDate(c.last_interaction_at) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
