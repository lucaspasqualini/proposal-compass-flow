# Contas a Receber — Novos racionais

Reorganização da lógica de previsões, atrasos e edição na página Contas a Receber e no card de detalhes da parcela.

## Mudanças funcionais

### 1. Nomenclatura
- `previsao_nf` passa a ser exibido como **"Previsão de emissão"** (card e lista).
- `due_date` passa a ser exibido como **"Previsão de recebimento"** (card e lista, KPIs e mensagens).

### 2. Edição de campos no card
- **Previsão de emissão** (`previsao_nf`): hoje read-only → vira **editável** com o mesmo padrão de DateField já usado para as outras datas.
- **Previsão de recebimento** (`due_date`): continua editável.

### 3. Cálculo de atrasos
- Atrasado passa a ser definido como: `status === 'lancado'` **E** `due_date < hoje`.
- Status `pendente` com `due_date` no passado deixa de ser "atrasado".
- Atualizar:
  - `effectiveStatus` em `ContasReceber.tsx` (linha ~98).
  - Badge "Atrasado" no `ReceivableDetailDialog` (usa `effectiveStatus`, já vem da lista enriquecida).
  - KPI "Atrasadas" continua somando `effectiveStatus === 'atrasado'`.

### 4. Auto-preenchimento ao marcar como "Lançado"
Quando o usuário muda o status para `lancado` (no card ou na lista):
- Se `invoice_date` estiver vazio → preencher com **hoje**.
- Se `due_date` estiver vazio → preencher com `invoice_date + 5 dias úteis` (ignora sábado/domingo; feriados não considerados nesta versão).
- Ambos os campos continuam editáveis manualmente depois.
- Implementação centralizada em um helper (`applyLancadoDefaults`) chamado por `handleStatusChange` (lista) e pelo handler de status do `ReceivableDetailDialog`.

### 5. Auto-preenchimento da Previsão de emissão pela proposta
A `previsao_nf` deve refletir as condições de pagamento da proposta — sem deixar de ser editável.

- **Proposta por prazo** (`payment_type !== 'etapas'`):
  - No momento em que a proposta vira `ganha` (e as parcelas são geradas em `syncReceivables.ts` / `sync_proposal_to_project_receivables`), preencher `previsao_nf` de cada parcela com o `vencimento` informado nas `parcelas` da proposta.
  - Atualização também ao reeditar parcelas da proposta (regeração já existente).

- **Proposta por etapas** (`payment_type === 'etapas'`):
  - `previsao_nf` é preenchida/atualizada quando o **projeto muda de etapa** para a etapa correspondente à parcela (mapeamento `inicio` → etapa `iniciado`, `minuta` → `minuta`, `assinatura` → `assinado`).
  - Implementar em `useProjects` (no `useUpdateProject` ou função equivalente que altera `etapa`): após a mutação, para cada parcela `pendente` do projeto cuja etapa foi atingida, definir `previsao_nf = hoje` se estiver em branco.
  - Não sobrescrever valor já preenchido pelo usuário.

### 6. KPIs (cards no topo)
- **Atrasadas**: conta itens com `effectiveStatus === 'atrasado'` (novo critério baseado em `lancado` + `due_date` vencida — "Previsão de recebimento").
- **A Emitir**: continua baseado em `previsao_nf` (Previsão de emissão). Renomear label se necessário para refletir o novo nome. Mantém regra atual (`precisaEmitir` por etapa + também considerar pendentes cuja `previsao_nf <= hoje` para propostas por prazo — opcional, ver Perguntas).
- **Previsão do Mês**: continua usando `due_date` (Previsão de recebimento) dentro do mês corrente.

## Detalhes técnicos

### Arquivos a alterar
- `src/pages/ContasReceber.tsx`
  - Renomear cabeçalhos da tabela (`Previsão` → `Previsão de recebimento`; adicionar coluna ou tooltip de `Previsão de emissão` se ainda não exibido).
  - Alterar regra de `effectiveStatus` (pendente→atrasado vira lancado→atrasado).
  - `handleStatusChange`: aplicar defaults de `invoice_date` e `due_date` quando novo status for `lancado`.
- `src/components/ReceivableDetailDialog.tsx`
  - Trocar labels "Previsão NF" → "Previsão de emissão" e "Previsão de Faturamento" → "Previsão de recebimento".
  - Substituir o bloco read-only de `previsao_nf` por um `DateField` editável.
  - `handleStatusChange` aplica defaults quando muda para `lancado`.
- `src/lib/syncReceivables.ts` e `sync_proposal_to_project_receivables` (DB function)
  - Ao gerar parcelas com `payment_type !== 'etapas'`, gravar `previsao_nf = vencimento` da parcela.
  - (Para a função no banco será necessária uma migration que altere a função.)
- `src/hooks/useReceivables.ts`
  - Aceitar `previsao_nf` no payload de `useUpdateReceivable`.
- `src/hooks/useProjects.ts` (ou onde a `etapa` do projeto é atualizada)
  - Após mudança de `etapa`, atualizar `previsao_nf` das parcelas correspondentes pendentes (regra do item 5).

### Helper de dias úteis
Função simples local (sem libs novas):
```text
addBusinessDays(date, n): pula sábado/domingo. Feriados não tratados.
```

## Perguntas para o usuário

1. **Feriados nacionais** devem ser considerados no cálculo de "+5 dias úteis", ou basta pular sábado/domingo nesta primeira versão?
2. Para **propostas por prazo**, devo também marcar como "A emitir" itens `pendente` cuja `previsao_nf` já chegou (hoje ≥ previsão), além do critério atual baseado em etapa?
3. Quando alterar a `etapa` do projeto para uma anterior (regressão), devo **limpar** a `previsao_nf` das parcelas afetadas (se ainda não emitidas e não editadas manualmente)?
