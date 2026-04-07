

# Reimportar propostas e projetos com mapeamento correto de colunas

## Problema
O plano anterior usava a coluna A como `proposal_number`. O correto é a **coluna D** ("Proposta"). Colunas A, B e C devem ser ignoradas.

## Mapeamento correto — Aba "Propostas"

| Coluna Excel | Campo no banco |
|---|---|
| A (Pericia) | **ignorar** |
| B (#) | **ignorar** |
| C (Coluna1) | **ignorar** |
| **D (Proposta)** | `proposal_number` |
| E (Projeto) | `title` |
| F (Tipo de Projeto) | `tipo_projeto` |
| G (Data de Envio) | `data_envio` |
| H (Valor) | `value` |
| I (Status) | `status` |
| J (Data Aprovação) | `data_aprovacao` |
| K (Status / FUP) | `data_fup` ou `observacoes` |
| L (FAZER FUP?) | **ignorar** |
| M (EMPRESA) | `empresa` |
| N (ENDEREÇO) | **ignorar** |
| O (Observações) | `observacoes` |

## Mapeamento — Aba "Projetos" (sem alteração)

| Coluna | Campo |
|---|---|
| C (NUM.) | match via `proposal_number` |
| D (PROJETO) | `title` |
| E (STATUS) | `status` |
| F (DT INÍCIO) | `start_date` |
| G (DT FIM) | `end_date` |
| H-L (COLABORADOR 1-5) | `project_allocations` |

## Execução (script Python)

1. **Ler aba "Propostas"** a partir da linha 3 (linha 2 é header), usando coluna D como chave
2. **Buscar `proposal_number` existentes** no banco (382 registros)
3. **Inserir apenas propostas novas** (onde `proposal_number` da col D não existe no banco)
4. **Ler aba "Projetos"** e atualizar status + alocações como antes
5. **Relatório**: quantas inseridas, quantas ignoradas (duplicatas), erros

## Mapeamento de status (propostas)
- "Ganha" → `aprovada`
- "Perdida" → `rejeitada`
- "Em Negociação" → `em_negociacao`
- "Em Elaboração" → `em_elaboracao`
- "Renovada para ..." → `rejeitada`

## Detalhes técnicos
- Script Python via `code--exec`, leitura com openpyxl
- INSERT via psql para novas propostas
- UPDATE + INSERT para projetos e alocações
- Nenhuma alteração de código do APP

