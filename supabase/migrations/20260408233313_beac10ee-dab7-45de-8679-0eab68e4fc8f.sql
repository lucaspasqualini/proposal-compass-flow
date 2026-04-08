ALTER TABLE public.projects ADD COLUMN etapa_assinado_at timestamptz;
UPDATE public.projects SET etapa_assinado_at = '2026-04-04T00:00:00Z' WHERE etapa = 'assinado';