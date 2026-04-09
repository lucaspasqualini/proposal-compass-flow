ALTER TABLE public.receivables 
  ADD COLUMN nfe_number text DEFAULT NULL,
  ADD COLUMN cofins numeric DEFAULT NULL,
  ADD COLUMN csll numeric DEFAULT NULL,
  ADD COLUMN irpj numeric DEFAULT NULL,
  ADD COLUMN pis numeric DEFAULT NULL;