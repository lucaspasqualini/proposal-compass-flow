# Corrigir lançamentos faltando em Contas a Receber

## Diagnóstico

Os lançamentos não estão faltando no banco — estão faltando **na tela**.

- Banco tem **1.651 parcelas** em `receivables`.
- Exemplo citado (`MA_0027_26 - Ambar Cuiabá (Impairment)`) existe com 3 parcelas (1/3 Lançado, 2/3 Lançado, 3/3 Pendente). Confirmado via query direta.
- O Supabase aplica um **limite padrão de 1.000 linhas** por query quando não se passa `.range()` ou `.limit()` explícito.
- O hook `useReceivables` faz um `select(...).order("due_date")` sem range, então corta em 1.000 — sobram ~651 parcelas invisíveis.
- A relação de "não importadas" (`receivables_import_unmatched.csv`) confirma que `MA_0027_26` **não** está lá; o problema é exclusivamente de leitura no front.

## Mudança

Adaptar `src/hooks/useReceivables.ts` para buscar **todas** as linhas paginando até esgotar:

- Buscar em lotes de 1.000 com `.range(from, from + 999)`.
- Continuar enquanto o lote retornado tiver 1.000 itens.
- Concatenar e retornar o array completo, mantendo o mesmo shape (com joins de `proposals` e `clients`) e a mesma ordenação por `due_date asc`.
- Sem mudanças no UI, nos filtros ou em `ContasReceber.tsx` — assim que o hook devolver tudo, os lançamentos faltantes (Ambar e os outros) aparecem.

## Detalhes técnicos

```text
useReceivables()
  ├── while true:
  │     range(offset, offset+999)
  │     push rows
  │     if rows.length < 1000 → break
  │     offset += 1000
  └── return all rows
```

Nenhuma migration, nenhum ajuste de RLS, nenhum impacto em outras telas. Único arquivo tocado: `src/hooks/useReceivables.ts`.
