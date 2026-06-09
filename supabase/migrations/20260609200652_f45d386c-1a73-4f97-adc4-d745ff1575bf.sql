CREATE OR REPLACE FUNCTION public.set_proposal_data_aprovacao_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ganha'
     AND NEW.data_aprovacao IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ganha') THEN
    NEW.data_aprovacao := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_proposal_data_aprovacao ON public.proposals;
CREATE TRIGGER trg_set_proposal_data_aprovacao
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.set_proposal_data_aprovacao_default();