
-- Templates de email de notificação
CREATE TABLE public.notification_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  assunto text NOT NULL,
  corpo_html text NOT NULL,
  placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_email_templates TO authenticated;
GRANT ALL ON public.notification_email_templates TO service_role;

ALTER TABLE public.notification_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notif templates select" ON public.notification_email_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Notif templates write" ON public.notification_email_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'socio'::app_role))
  WITH CHECK (has_role(auth.uid(), 'socio'::app_role));

CREATE TRIGGER trg_notif_templates_updated
  BEFORE UPDATE ON public.notification_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings (single row)
CREATE TABLE public.notification_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_label text,
  sender_email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_email_settings TO authenticated;
GRANT ALL ON public.notification_email_settings TO service_role;

ALTER TABLE public.notification_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notif settings select" ON public.notification_email_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Notif settings write" ON public.notification_email_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'socio'::app_role))
  WITH CHECK (has_role(auth.uid(), 'socio'::app_role));

CREATE TRIGGER trg_notif_settings_updated
  BEFORE UPDATE ON public.notification_email_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: template de mudança de etapa
INSERT INTO public.notification_email_templates (key, nome, descricao, assunto, corpo_html, placeholders)
VALUES (
  'project-etapa-change',
  'Mudança de etapa do projeto',
  'Disparado automaticamente quando a etapa de um projeto muda (iniciado / minuta / assinado). Enviado ao mais sênior alocado e ao mais sênior do administrativo.',
  'Projeto mudou de etapa: {{projeto}}',
  '<div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="background: #0D7377; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Mudança de etapa</h2>
  </div>
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
    <p style="margin: 0 0 16px;">Olá <strong>{{destinatario}}</strong>,</p>
    <p style="margin: 0 0 16px;">O projeto <strong>{{projeto}}</strong> ({{cliente}}) teve sua etapa atualizada.</p>
    <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
      <div style="font-size: 13px; color: #6b7280;">Etapa anterior</div>
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">{{etapa_anterior}}</div>
      <div style="font-size: 13px; color: #6b7280;">Nova etapa</div>
      <div style="font-size: 15px; font-weight: 600; color: #0D7377;">{{etapa_nova}}</div>
    </div>
    <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">Esta é uma notificação automática do sistema.</p>
  </div>
</div>',
  '["destinatario","projeto","cliente","etapa_anterior","etapa_nova"]'::jsonb
);

-- Seed: settings vazio
INSERT INTO public.notification_email_settings (sender_label) VALUES ('Notificações');
