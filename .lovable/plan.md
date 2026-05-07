## Problema

A função `generate_proposal_number` gerou `MA_0201_26` para a nova proposta da Kanastra, quando deveria ter gerado `MA_0103_26` (a anterior é `MA_0102_26`).

**Causa raiz:** existe no banco a proposta `MA_0200_21_26` (proposta de 2021 com sufixo extra `_26`, importada da planilha histórica). A função atual:

- Filtra por `LIKE 'MA_%_26'` → captura tanto `MA_XXXX_26` quanto `MA_XXXX_21_26`
- Extrai sequência com `SUBSTRING(... FROM 4 FOR 4)` → para `MA_0200_21_26` lê `0200`
- Resultado: `MAX(0200, 0102) + 1 = 0201`

## Correção

Reescrever a função `generate_proposal_number` para considerar **apenas** números no formato canônico `MA_NNNN_AA` (sem sufixo de subprojeto), usando regex:

```sql
WHERE proposal_number ~ ('^MA_\d{4}_' || current_year || '$')
```

E extrair a sequência com regex (`substring(proposal_number from 'MA_(\d{4})_')`) em vez de posição fixa.

### Comportamento esperado após o fix

- Próxima proposta de 2026: `MA_0103_26` (ignora `MA_0200_21_26`)
- Subprojetos/aditivos no formato `MA_XXXX_AA_NN` continuam existindo como dados, mas não interferem na numeração.

## Próximo passo

1. Migration que substitui a função `generate_proposal_number`.
2. Renumerar a proposta da Kanastra de `MA_0201_26` para `MA_0103_26` (UPDATE manual).

Confirma para eu aplicar?
