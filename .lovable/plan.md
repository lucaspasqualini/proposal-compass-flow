## Objetivo

Adicionar um botão **"Importar planilha"** na página `/contas-a-receber` que leia um `.xlsx` e atualize os receivables (status, # NFe, datas de emissão/recebimento, previsão). Quando a OS da planilha não bater exatamente com nenhum `proposal_number`, mas existir uma proposta muito parecida (diferença só em sufixo, ex.: `MA_0031_21_05` vs `MA_0031_21`), abrir um diálogo para o usuário confirmar match a match.

## Fluxo da UX

1. Botão **"Importar planilha"** ao lado de "Exportar" no topo de `ContasReceber.tsx`.
2. Usuário escolhe `.xlsx` → parse em memória no browser via `xlsx` (SheetJS).
3. App resolve cada linha em uma de 4 categorias:
   - **Match exato** — `proposal_number + parcela_index` bate.
   - **Match fuzzy** — base `MA_XXXX_YY` igual, mas com sufixo extra (regex `^(MA_\d{4}_\d{2})(.+)$` em um lado).
   - **Sem match** — nenhuma proposta com a base.
   - **Sem alteração** — match exato mas dados iguais aos do banco.
4. Mostra **Dialog de revisão** com 3 abas:
   - **Confirmar fuzzy** — tabela com OS planilha × proposta sugerida + parcela; cada linha tem ✓ confirmar / ✗ ignorar / dropdown para escolher outra proposta. Botão "Confirmar todas com base idêntica".
   - **Sem match** — lista somente leitura (export CSV).
   - **Pré-visualização de mudanças** — diff por receivable: campo, valor atual → novo. Checkbox por linha (default ligado).
5. Botão **"Aplicar X atualizações"** roda os `UPDATE`s em lote via `useUpdateReceivable` (ou um novo `useBulkUpdateReceivables`).
6. Toast com resumo: atualizados, pulados, sem match.

## Mapeamento de colunas da planilha

Mesmo esquema dos imports anteriores (configurável via constantes no topo do parser):
- **OS** → `proposal_number` (coluna G nas planilhas anteriores)
- **Parcela "X/Y"** → `parcela_index = X-1` (coluna I)
- **Previsão de Faturamento** → `due_date` (coluna J)
- **Emissão Fatura** → `invoice_date` (coluna K)
- **Data Pagamento** → `paid_at` (coluna M)
- **Status** → `status` (coluna P) com `STATUS_MAP` (`RECEBIDO*→pago`, `LANÇADO→lancado`, `PENDENTE→pendente`, `CANCELADA→cancelado`, `PDD→pdd`)
- **# NFe** → `nfe_number` (coluna Q)
- **Dt Previsão NF** → `previsao_nf` (se presente)

Cabeçalhos detectados por nome (case-insensitive) com fallback para posição. Se a planilha tiver layout diferente, o app mostra um passo prévio "mapear colunas".

## Detecção fuzzy

```
base(os) = os.match(/^(MA_\d{4}_\d{2})/)?.[1]
```
- Linha não exata é candidata se `base(osPlanilha)` existe em alguma `proposals.proposal_number` (exata ou com sufixo).
- Ranking por: (a) match base+parcela existente, (b) menor distância de sufixo, (c) proposta com receivable correspondente já criada.
- Levanta para confirmação **apenas** quando há ≥1 candidato; senão vai para "Sem match".

## Arquivos a criar/editar

**Novos**
- `src/lib/importReceivables.ts` — parse do xlsx, normalização de status/datas, build de candidatos fuzzy, geração de `updates[]`. Sem side effects.
- `src/components/ImportReceivablesDialog.tsx` — UI com as 3 abas, confirmação fuzzy, preview de diffs, aplicação em lote.

**Editados**
- `src/pages/ContasReceber.tsx` — botão "Importar planilha" + abertura do dialog.
- `src/hooks/useReceivables.ts` — adicionar `useBulkUpdateReceivables` (chunked updates + invalidate único no final).

**Dependência**
- `xlsx` (SheetJS) — já comum em projetos Lovable; se não estiver instalado, `bun add xlsx`.

## Segurança / permissões

Usa as policies atuais de `receivables` (`socio | gerente_projetos | administrativo`). RLS já cobre — não precisa de migration nem edge function.

## Não-objetivos (fora desta rodada)

- Não cria/apaga receivables (só `UPDATE`). Linhas "sem match" ficam só no relatório.
- Não altera `parcelas` da proposta.
- Não toca em `amount` / `valor_proposta` / `valor_nf` / `valor_recebido` (posso adicionar depois se quiser — só sinaliza).
