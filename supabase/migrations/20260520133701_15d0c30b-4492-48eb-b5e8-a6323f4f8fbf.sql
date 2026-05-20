CREATE OR REPLACE FUNCTION public.sync_proposal_to_project_receivables()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_exists boolean;
  v_total numeric;
  v_parcela jsonb;
  v_idx int;
  v_count int;
  v_is_etapas boolean;
BEGIN
  IF NEW.status = 'ganha' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ganha') THEN
    SELECT EXISTS(SELECT 1 FROM public.projects WHERE proposal_id = NEW.id) INTO v_project_exists;
    IF NOT v_project_exists THEN
      INSERT INTO public.projects (title, client_id, proposal_id, description, budget, status)
      VALUES (NEW.title, NEW.client_id, NEW.id, NEW.description, NEW.value, 'em_andamento');
    ELSE
      UPDATE public.projects SET status = 'em_andamento' WHERE proposal_id = NEW.id;
    END IF;

    SELECT count(*) INTO v_count FROM public.receivables WHERE proposal_id = NEW.id;
    IF v_count = 0 THEN
      v_total := COALESCE(NEW.value, 0);
      v_is_etapas := (NEW.payment_type = 'etapas');
      IF NEW.parcelas IS NULL OR jsonb_array_length(NEW.parcelas) = 0 THEN
        INSERT INTO public.receivables (proposal_id, client_id, parcela_index, description, amount, due_date, previsao_nf, status)
        VALUES (NEW.id, NEW.client_id, 0, 'Parcela Única', v_total, NULL, NULL, 'pendente');
      ELSE
        v_idx := 0;
        FOR v_parcela IN SELECT * FROM jsonb_array_elements(NEW.parcelas) LOOP
          INSERT INTO public.receivables (proposal_id, client_id, parcela_index, description, amount, due_date, previsao_nf, status)
          VALUES (
            NEW.id,
            NEW.client_id,
            v_idx,
            COALESCE(v_parcela->>'descricao', 'Parcela ' || (v_idx + 1)::text),
            ROUND((COALESCE((v_parcela->>'valor')::numeric, 0) / 100.0) * v_total, 2),
            NULL,
            CASE WHEN v_is_etapas THEN NULL ELSE NULLIF(v_parcela->>'vencimento', '')::date END,
            'pendente'
          );
          v_idx := v_idx + 1;
        END LOOP;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'ganha' AND NEW.status IS DISTINCT FROM 'ganha' THEN
    DELETE FROM public.projects WHERE proposal_id = NEW.id;
    DELETE FROM public.receivables WHERE proposal_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;