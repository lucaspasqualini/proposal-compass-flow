
# Avisos automáticos no Contas a Receber

## Diagrama proposto

Anexei um fluxograma Mermaid que representa a lógica de decisão para cada parcela. Resumindo a leitura:

- **Entrada:** cada `receivable` ainda não pago/cancelado.
- **Bifurcação principal:** o `payment_type` da proposta (`prazo` vs `etapas`).
- **Ramo "prazo":** comparar `due_date` com hoje → se vencida, badge **Atrasada** (lógica que já existe).
- **Ramo "etapas":** mapear a parcela à etapa correspondente por **ordem** (índice 0 = início, 1 = minuta, 2 = assinatura) e comparar com a etapa atual do projeto. Se a etapa do projeto já alcançou ou ultrapassou a etapa da parcela, sinalizar **"Pronta para emitir"**.
- **Combinação:** uma parcela por etapa também pode acumular sinalização de atraso se tiver `due_date` vencida.

<lov-artifact url="/__l5e/documents/Fluxo_Avisos_Contas_a_Receber.mmd" mime_type="text/vnd.mermaid"></lov-artifact>

## Regra de negócio (resumo)

| Situação | Sinalização |
|---|---|
| `payment_type = prazo` e `due_date < hoje` | 🔴 **Atrasada** (já existe) |
| `payment_type = etapas` e etapa do projeto ≥ etapa da parcela | 🟡 **Pronta para emitir** (nova) |
| Ambas verdadeiras | 🔴🟡 **Atrasada + Emitir** |
| Projeto `cancelado` | sem aviso |

**Ordem das etapas (do projeto):** `iniciado` (1) → `minuta` (2) → `assinado` (3).
**Mapeamento parcela ↔ etapa:** índice da parcela na proposta — parcela 1 = `inicio`, parcela 2 = `minuta`, parcela 3 = `assinatura` (já é a estrutura usada hoje em `payment_type = "etapas"`).

Se o usuário pular o projeto direto para `assinado`, todas as parcelas anteriores (início, minuta, assinatura) ficam sinalizadas como prontas para emitir — atende exatamente o exemplo descrito.

## Implementação proposta (somente frontend, sem backend novo)

1. **Carregar projetos junto com receivables** (em `useReceivables` ou em `ContasReceber.tsx`): hoje o hook já traz `proposals(...)`, basta incluir um join `projects(etapa)` via `proposal_id`.
2. **Calcular `effectiveStatus` enriquecido** em `ContasReceber.tsx` (já existe esse `useMemo`):
   - Manter a regra atual de `atrasado`.
   - Adicionar uma flag `precisaEmitir: boolean` quando:
     - `payment_type === "etapas"` **e**
     - `etapaRank(projeto.etapa) >= etapaRank(parcela.descricao)` **e**
     - `status` ainda é `pendente` (não foi lançada/paga).
3. **UI:**
   - Novo badge amarelo **"Emitir"** ao lado do status na tabela "Por Parcela".
   - Card no dashboard: **"A emitir"** (contagem + soma das que estão `precisaEmitir`).
   - Filtro de status ganha a opção `precisa_emitir`.
4. **Notificações push (opcional, segunda fase):** reaproveitar `send-push-notification` para disparar quando uma etapa de projeto avança e abre nova parcela a emitir (trigger no `update` da tabela `projects`).

## Pontos de decisão antes de codar

- Quando uma parcela está marcada `lancado`, o aviso "Emitir" some? (sugestão: sim — `lancado` significa que a NF já foi emitida.)
- O aviso "Emitir" deve aparecer também para projetos `em_pausa` / `aguardando_retorno`? (sugestão: sim, porque a etapa contratual já foi atingida.)
- Você quer que eu já inclua a notificação push nessa primeira entrega ou deixo só o badge visual?

