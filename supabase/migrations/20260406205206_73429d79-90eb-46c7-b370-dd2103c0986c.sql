
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS payment_type text,
ADD COLUMN IF NOT EXISTS parcelas jsonb DEFAULT '[]'::jsonb;
