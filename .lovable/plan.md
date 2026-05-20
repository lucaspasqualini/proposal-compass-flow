# Contas a Receber — coluna de alertas + backfill de previsões

## 1. Separar "Atrasado" e "A Emitir" em coluna própria

Hoje, na lista "Por Parcela", a coluna **Status** mistura o status real (`pendente`, `lancado`, `pago`, `cancelado`, `pdd`) com dois sinalizadores derivados:

- **Atrasado** — substitui visualmente o status `lancado` quando a previsão de recebimento já passou.
- **A Emitir** — badge extra ao lado, para propostas por etapas cuja etapa do projeto já chegou na parcela.

A coluna **Status** voltará a mostrar **apenas** o status real (Pendente, Lançado, Pago, Cancelado, PDD), com o select sempre exibindo o valor verdadeiro.

Será criada uma nova coluna **Alertas**, posicionada logo após **Status**, com badges independentes:

- Badge vermelho **Atrasado** quando `status = lancado` e `due_date < hoje`.
- Badge amarelo **Emitir** (atual `precisaEmitir`).
- Quando não houver alerta, mostra "—".

A coluna é ordenável (atrasado > emitir > nenhum) e segue os filtros já existentes ("Atrasado" e "Precisa Emitir" no filtro de status).

## 2. Backfill retroativo das previsões

Aplicar as regras de auto-preenchimento de `previsao_nf` (Previsão de emissão) sobre todas as parcelas já existentes que estão com `previsao_nf` em branco e ainda não foram lançadas (status `pendente`).

### Propostas por **prazo**
- `previsao_nf` = `parcelas[i].vencimento` da proposta (mesma regra do trigger atual).

### Propostas por **etapas**
Para cada parcela `pendente` sem `previsao_nf`, comparar o rank da etapa do projeto (`iniciado`=1, `minuta`=2, `assinado`=3) com o rank da parcela (`inicio`=1, `minuta`=2, `assinatura`=3). Se a etapa do projeto já atingiu a parcela, preencher `previsao_nf` com a data correspondente:

| Parcela    | Data usada                                            |
|------------|-------------------------------------------------------|
| inicio     | `projects.start_date` (fallback: `projects.created_at`) |
| minuta     | **não temos data registrada** — ver pergunta abaixo   |
| assinatura | `projects.etapa_assinado_at`                          |

Backfill é executado uma única vez via `supabase--insert` (UPDATE em lote). Não sobrescreve `previsao_nf` já preenchido.

## Pergunta antes de executar

A tabela `projects` não tem timestamp para quando o projeto entrou em **minuta** (só temos `etapa_assinado_at` para "assinado" e `start_date/created_at` para o início). Para parcelas tipo **minuta** em projetos cuja etapa atual seja `minuta` ou `assinado`, como preencher `previsao_nf`?

- (a) usar `updated_at` do projeto (impreciso — pode ter sido alterado por outro motivo)
- (b) usar `etapa_assinado_at` quando existir, senão `hoje`
- (c) usar `hoje` como data de transição
- (d) deixar em branco e preencher manualmente

## Detalhes técnicos

- Frontend: editar `src/pages/ContasReceber.tsx` — header da tabela "Por Parcela" ganha coluna Alertas; célula de Status volta a usar `r.status` no Badge; badge `precisaEmitir` e novo badge `atrasado` migram para a nova coluna; `colSpan` da linha vazia passa de 10 → 11; adicionar chave de ordenação `alertas`.
- Backend: um `UPDATE` SQL para o caso **prazo** (join com `proposals.parcelas` via `parcela_index`) e outro para o caso **etapas** (join com `projects` para pegar `etapa` e datas), ambos filtrando `status = 'pendente'` e `previsao_nf IS NULL`.
- Não altera triggers, hooks nem comportamento futuro — apenas corrige histórico.
