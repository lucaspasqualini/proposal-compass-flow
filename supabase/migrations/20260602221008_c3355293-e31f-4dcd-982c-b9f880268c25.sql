-- Adicionar coluna para registrar quem moveu (passada via trigger)
-- O trigger precisa enviar auth.uid() para a edge function

CREATE OR REPLACE FUNCTION public.notify_project_etapa_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
        'etapa_nova', NEW.etapa,
        'changed_by_user_id', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Atualizar template com novos placeholders e copy revisado
UPDATE public.notification_email_templates
SET
  placeholders = '["destinatario","autor","codigo_projeto","projeto","cliente","cnpj","etapa_anterior","etapa_nova","alerta_nf","parcela_descricao","parcela_valor"]'::jsonb,
  assunto = '[{{codigo_projeto}}] Projeto mudou para {{etapa_nova}} — {{projeto}}',
  corpo_html = '<div style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:24px;">
  <div style="border-left:4px solid #0D7377;padding-left:16px;margin-bottom:24px;">
    <h2 style="margin:0;color:#0D7377;font-size:20px;">Mudança de etapa em projeto</h2>
    <p style="margin:4px 0 0;color:#555;font-size:14px;">{{codigo_projeto}} · {{projeto}}</p>
  </div>

  <p style="font-size:15px;">Olá <strong>{{destinatario}}</strong>,</p>

  <p style="font-size:15px;line-height:1.5;">
    O projeto <strong>{{codigo_projeto}} — {{projeto}}</strong> (cliente <strong>{{cliente}}</strong>)
    foi movido por <strong>{{autor}}</strong> da etapa
    <strong>{{etapa_anterior}}</strong> para <strong>{{etapa_nova}}</strong>.
  </p>

  {{alerta_nf}}

  <p style="margin-top:32px;font-size:13px;color:#666;border-top:1px solid #eee;padding-top:16px;">
    Esta é uma notificação automática do sistema Meden.
  </p>
</div>'
WHERE key = 'project-etapa-change';