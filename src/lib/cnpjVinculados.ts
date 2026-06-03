// Helpers para a estrutura `cnpjs_vinculados` em clients.
// Mantém compatibilidade com o formato antigo (contact_name/email único)
// e o novo formato com múltiplos contatos.

export type CnpjVinculadoContact = { name: string; email?: string | null };

export type CnpjVinculado = {
  cnpj: string;
  razao_social?: string | null;
  label?: string | null;
  contacts?: CnpjVinculadoContact[];
  // Legacy:
  contact_name?: string | null;
  email?: string | null;
  added_from?: string | null;
  added_at?: string | null;
};

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

/** Retorna a lista de contatos de uma entrada (consolidando o legado). */
export function getVinculadoContacts(v: CnpjVinculado | undefined | null): CnpjVinculadoContact[] {
  if (!v) return [];
  const list: CnpjVinculadoContact[] = Array.isArray(v.contacts) ? [...v.contacts] : [];
  const legacyName = (v.contact_name || "").trim();
  if (legacyName && !list.some((c) => norm(c.name) === norm(legacyName))) {
    list.unshift({ name: legacyName, email: v.email ?? null });
  }
  return list.filter((c) => (c?.name || "").trim().length > 0);
}

/** Adiciona/atualiza um contato (por nome, case-insensitive) sem sobrescrever os demais. */
export function upsertVinculadoContact(
  v: CnpjVinculado,
  contact: CnpjVinculadoContact
): CnpjVinculado {
  const name = (contact.name || "").trim();
  if (!name) return v;
  const current = getVinculadoContacts(v);
  const idx = current.findIndex((c) => norm(c.name) === norm(name));
  if (idx >= 0) {
    current[idx] = { name, email: contact.email ?? current[idx].email ?? null };
  } else {
    current.push({ name, email: contact.email ?? null });
  }
  const first = current[0];
  return {
    ...v,
    contacts: current,
    // Mantém os campos legados sincronizados com o primeiro contato para compatibilidade.
    contact_name: first?.name ?? null,
    email: first?.email ?? null,
  };
}

/** Remove um contato (por nome, case-insensitive) de uma entrada vinculada. */
export function removeVinculadoContact(
  v: CnpjVinculado,
  contactName: string
): CnpjVinculado {
  const target = norm(contactName);
  if (!target) return v;
  const current = getVinculadoContacts(v).filter((c) => norm(c.name) !== target);
  const first = current[0];
  return {
    ...v,
    contacts: current,
    contact_name: first?.name ?? null,
    email: first?.email ?? null,
  };
}

/** Para um contato (por nome), retorna os CNPJs vinculados onde ele aparece. */
export function findVinculadosForContact(
  vinculados: any,
  contactName: string
): CnpjVinculado[] {
  if (!Array.isArray(vinculados) || !contactName) return [];
  const target = norm(contactName);
  return (vinculados as CnpjVinculado[]).filter((v) =>
    getVinculadoContacts(v).some((c) => norm(c.name) === target)
  );
}
