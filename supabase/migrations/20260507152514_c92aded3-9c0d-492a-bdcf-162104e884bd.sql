ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS responsavel_projeto text,
  ADD COLUMN IF NOT EXISTS previsao_nf date,
  ADD COLUMN IF NOT EXISTS parcela_label text,
  ADD COLUMN IF NOT EXISTS valor_proposta numeric,
  ADD COLUMN IF NOT EXISTS valor_nf numeric,
  ADD COLUMN IF NOT EXISTS valor_recebido numeric,
  ADD COLUMN IF NOT EXISTS status_origem text;