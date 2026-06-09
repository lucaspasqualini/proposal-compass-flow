CREATE TABLE IF NOT EXISTS public.clients_import (
  match_name text,
  new_name text,
  cnpj text,
  website text,
  linkedin text,
  setor text,
  subsetor text,
  uf text
);
GRANT ALL ON public.clients_import TO authenticated, service_role;