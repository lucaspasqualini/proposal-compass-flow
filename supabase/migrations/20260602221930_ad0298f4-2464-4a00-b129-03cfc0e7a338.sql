UPDATE public.notification_email_templates
SET 
  assunto = '[{{codigo_projeto}}] Projeto mudou para {{etapa_nova}} — {{projeto}}',
  corpo_html = '<div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="background: #0D7377; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Mudança de etapa</h2>
  </div>
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
    <p style="margin: 0 0 16px;">Olá <strong>{{destinatario}}</strong>,</p>
    <p style="margin: 0 0 16px;">O projeto <strong>{{codigo_projeto}} — {{projeto}}</strong> ({{cliente}}) teve sua etapa atualizada por <strong>{{autor}}</strong>.</p>
    <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
      <div style="font-size: 13px; color: #6b7280;">Etapa anterior</div>
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">{{etapa_anterior}}</div>
      <div style="font-size: 13px; color: #6b7280;">Nova etapa</div>
      <div style="font-size: 15px; font-weight: 600; color: #0D7377;">{{etapa_nova}}</div>
    </div>
    {{alerta_nf}}
    <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">Esta é uma notificação automática do sistema.</p>
  </div>
</div>'
WHERE key = 'project-etapa-change';