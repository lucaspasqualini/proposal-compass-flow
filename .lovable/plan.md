## 1. Corrigir dados das propostas MA_0060_26 e MA_0108_26

**Causa**: `parcelas[].valor` foi salvo como valor absoluto em R$ em vez de percentual (formato esperado). O gerador calcula `amount = (valor/100) * value`, resultando em valores ~1000x maiores. Além disso, as parcelas usam `data_vencimento` em vez de `vencimento`, então `previsao_nf` também ficou em branco.

**Ações** (via `supabase--insert`):
- Atualizar `proposals.parcelas` convertendo valores absolutos → percentuais e renomeando `data_vencimento` → `vencimento`:
  - **MA_0060_26** (R$ 187.000): `[21.39, 21.39, 21.39, 21.39, 14.44]` — última parcela absorve arredondamento para fechar 100%.
  - **MA_0108_26** (R$ 59.500): `[50, 50]`.
- Apagar receivables `pendente` dessas 2 propostas e regerar com a mesma lógica do `generateReceivables` (amount correto + `previsao_nf` = vencimento da parcela). Receivables já `lancado/pago` são preservados — verifico antes; se houver, alinhamos.

## 2. Permitir mais de 5 parcelas (propostas por prazo)

Hoje `ProposalDetailDialog.tsx` trava o botão "Adicionar parcela" em 5 (`parcelas.length >= 5` na linha 227 e label `({parcelas.length}/5)` na linha 553).

**Ações**:
- Remover o limite de 5 — sem teto rígido (ou usar limite alto, ex.: 24, se preferir um guard-rail).
- Atualizar label para mostrar só a contagem atual: `Parcelas ({parcelas.length})`.
- Aplica só ao modo **prazo** (etapas continua fixo nas 3 etapas — inicio/minuta/assinatura).

## Pergunta

Para o item 2: prefere **sem limite** ou um **teto alto** (ex.: 24 parcelas)?

## Detalhes técnicos

- Arquivo: `src/components/ProposalDetailDialog.tsx` linhas 227 e 553-554.
- SQL: `UPDATE proposals SET parcelas = '...'::jsonb WHERE proposal_number IN (...)` + `DELETE FROM receivables WHERE proposal_id IN (...) AND status = 'pendente'` + `INSERT` dos novos receivables.
- Não mexe em trigger nem no fluxo de etapas.