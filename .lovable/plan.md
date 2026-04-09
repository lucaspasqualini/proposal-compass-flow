

# Nova Aba: Contas a Receber

## Visão Geral

Criar uma página `/contas-a-receber` que derive automaticamente as parcelas das propostas com status "ganha", com dashboard resumo por projeto e tabela detalhada por parcela. O controle de pagamento será feito com marcação de "pago" + data de recebimento.

## Dados Atuais

- 204 propostas ganhas, das quais 117 têm `payment_type` definido e 116 têm `parcelas` preenchidas
- Propostas com `parcelas = []` ou `payment_type = null` precisarão de tratamento (exibir como parcela única de 100%)

## Alterações no Banco de Dados

**Nova tabela `receivables`** para rastrear o status de pagamento de cada parcela:

```sql
CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  client_id uuid,
  parcela_index integer NOT NULL DEFAULT 0,
  description text,          -- "Início", "Minuta", "Assinatura", "Parcela 1", etc.
  amount numeric,            -- valor em R$ (percentual × valor da proposta)
  due_date date,             -- vencimento (derivado ou manual)
  status text NOT NULL DEFAULT 'pendente', -- pendente | pago | atrasado
  paid_at date,              -- data de recebimento
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated full access (mesmo padrão do projeto)
```

**Geração automática**: quando uma proposta muda para "ganha", além de criar o projeto, gerar os registros na tabela `receivables` com base nas `parcelas` da proposta. Quando sai de "ganha", deletar os receivables associados (mesmo comportamento do projeto).

## Estrutura da Página

### Dashboard (cards resumo)
- **Total a Receber** — soma de todas as parcelas pendentes
- **Total Recebido** — soma das parcelas pagas
- **Parcelas Atrasadas** — contagem + valor de parcelas com vencimento < hoje e status pendente
- **Previsão do Mês** — parcelas com vencimento no mês corrente

### Tabela por Projeto (visão consolidada)
- Nº Projeto | Cliente | Título | Valor Total | Recebido | Pendente | Progresso (%)

### Tabela por Parcela (visão detalhada)
- Nº Projeto | Cliente | Parcela | Valor (R$) | Vencimento | Status | Data Recebimento
- Ação: botão para marcar como pago (abre popover com datepicker)

### Filtros
- Busca por texto (cliente, projeto)
- Status: Pendente / Pago / Atrasado / Todos
- Ano
- Centro de Custo (empresa)

## Arquivos a Criar/Alterar

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `receivables` |
| `src/hooks/useReceivables.ts` | Hook para CRUD de receivables |
| `src/pages/ContasReceber.tsx` | Nova página com dashboard + tabelas |
| `src/lib/syncProposalProject.ts` | Gerar/deletar receivables ao mudar status da proposta |
| `src/App.tsx` | Adicionar rota `/contas-a-receber` |
| `src/components/AppSidebar.tsx` | Adicionar item "Contas a Receber" no menu |
| Script de migração de dados | Popular receivables para as 204 propostas ganhas existentes |

## Lógica de Geração de Parcelas

Para propostas **com parcelas definidas** (`etapas`):
- Cada item do array `parcelas` gera um registro, com `amount = (valor% × proposta.value / 100)`

Para propostas **com parcelas definidas** (`prazo`):
- Cada parcela gera um registro com vencimento mensal incremental

Para propostas **sem parcelas** (`parcelas = []`):
- Gerar uma única parcela de 100% do valor

