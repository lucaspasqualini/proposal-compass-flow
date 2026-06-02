## Objetivo

Disparar notificações automáticas (push + email) sempre que um projeto mudar de etapa (iniciado/minuta/assinado). Destinatários: o colaborador mais sênior alocado no projeto **e** o mais sênior da área Administrativa.

---

## 1. Ranking de senioridade (cargo fixo)

Os cargos cadastrados hoje são texto livre. Vou criar um helper que mapeia cada `role` para um peso numérico (maior = mais sênior). Proposta inicial:

```
Sócio                       = 100
Diretor (Sênior/Pleno/Jr)   = 90 / 85 / 80
Gerente                     = 70
Coordenador                 = 60
Executivo de Vendas         = 55
Analista Sênior             = 50
Analista Pleno              = 40
Analista Júnior             = 30
Estagiário I / II           = 10 / 15
(desconhecido)              = 0
```

> Posso ajustar esse ranking antes de implementar — é só sinalizar. O matching será case-insensitive e por substring (ex.: "Analista Sênior" detecta "sênior" → 50).

**Mais sênior do projeto** = entre os `team_members` ativos com alocação em `project_allocations`, o de maior peso.
**Mais sênior do administrativo** = entre os `team_members` ativos com `area = 'Administrativo'`, o de maior peso.

Se as duas regras apontarem a mesma pessoa, ela recebe apenas uma notificação.

---

## 2. Gatilho no banco

Trigger AFTER UPDATE em `public.projects` que dispara quando `etapa` muda. Em vez de enviar do Postgres (limitado), o trigger chama via `pg_net` um novo Edge Function `notify-project-etapa-change` passando `{ project_id, etapa_anterior, etapa_nova }`.

Habilitar extensão `pg_net` se ainda não estiver.

---

## 3. Edge Function `notify-project-etapa-change`

Responsabilidades:
1. Carregar projeto + cliente + alocações + team_members.
2. Selecionar os dois destinatários (sênior projeto + sênior administrativo) usando o ranking.
3. Para cada destinatário, montar título/corpo:
   - Título: `Projeto mudou de etapa: <Título>`
   - Corpo: `Cliente · Etapa: <anterior> → <nova>`
4. **Push**: para cada destinatário com `user_id`, invocar a função existente `send-push-notification`.
5. **Email**: invocar `send-transactional-email` (template `project-etapa-change`) usando o `corporate_email` (fallback `profiles.email`).

Idempotência: `idempotencyKey = projeto_id + etapa_nova` evita duplicatas em retentativas.

---

## 4. Email — infraestrutura

O projeto ainda não tem domínio de email configurado. Para enviar emails de app preciso:

1. Você configura um domínio remetente (passo único, abre um diálogo guiado e adiciona DNS).
2. Eu provisiono a fila de envio (`setup_email_infra`) e o scaffolding transacional.
3. Crio o template React Email `project-etapa-change` (PT-BR, branding teal #0D7377, fonte Futura/Inter).

Se preferir só Push agora, posso entregar push imediatamente e deixar o email para uma segunda etapa após o domínio estar pronto.

---

## 5. Resumo técnico

- **Migration**: trigger + função plpgsql + `pg_net` enabled
- **Edge Function nova**: `supabase/functions/notify-project-etapa-change/index.ts` (verify_jwt=false, validação por shared secret no header vindo do trigger)
- **Helper TS** `src/lib/seniorityRank.ts` (também usado no edge function, duplicado lá em Deno)
- **Template** `_shared/transactional-email-templates/project-etapa-change.tsx`
- **Sem mudanças de UI** — fluxo 100% backend

---

## Pontos para confirmar antes de implementar

1. O ranking de senioridade acima está OK? Algum cargo a adicionar/reordenar?
2. Push agora **e** email depois do domínio estar pronto, ou esperar para entregar tudo junto?
3. Email do colaborador: usar `team_members.corporate_email` (fallback para `profiles.email` pelo `user_id`)?