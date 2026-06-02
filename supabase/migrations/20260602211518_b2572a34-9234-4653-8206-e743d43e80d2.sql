CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_project_etapa_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.etapa IS DISTINCT FROM OLD.etapa THEN
    PERFORM net.http_post(
      url := 'https://mlltdghnxhdfymasikga.supabase.co/functions/v1/notify-project-etapa-change',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sbHRkZ2hueGhkZnltYXNpa2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTczMDUsImV4cCI6MjA5MTA3MzMwNX0.njCbXXfxMzknx1ckJ3uVpPlRDEwUpEiYfCpXKvHT_II'
      ),
      body := jsonb_build_object(
        'project_id', NEW.id,
        'etapa_anterior', OLD.etapa,
        'etapa_nova', NEW.etapa
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_etapa_change ON public.projects;
CREATE TRIGGER trg_notify_project_etapa_change
AFTER UPDATE OF etapa ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.notify_project_etapa_change();