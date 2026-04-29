## Objetivo

Apagar **apenas dados** das tabelas de Propostas e Projetos (e seus dependentes), mantendo intactos:
- Estrutura do banco (schemas, tabelas, colunas, RLS, funções, triggers)
- Código do app, edge functions, templates (`public/templates/proposta_modelo.pptx`)
- Dados de: Clientes, Equipe (team_members), Usuários/Perfis, Roles, Templates de proposta, histórico de bônus/promoções, fila de revisão de CNPJ

## O que será apagado (DELETE em todos os registros)

Em ordem (respeitando dependências lógicas):

1. **`project_allocations`** — alocações de equipe nos projetos
2. **`receivables`** — contas a receber (vinculadas a propostas via `proposal_id NOT NULL`)
3. **`projects`** — todos os projetos
4. **`proposals`** — todas as propostas

## O que NÃO será tocado

- `clients`, `team_members`, `profiles`, `user_roles`
- `proposal_templates` (modelos de escopo por tipo de projeto)
- `bonus_history`, `promotion_history`
- `cnpj_review_queue`
- Qualquer arquivo de código, edge function ou template em `public/`

## Como será executado

Via tool de inserção de dados do Lovable Cloud, executando 4 comandos `DELETE`:

```sql
DELETE FROM public.project_allocations;
DELETE FROM public.receivables;
DELETE FROM public.projects;
DELETE FROM public.proposals;
```

## Observações

- **Operação irreversível.** Se quiser um backup antes, posso exportar as 4 tabelas para Excel em `/mnt/documents/` antes de apagar — me avise.
- Após a limpeza, a próxima proposta criada começará a numeração `MA_0001_<ano atual>` normalmente (a função `generate_proposal_number` calcula com base no MAX existente).
- O app continua 100% funcional; apenas as listagens de Propostas, Projetos, Alocação e Contas a Receber ficarão vazias até a nova base ser importada.
