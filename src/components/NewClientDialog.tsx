import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCreateClient } from "@/hooks/useClients";
import { useCreateClientContact } from "@/hooks/useClientContacts";
import CnpjLookupDialog, { type CnpjConfirmData } from "@/components/CnpjLookupDialog";
import { Search, Building2, UserPlus } from "lucide-react";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful creation with the new client id and (optional) contact name. */
  onCreated: (clientId: string, contactName?: string) => void;
  /** Pre-fill the company name from the proposal context. */
  initialName?: string;
}

const emptyForm = {
  name: "",
  cnpj: "",
  razao_social: "",
  nome_fantasia: "",
  email: "",
  phone: "",
  website: "",
  linkedin: "",
  industria: "",
  address: "",
  notes: "",
  capital_social: null as number | null,
  natureza_juridica: "",
  cnae_principal: "",
  cnae_descricao: "",
  porte: "",
  data_abertura: "",
  situacao_cadastral: "",
  qsa: [] as CnpjConfirmData["qsa"],
  // primary contact (optional)
  contact_name: "",
  contact_cargo: "",
  contact_email: "",
  contact_phone: "",
  contact_linkedin: "",
};

export default function NewClientDialog({
  open,
  onOpenChange,
  onCreated,
  initialName = "",
}: NewClientDialogProps) {
  const { toast } = useToast();
  const createClient = useCreateClient();
  const createContact = useCreateClientContact();

  const [form, setForm] = useState({ ...emptyForm, name: initialName });
  const [cnpjOpen, setCnpjOpen] = useState(false);

  const reset = () => setForm({ ...emptyForm });

  const handleCnpj = (d: CnpjConfirmData) => {
    setForm((p) => ({
      ...p,
      name: p.name || d.nome_fantasia || d.razao_social,
      cnpj: d.cnpj,
      razao_social: d.razao_social || p.razao_social,
      nome_fantasia: d.nome_fantasia || p.nome_fantasia,
      address: d.address || p.address,
      phone: d.phone || p.phone,
      email: d.email || p.email,
      capital_social: d.capital_social ?? p.capital_social,
      natureza_juridica: d.natureza_juridica || p.natureza_juridica,
      cnae_principal: d.cnae_principal || p.cnae_principal,
      cnae_descricao: d.cnae_descricao || p.cnae_descricao,
      porte: d.porte || p.porte,
      data_abertura: d.data_abertura || p.data_abertura,
      situacao_cadastral: d.situacao_cadastral || p.situacao_cadastral,
      qsa: d.qsa?.length ? d.qsa : p.qsa,
    }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: "Nome da empresa é obrigatório", variant: "destructive" });
      return;
    }
    try {
      const created = await createClient.mutateAsync({
        name,
        cnpj: form.cnpj || null,
        razao_social: form.razao_social || null,
        nome_fantasia: form.nome_fantasia || null,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        linkedin: form.linkedin || null,
        industria: form.industria || null,
        address: form.address || null,
        notes: form.notes || null,
        capital_social: form.capital_social,
        natureza_juridica: form.natureza_juridica || null,
        cnae_principal: form.cnae_principal || null,
        cnae_descricao: form.cnae_descricao || null,
        porte: form.porte || null,
        data_abertura: form.data_abertura || null,
        situacao_cadastral: form.situacao_cadastral || null,
        qsa: form.qsa as any,
      } as any);

      if (form.contact_name.trim()) {
        try {
          await createContact.mutateAsync({
            client_id: created.id,
            name: form.contact_name.trim(),
            cargo: form.contact_cargo.trim() || null,
            email: form.contact_email.trim() || null,
            phone: form.contact_phone.trim() || null,
            linkedin: form.contact_linkedin.trim() || null,
          });
        } catch {
          // non-blocking
        }
      }

      toast({ title: "Empresa criada com sucesso" });
      onCreated(created.id, form.contact_name.trim() || undefined);
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao criar empresa", variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Nova Empresa
            </DialogTitle>
            <DialogDescription>
              Cadastre uma nova empresa. Use o botão de CNPJ para preencher dados automaticamente.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] px-6">
            <div className="space-y-6 py-2">
              {/* CNPJ lookup */}
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setCnpjOpen(true)}>
                  <Search className="h-4 w-4 mr-1" /> Consultar CNPJ
                </Button>
              </div>

              {/* Identificação */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Identificação</h4>
                <div className="grid gap-2">
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome curto / como será exibido"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>CNPJ</Label>
                    <Input
                      value={form.cnpj}
                      onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Situação Cadastral</Label>
                    <Input
                      value={form.situacao_cadastral}
                      onChange={(e) => setForm({ ...form, situacao_cadastral: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Razão Social</Label>
                    <Input
                      value={form.razao_social}
                      onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nome Fantasia</Label>
                    <Input
                      value={form.nome_fantasia}
                      onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Dados Receita */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Dados da Receita</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Natureza Jurídica</Label>
                    <Input
                      value={form.natureza_juridica}
                      onChange={(e) => setForm({ ...form, natureza_juridica: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Porte</Label>
                    <Input
                      value={form.porte}
                      onChange={(e) => setForm({ ...form, porte: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Capital Social</Label>
                    <Input
                      type="number"
                      value={form.capital_social ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          capital_social: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data Abertura</Label>
                    <Input
                      type="date"
                      value={form.data_abertura}
                      onChange={(e) => setForm({ ...form, data_abertura: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>CNAE Principal</Label>
                    <Input
                      value={form.cnae_principal}
                      onChange={(e) => setForm({ ...form, cnae_principal: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição CNAE</Label>
                    <Input
                      value={form.cnae_descricao}
                      onChange={(e) => setForm({ ...form, cnae_descricao: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Indústria</Label>
                    <Input
                      value={form.industria}
                      onChange={(e) => setForm({ ...form, industria: e.target.value })}
                      placeholder="Setor de atuação"
                    />
                  </div>
                </div>
              </div>

              {/* Contato Empresa */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Contato da Empresa</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Website</Label>
                    <Input
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>LinkedIn</Label>
                    <Input
                      value={form.linkedin}
                      onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Endereço</Label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contato principal (opcional) */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Contato Principal (opcional)
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Cargo</Label>
                    <Input
                      value={form.contact_cargo}
                      onChange={(e) => setForm({ ...form, contact_cargo: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>LinkedIn</Label>
                    <Input
                      value={form.contact_linkedin}
                      onChange={(e) => setForm({ ...form, contact_linkedin: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || createClient.isPending}
            >
              {createClient.isPending ? "Salvando..." : "Salvar Empresa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CnpjLookupDialog open={cnpjOpen} onOpenChange={setCnpjOpen} onConfirm={handleCnpj} />
    </>
  );
}
