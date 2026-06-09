ALTER TABLE public.clients RENAME COLUMN industria TO setor;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subsetor text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS uf text;