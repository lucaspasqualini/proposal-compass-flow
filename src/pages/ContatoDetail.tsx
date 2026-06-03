import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  useClientContact,
  useUpdateClientContact,
  useDeleteClientContact,
} from "@/hooks/useClientContacts";
import { useProposals } from "@/hooks/useProposals";
import { useClients } from "@/hooks/useClients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency, proposalStatusLabels, proposalStatusColors } from "@/lib/format";
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Linkedin,
  Save,
  Trash2,
  Building2,
  Clock,
  FileText,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { findVinculadosForContact } from "@/lib/cnpjVinculados";

export default function ContatoDetail() {
  const { clientId, contactId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConsultor } = useUserRole();
  const canEdit = !isConsultor;

  const { data: contact, isLoading } = useClientContact(contactId);
  const updateContact = useUpdateClientContact();
  const deleteContact = useDeleteClientContact();
  const { data: allProposals } = useProposals();
  const { data: clientsList } = useClients();

  const { data: projects } = useQuery({
    queryKey: ["projects-by-client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, status, created_at, client_id")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    name: "",
    cargo: "",
    linkedin: "",
    phone: "",
    email: "",
    notes: "",
    last_interaction_at: "",
    last_interaction_type: "",
    last_interaction_note: "",
    client_id: "" as string,
  });

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name ?? "",
        cargo: contact.cargo ?? "",
        linkedin: contact.linkedin ?? "",
        phone: contact.phone ?? "",
        email: contact.email ?? "",
        notes: contact.notes ?? "",
        last_interaction_at: contact.last_interaction_at ?? "",
        last_interaction_type: contact.last_interaction_type ?? "",
        last_interaction_note: contact.last_interaction_note ?? "",
        client_id: (contact as any).client_id ?? "",
      });
    }
  }, [contact]);

  // Match proposals by cliente_contato ~ contact name
  const relatedProposals = useMemo(() => {
    if (!contact || !allProposals) return [];
    const target = contact.name.toLowerCase().trim();
    return allProposals
      .filter(
        (p) =>
          p.client_id === clientId &&
          (p as any).cliente_contato &&
          String((p as any).cliente_contato).toLowerCase().trim() === target
      )
      .sort((a, b) => {
        const da = (a as any).data_envio || a.created_at;
        const db = (b as any).data_envio || b.created_at;
        return new Date(db).getTime() - new Date(da).getTime();
      });
  }, [allProposals, contact, clientId]);

  const derivedLastInteraction = useMemo(() => {
    const items: { date: string; label: string }[] = [];
    for (const p of relatedProposals) {
      const d = (p as any).data_envio || p.created_at;
      if (d) items.push({ date: d, label: `Proposta ${p.proposal_number || p.title}` });
    }
    if (form.last_interaction_at)
      items.push({
        date: form.last_interaction_at,
        label: form.last_interaction_type || "Registro manual",
      });
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items[0] ?? null;
  }, [relatedProposals, form.last_interaction_at, form.last_interaction_type]);

  const handleSave = async () => {
    if (!contact) return;
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        name: form.name,
        cargo: form.cargo || null,
        linkedin: form.linkedin || null,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
        last_interaction_at: form.last_interaction_at || null,
        last_interaction_type: form.last_interaction_type || null,
        last_interaction_note: form.last_interaction_note || null,
        client_id: form.client_id || null,
      } as any);
      toast({ title: "Contato atualizado" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!contact || !clientId) return;
    try {
      await deleteContact.mutateAsync({ id: contact.id, clientId });
      toast({ title: "Contato removido" });
      navigate(`/clientes/${clientId}`);
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  if (isLoading)
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!contact)
    return <div className="p-8 text-center text-muted-foreground">Contato não encontrado</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/clientes/${clientId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Building2 className="h-3 w-3" />
            <Link
              to={`/clientes/${clientId}`}
              className="hover:underline text-primary"
            >
              {contact.clients?.name ?? "Empresa"}
            </Link>
            {contact.cargo && <span>• {contact.cargo}</span>}
          </p>
        </div>
        {canEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover contato?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {derivedLastInteraction && (
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Última interação
              </p>
              <p className="text-sm font-medium">
                {formatDate(derivedLastInteraction.date)} — {derivedLastInteraction.label}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <fieldset disabled={!canEdit} className="contents">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Cargo
                </Label>
                <Input
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  placeholder="Ex: Diretor Financeiro"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Empresa
              </Label>
              <Select
                value={form.client_id || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, client_id: v === "__none__" ? "" : v })
                }
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem empresa —</SelectItem>
                  {(clientsList ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1">
                  <Linkedin className="h-3 w-3" /> Linkedin
                </Label>
                <Input
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Última Interação (registro manual)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.last_interaction_at}
                  onChange={(e) =>
                    setForm({ ...form, last_interaction_at: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Input
                  placeholder="Ex: Reunião, ligação, e-mail"
                  value={form.last_interaction_type}
                  onChange={(e) =>
                    setForm({ ...form, last_interaction_type: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Anotação</Label>
              <Textarea
                rows={2}
                value={form.last_interaction_note}
                onChange={(e) =>
                  setForm({ ...form, last_interaction_note: e.target.value })
                }
              />
            </div>
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={updateContact.isPending}
                className="w-fit"
              >
                <Save className="h-4 w-4 mr-1" /> Salvar Alterações
              </Button>
            )}
          </CardContent>
        </Card>
      </fieldset>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Propostas relacionadas
            {relatedProposals.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {relatedProposals.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relatedProposals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma proposta associada a este contato.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedProposals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.proposal_number || "—"}
                    </TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={proposalStatusColors[p.status]}>
                        {proposalStatusLabels[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatCurrency(Number(p.value))}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(p as any).data_envio
                        ? formatDate((p as any).data_envio)
                        : formatDate(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {projects && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Projetos da empresa ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
