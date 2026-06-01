## Objetivo

Atualizar `src/lib/importReceivables.ts` para refletir o novo layout das planilhas de contas a receber.

## Novo mapeamento (posição fixa, 0-indexed)

| Campo | Coluna | Índice |
|---|---|---|
| Status | E | 4 |
| OS | J | 9 |
| Parcela "X/Y" | L | 11 |
| Previsão de Faturamento (`due_date`) | M | 12 |
| Dt Previsão NF (`previsao_nf`) | M | 12 |
| # NFe | T | 19 |
| Emissão da Fatura (`invoice_date`) | V | 21 |
| Data de Pagamento (`paid_at`) | X | 23 |

Observação: o usuário indicou a mesma coluna M para "Previsão de Faturamento" e "Dt Previsão NF". Vou usar M para ambos (mesmo valor preenchendo `due_date` e `previsao_nf`). Se for engano, me avisa qual é a coluna correta da Previsão NF.

## Mudanças no parser

1. **Forçar posição fixa**: hoje `findColumn` busca por nome de cabeçalho. Vou mudar para usar diretamente os índices acima, ignorando os cabeçalhos (mais robusto já que o usuário descreveu por letra de coluna). O `detectedColumns` retornado vai exibir o conteúdo do cabeçalho daquela posição apenas para referência visual no diálogo.

2. **Localização do header row**: manter detecção automática do header (procurar linha que contenha "OS"/"Parcela"), e a partir dela ler as colunas pelos índices fixos. Se não achar header, assumir linha 1.

3. **Status — regra atualizada**: o `STATUS_MAP` já trata "RECEBIDO", "RECEBIDO A MAIS", "RECEBIDO A MENOS", "RECEBIDO SEM NF" → `pago`. Vou adicionar um fallback: qualquer string que comece com `RECEBIDO` é tratada como `pago` (cobre variações futuras tipo "Recebido parcialmente"). Demais mapeamentos (`LANÇADO`, `PENDENTE`, `CANCELADA`, `PDD`) inalterados.

## Não muda

- `ImportReceivablesDialog.tsx`, `useBulkUpdateReceivables`, fluxo fuzzy, regex de base OS (`^(MA_\d{4}_\d{2})`), permissões/RLS — tudo permanece.
- Nenhuma alteração de banco.

## Confirmação rápida

A coluna **M** aparece duas vezes (Previsão de Faturamento e Dt Previsão NF). Confirma se é isso mesmo, ou se Previsão NF está em outra coluna?
