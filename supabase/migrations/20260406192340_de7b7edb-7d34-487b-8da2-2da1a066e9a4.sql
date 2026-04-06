
-- Add proposal_number column
ALTER TABLE public.proposals ADD COLUMN proposal_number TEXT UNIQUE;

-- Function to generate next proposal number MA_XXXX_AA
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_seq INT;
BEGIN
  current_year := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(proposal_number FROM 4 FOR 4) AS INT)
  ), 0) + 1
  INTO next_seq
  FROM public.proposals
  WHERE proposal_number LIKE 'MA_%_' || current_year;
  
  NEW.proposal_number := 'MA_' || LPAD(next_seq::TEXT, 4, '0') || '_' || current_year;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate number on insert
CREATE TRIGGER set_proposal_number
BEFORE INSERT ON public.proposals
FOR EACH ROW
WHEN (NEW.proposal_number IS NULL)
EXECUTE FUNCTION public.generate_proposal_number();
