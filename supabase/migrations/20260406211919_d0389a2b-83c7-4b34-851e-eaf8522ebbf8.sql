
-- Drop default first, then convert
ALTER TABLE public.projects ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.projects ALTER COLUMN status TYPE text;
DROP TYPE public.project_status;
CREATE TYPE public.project_status AS ENUM ('em_andamento', 'em_pausa', 'aguardando_retorno', 'finalizado');

UPDATE public.projects SET status = 'em_andamento' WHERE status IN ('planejamento', 'em_andamento');
UPDATE public.projects SET status = 'finalizado' WHERE status IN ('concluido', 'cancelado');
UPDATE public.projects SET status = 'em_pausa' WHERE status = 'pausado';

ALTER TABLE public.projects ALTER COLUMN status TYPE public.project_status USING status::public.project_status;
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'em_andamento'::public.project_status;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS etapa text DEFAULT 'iniciado';
