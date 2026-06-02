-- 1) Novos campos na tabela clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS industria text;

-- 2) Tabela de contatos por empresa
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  cargo text,
  linkedin text,
  phone text,
  email text,
  notes text,
  last_interaction_at date,
  last_interaction_type text,
  last_interaction_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON public.client_contacts(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;
GRANT ALL ON public.client_contacts TO service_role;

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts select"
ON public.client_contacts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role) OR
  has_role(auth.uid(), 'gerente_projetos'::app_role) OR
  has_role(auth.uid(), 'consultor_projetos'::app_role) OR
  has_role(auth.uid(), 'administrativo'::app_role)
);

CREATE POLICY "Contacts insert"
ON public.client_contacts FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'socio'::app_role) OR
  has_role(auth.uid(), 'gerente_projetos'::app_role) OR
  has_role(auth.uid(), 'administrativo'::app_role)
);

CREATE POLICY "Contacts update"
ON public.client_contacts FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role) OR
  has_role(auth.uid(), 'gerente_projetos'::app_role) OR
  has_role(auth.uid(), 'administrativo'::app_role)
);

CREATE POLICY "Contacts delete"
ON public.client_contacts FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role) OR
  has_role(auth.uid(), 'gerente_projetos'::app_role) OR
  has_role(auth.uid(), 'administrativo'::app_role)
);

CREATE TRIGGER update_client_contacts_updated_at
BEFORE UPDATE ON public.client_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();