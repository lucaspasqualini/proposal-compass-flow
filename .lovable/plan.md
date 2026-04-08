

# Importar propostas do Excel e gerar projetos para as "Ganhas"

## Entendimento da tarefa

A base está limpa (0 propostas, 0 projetos). Vou importar **apenas a aba "Propostas"** do Excel. Para cada proposta com status **"Ganha"**, um projeto será criado automaticamente — replicando o comportamento do app.

## Mapeamento de colunas (Aba "Propostas")

| Coluna Excel | Campo no banco (`proposals`) |
|---|---|
| A — Proposta (ex: MA_0081_25) | `proposal_number` |
| B — Projeto | `title` |
| C — Tipo de Projeto | `tipo_projeto` |
| D — Data de Envio | `data_envio` |
| E — Valor | `value` |
| F — Status | `status` (mapeado abaixo) |
| G — Data Aprovação | `data_aprovacao` |
| H — Status / FUP | `data_fup` (se for data) ou ignorar |
| I — EMPRESA | `empresa` |
| J — Cliente | usado para vincular `client_id` |
| K — Indicador | `indicador` |
| L — Observação | `observacoes` |

## Mapeamento de status

- "Ganha" → `ganha`
- "Perdida" → `perdida`
- "Em Negociação" → `em_negociacao`
- "Em Elaboração" → `em_elaboracao`
- Qualquer outro → `em_elaboracao`

## Passos da execução

1. **Ler a planilha** com Python/openpyxl, aba "Propostas" (Page 1), extraindo todas as linhas válidas
2. **Criar/vincular clientes**: Para cada nome na coluna J (Cliente), buscar na tabela `clients` existente (já há 1.215). Se não existir, criar
3. **Inserir propostas**: INSERT de todas as linhas na tabela `proposals`, com os campos mapeados acima
4. **Criar projetos para "Ganhas"**: Para cada proposta com status `ganha`, inserir um registro na tabela `projects` com:
   - `title` = título da proposta
   - `client_id` = mesmo da proposta
   - `proposal_id` = id da proposta recém-criada
   - `budget` = valor da proposta
   - `status` = `em_andamento`
5. **Relatório final**: Quantas propostas inseridas, quantos projetos criados, eventuais erros

## Observações
- Nenhuma alteração de código do app — apenas dados via script Python + SQL
- A aba "Projetos" será **ignorada** conforme solicitado
- Valores em "R$" serão parseados para numérico
- Datas no formato M/D/YY serão convertidas para YYYY-MM-DD

