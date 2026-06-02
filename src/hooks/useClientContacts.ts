import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Contact = Database["public"]["Tables"]["client_contacts"]["Row"];
type ContactInsert = Database["public"]["Tables"]["client_contacts"]["Insert"];

export function useClientContacts(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client_contacts", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId!)
        .order("name");
      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useClientContact(id: string | undefined) {
  return useQuery({
    queryKey: ["client_contacts", "single", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*, clients(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Contact & { clients: { id: string; name: string } | null };
    },
  });
}

export function useCreateClientContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: ContactInsert) => {
      const { data, error } = await supabase
        .from("client_contacts")
        .insert(c)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["client_contacts", data.client_id] }),
  });
}

export function useUpdateClientContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from("client_contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["client_contacts", data.client_id] });
      qc.invalidateQueries({ queryKey: ["client_contacts", "single", data.id] });
    },
  });
}

export function useDeleteClientContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; clientId: string }) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["client_contacts", vars.clientId] }),
  });
}
