
ALTER TABLE public.proposals
  ADD COLUMN tipo_projeto TEXT,
  ADD COLUMN data_envio DATE,
  ADD COLUMN data_aprovacao DATE,
  ADD COLUMN data_fup DATE,
  ADD COLUMN cliente_contato TEXT,
  ADD COLUMN indicador TEXT,
  ADD COLUMN observacoes TEXT;
