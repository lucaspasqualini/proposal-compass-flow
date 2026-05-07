# Importação de Contas a Receber

## Visão geral

Importar 2.300 parcelas do arquivo `Contas_a_Receber_Mock.xlsx` para a tabela `receivables`, fazendo correspondência com `proposals` pelo número do projeto (com fallback para o número base). Adicionar campos extras ao schema e exibi-los no card de detalhes — sem remover nada do que já existe.

## 1. Schema — novos campos em `receivables`

Migration adicionando colunas opcionais:

- `responsavel_projeto` (text) — responsável vindo do Excel
- `previsao_nf` (date) — DT PREVISÃO NF
- `parcela_label` (text) — formato "X/Y" do Excel
- `valor_proposta` (numeric) — VALOR PROPOSTA original
- `valor_nf` (numeric) — VALOR NF (diferente do amount quando há líquido/bruto)
- `valor_recebido` (numeric) — VALOR RECEBIDO (para "a mais"/"a menos")
- `status_origem` (text) — texto original ("RECEBIDO A MAIS" etc.) para preservar nuance

Nenhum campo existente é removido nem renomeado.

## 2. Match Excel → Proposta

- Match exato por `proposal_number` (561 OS).
- Para as 359 não-match, extrair o **número base** via regex `^(MA_\d{4}_\d{2})` e tentar match com a proposta canônica. Ex.: `MA_0105_19a` → `MA_0105_19`; `MA_0031_21_05` → `MA_0031_21`.
- OS que continuarem sem match são puladas e logadas em um relatório no `/mnt/documents/receivables_import_unmatched.csv`.

## 3. Regra de inserção (não destrutiva)

Para cada proposta encontrada no Excel:

- Se a proposta **já tem receivables no banco** → **pular** (mantém os 11 atuais intactos).
- Se a proposta **não tem receivables** → inserir todas as parcelas do Excel.

## 4. Mapeamento de status

| Excel | Banco (`status`) | Observação adicional no card |
|---|---|---|
| (3) RECEBIDO | `pago` | — |
| (5) RECEBIDO A MAIS | `pago` | badge "Recebido a mais" |
| (4) RECEBIDO A MENOS | `pago` | badge "Recebido a menos" |
| (6) RECEBIDO SEM NF | `pago` | badge "Sem NF" |
| (7) LANÇADO | `lancado` | — |
| (8) PENDENTE | `pendente` | — |
| (1) CANCELADA | `cancelado` | — |
| (2) PDD | `pdd` | — |

O texto original fica em `status_origem` para gerar o badge contextual.

## 5. Mapeamento de colunas

| Excel | receivables |
|---|---|
| OS | usado para match → `proposal_id` |
| DETALHAMENTO | `description` |
| PARCELA "X/Y" | `parcela_label` + `parcela_index` (X-1) |
| DT PREVISÃO NF | `previsao_nf` |
| VALOR PROPOSTA | `valor_proposta` |
| VALOR NF | `valor_nf` e `amount` (fallback `valor_proposta`) |
| NÚMERO DA NF | `nfe_number` |
| DT EMISSÃO NF | `invoice_date` |
| DT VENCIMENTO NF | `due_date` |
| DATA DO PGTO | `paid_at` |
| VALOR RECEBIDO | `valor_recebido` |
| RESPONSÁVEL PROJETO | `responsavel_projeto` (normalizar "N/I"→null, "Lucas " trim) |
| OBSERVAÇÕES | `notes` |
| STATUS | `status` + `status_origem` |

Datas-sentinela (`2000-01-14`, "N/I", "CANCELADA", "VARIÁVEL") são tratadas como `null`.

## 6. Execução do import

Script Python local (`/tmp/import_receivables.py`) que:

1. Lê o Excel.
2. Busca todas as `proposals` (id, proposal_number) e os `proposal_id` que já têm receivables.
3. Monta os INSERTs em lotes via `supabase.insert`.
4. Gera CSV com OS não importadas (sem match ou já populadas).

Output esperado: ~1.500–1.800 parcelas inseridas (estimativa após filtros).

## 7. UI — `ReceivableDetailDialog`

Adicionar **abaixo** do bloco existente, sem remover nada:

- Linha "Responsável" + "Previsão NF" + "Parcela X/Y"
- Bloco "Valores originais": Valor Proposta, Valor NF, Valor Recebido (mostrado só quando ≠ amount)
- Badge contextual ao lado do status quando `status_origem` indicar "a mais", "a menos" ou "sem NF"

Adicionar também filtros/colunas correspondentes em `ContasReceber.tsx` se já houver tabela com filtros (a confirmar ao implementar).

## 8. Pós-import

- Relatório `/mnt/documents/receivables_import_report.txt` com totais (inseridas, puladas por já-existir, sem-match) e amostra das não importadas.

## Detalhes técnicos

- Migration apenas adiciona colunas nullable; não há mudança de RLS nem de tipos enum.
- `types.ts` é regenerado automaticamente após a migration aprovada.
- Datas no Excel vêm como `datetime` do openpyxl — convertidas para `YYYY-MM-DD`.
- `parcela_index` usa o numerador de "X/Y" - 1; quando ausente, 0.
