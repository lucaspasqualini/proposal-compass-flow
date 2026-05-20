# Backfill da "Previsão de recebimento" para parcelas já lançadas

## Problema

A regra de auto-preenchimento (`invoice_date + 5 dias úteis`) implementada na rodada anterior só dispara no momento em que um usuário muda o status para "Lançado". As 69 parcelas que **já estavam** com status `lancado` antes da mudança permanecem com `due_date` (Previsão de recebimento) em branco.

Todas as 69 têm `invoice_date` preenchido, então podem ser corrigidas em lote.

## O que será feito

Rodar um backfill único no banco que, para todas as parcelas com:
- `status = 'lancado'`
- `due_date IS NULL`
- `invoice_date IS NOT NULL`

calcula `due_date = invoice_date + 5 dias úteis` (pula sábado e domingo, sem considerar feriados — mesma regra do app).

Implementação: função PL/pgSQL temporária `add_business_days(date, int)` aplicada via `UPDATE` em massa, usando o linter/registro de migrações para que fique versionado.

Não altera comportamento futuro; apenas corrige o histórico.

## Detalhes técnicos

- 69 linhas afetadas (confirmado por consulta).
- Não toca em parcelas `pendente`, `pago`, `cancelado` ou `pdd`.
- Não sobrescreve `due_date` já preenchido.
- Não cria função permanente — usa um `DO $$ ... $$` com lógica inline (ou função temporária) e depois faz o `UPDATE`.

## Perguntas

1. Quer que eu rode o backfill agora, ou prefere revisar manualmente as 69 datas?
