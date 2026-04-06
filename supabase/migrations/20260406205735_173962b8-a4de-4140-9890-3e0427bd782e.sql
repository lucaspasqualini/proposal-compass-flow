
-- Remove default first
ALTER TABLE public.proposals ALTER COLUMN status DROP DEFAULT;

-- Convert to text
ALTER TABLE public.proposals ALTER COLUMN status TYPE text;

-- Drop old enum
DROP TYPE public.proposal_status;

-- Map existing statuses
UPDATE public.proposals SET status = 'em_elaboracao' WHERE status IN ('rascunho', 'enviada', 'em_analise');
UPDATE public.proposals SET status = 'ganha' WHERE status = 'aprovada';
UPDATE public.proposals SET status = 'perdida' WHERE status = 'rejeitada';

-- Create new enum
CREATE TYPE public.proposal_status AS ENUM ('em_elaboracao', 'em_negociacao', 'ganha', 'perdida');

-- Convert back
ALTER TABLE public.proposals ALTER COLUMN status TYPE public.proposal_status USING status::public.proposal_status;
ALTER TABLE public.proposals ALTER COLUMN status SET DEFAULT 'em_elaboracao'::public.proposal_status;
