# Estabilizar paginação de Contas a Receber

## Diagnóstico

Distribuição atual em `receivables` (1.651 linhas):

| status     | total | com due_date | sem due_date |
|------------|------:|-------------:|-------------:|
| pago       | 1.396 |           32 |        1.364 |
| pendente   |   133 |            0 |          133 |
| lancado    |    69 |            0 |           69 |
| cancelado  |    30 |            0 |           30 |
| pdd        |    23 |            0 |           23 |

O hook pagina com `.order("due_date", asc).range(offset, offset+999)`.

Problema: 1.619 linhas têm `due_date = NULL`. PostgreSQL não dá ordem estável entre chamadas quando há grande volume de empates — sem critério de desempate, cada `.range()` pode devolver linhas sobrepostas e **pular outras**. Resultado prático:

- Página 1 (0–999): pega as 32 com data + ~968 NULLs em ordem arbitrária.
- Página 2 (1000–1650): outras ~651 NULLs, possivelmente repetindo algumas e perdendo outras.
- Os "perdidos" tendem a ser exatamente os Pendentes / Lançados (todos sem data) e o Ambar Cuiabá (sem data) cai nesse buraco.

## Mudança

Adicionar critério de desempate estável na ordenação do `useReceivables`:

```ts
.order("due_date", { ascending: true, nullsFirst: false })
.order("id", { ascending: true })
.range(offset, offset + PAGE - 1)
```

`id` é UUID único → paginação determinística. Com isso, todas as 1.651 linhas chegam ao front sem repetição nem omissão.

Depois, manter a ordenação visual existente (já feita em memória em `filtered`), nada muda no UI.

## Detalhes técnicos

- Único arquivo: `src/hooks/useReceivables.ts`.
- Sem migration, sem mudança de RLS, sem mudança de UI.
- Após o fix: validar que `MA_0027_26` (Ambar Cuiabá) e os 133 Pendentes aparecem na tela.
