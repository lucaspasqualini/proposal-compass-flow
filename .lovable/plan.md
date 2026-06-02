## Objetivo

1. Migrar o envio de email pelo **Gmail connector** (sua conta Gmail pessoal)
2. Criar uma nova aba **"E-mails de Notificação"** dentro de `/templates` onde você edita o texto dos emails e troca a conta remetente

---

## Parte 1 — Envio via Gmail

### Conectar Gmail
Disparo o OAuth do Gmail connector. Você autoriza com sua conta pessoal, escopo `gmail.send`. Secrets ficam disponíveis (`GOOGLE_MAIL_API_KEY`, `LOVABLE_API_KEY`).

### Atualizar edge function `notify-project-etapa-change`
- Remover a chamada quebrada a `send-transactional-email`
- Buscar o template ativo do banco (nova tabela, ver Parte 2) com placeholders
- Renderizar placeholders (`{{projeto}}`, `{{cliente}}`, `{{etapa_anterior}}`, `{{etapa_nova}}`, `{{destinatario}}`)
- Montar email RFC 2822, codificar em base64url
- `POST https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send`
- Headers: `Authorization: Bearer $LOVABLE_API_KEY`, `X-Connection-Api-Key: $GOOGLE_MAIL_API_KEY`
- Push notification permanece intacto

---

## Parte 2 — Aba "E-mails de Notificação" em `/templates`

### Nova tabela `notification_email_templates`
```
id              uuid pk
key             text unique   -- identificador estável (ex: 'project-etapa-change')
nome            text          -- nome legível ("Mudança de etapa do projeto")
descricao       text          -- explicação do gatilho
assunto         text          -- com placeholders
corpo_html      text          -- com placeholders
placeholders    jsonb         -- lista de variáveis disponíveis (só leitura)
ativo           boolean
created_at, updated_at
```
RLS: leitura para todos os autenticados, escrita só pra sócio.
Seed inicial: 1 row para `project-etapa-change` com texto padrão atual.

### Nova tabela `notification_email_settings` (single-row)
```
id              uuid pk
connection_id   text          -- ID da connection Gmail ativa
sender_label    text          -- nome de exibição (ex: "Notificações MA")
updated_at
```
Guarda qual connection é usada pra envio. Default = primeira Gmail conectada.

### UI da aba
Dentro de `<Tabs>` do `Templates.tsx`, adicionar terceira aba **"E-mails de Notificação"** com:

**Bloco superior — Remetente:**
- Card mostrando "Enviando como: `seunome@gmail.com`"
- Botão **"Trocar conta de envio"** → abre fluxo de conectar outra conta Gmail
- Botão **"Reconectar"** caso o token expire

**Lista de templates de notificação:**
Cada card mostra:
- Nome + descrição do gatilho (read-only)
- Lista de placeholders disponíveis (chips clicáveis que inserem no editor)
- Input para `assunto`
- Textarea grande para `corpo_html`
- Toggle "ativo"
- Botão **"Pré-visualizar"** (renderiza com dados de exemplo num dialog)
- Botão **"Enviar teste para mim"** (envia pra `corporate_email` do usuário logado)
- Botão **Salvar**

Estrutura futura: novos gatilhos (ex: prazo vencendo, parcela paga) viram só novas rows nessa tabela — sem mudança de código.

---

## Considerações

- **Sem domínio próprio**: emails saem do seu Gmail pessoal. Trocar pra domínio depois = só apontar pra outro edge function de envio, templates ficam preservados no banco.
- **Limite Gmail pessoal**: ~500 emails/dia (folgado pra notificações internas).
- **Edição sem deploy**: você muda texto/assunto pela UI, sem precisar mudar código.
- **Push notification não muda** — continua disparando junto com o email.

---

## Arquivos / mudanças

**Backend:**
- Migration: tabelas `notification_email_templates` + `notification_email_settings` + seed
- Editar `supabase/functions/notify-project-etapa-change/index.ts` (carregar template do banco, render placeholders, enviar via Gmail gateway)
- Nova edge function `send-notification-test-email` (botão "enviar teste")

**Frontend:**
- Editar `src/pages/Templates.tsx`: adicionar aba "E-mails de Notificação"
- Novo componente `src/components/templates/NotificationEmailsTab.tsx`
- Novo hook `src/hooks/useNotificationEmails.ts`

**Connectors:**
- Linkar Gmail connector (OAuth)

---

Confirma o plano que eu sigo pra implementação.