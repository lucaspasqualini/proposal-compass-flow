ALTER TABLE public.receivables
ADD COLUMN IF NOT EXISTS billing_cnpj text,
ADD COLUMN IF NOT EXISTS billing_razao_social text;