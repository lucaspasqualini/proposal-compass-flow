

# Ajustar ordenação da aba Contas a Receber

## Alterações

### 1. Tabela "Por Parcela" — Nova hierarquia de ordenação

Ordenar `filtered` no frontend (após filtros) com a seguinte prioridade:
1. **Status**: atrasado > pendente > pago
2. **Data de vencimento**: mais próxima primeiro (ascending para pendente/atrasado, ascending para pago)
3. **Nº Projeto**: usando `compareProjectNumbers` (YY → XXXX), do maior para menor (descending)

### 2. Tabela "Por Projeto" — Usar hierarquia YY→XXXX

Substituir o `localeCompare` na linha 136 por `compareProjectNumbers` (importado de `src/lib/projectNumber.ts`), em ordem decrescente (mais recente primeiro).

## Arquivo a alterar

| Arquivo | Alteração |
|---|---|
| `src/pages/ContasReceber.tsx` | Importar `compareProjectNumbers`, aplicar sort em `filtered` e `byProject` |

