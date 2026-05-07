CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  current_year TEXT;
  next_seq INT;
BEGIN
  current_year := to_char(now(), 'YY');

  SELECT COALESCE(MAX(
    CAST(substring(proposal_number from '^MA_(\d{4})_' || current_year || '$') AS INT)
  ), 0) + 1
  INTO next_seq
  FROM public.proposals
  WHERE proposal_number ~ ('^MA_\d{4}_' || current_year || '$');

  NEW.proposal_number := 'MA_' || LPAD(next_seq::TEXT, 4, '0') || '_' || current_year;
  RETURN NEW;
END;
$function$;