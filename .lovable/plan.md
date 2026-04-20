

## Corrigir RLS para que joins entre abas funcionem em todos os papéis

### Diagnóstico
Hoje as policies de `proposals`, `projects`, `clients` e `team_members` exigem o papel certo até para SELECT. Como o PostgREST aplica RLS em cada tabela do JOIN, quando o estagiário consulta `/alocacao` o join com `projects/clients/proposals` retorna vazio, e quando o administrativo abre `/contas-a-receber` o nome do projeto/cliente vem nulo.

A solução: **liberar SELECT (apenas leitura) para qualquer usuário autenticado** nas tabelas de referência, mantendo INSERT/UPDATE/DELETE restritos por papel. Isso preserva toda a segurança de escrita e só expõe dados que já são visíveis para quem tem acesso "pleno" às outras abas.

### Mudanças de RLS (migração)

| Tabela | SELECT (novo) | INSERT/UPDATE/DELETE (mantido) |
|---|---|---|
| `proposals` | qualquer usuário autenticado | sócio, gerente, consultor |
| `projects` | qualquer usuário autenticado | sócio, gerente, consultor |
| `clients` | qualquer usuário autenticado | sócio, gerente, administrativo |
| `team_members` | qualquer usuário autenticado (sem o campo `salary` exposto — ver abaixo) | sócio |
| `project_allocations` | já está liberado para os 5 papéis — ok |
| `receivables` | qualquer usuário autenticado | sócio, gerente, administrativo |

### Proteção do salário (team_members)
O campo `salary` é sensível e não deve vazar para estagiários/consultores. Solução: criar uma **view** `public.team_members_public` com todas as colunas exceto `salary`, e fazer o frontend (Alocação, ProjectDetailDialog, etc.) usar essa view para joins/listagens. A tabela `team_members` em si só será consultada diretamente pelas páginas que precisam de salário (Equipe, histórico de bônus/promoção), que continuam restritas a sócio + administrativo via RLS atual.

Alternativa mais simples: manter `team_members` com SELECT liberado mas adicionar policy column-level via view. Vou usar a view para ficar limpo.

### Ajustes de código
- **`src/pages/Alocacao.tsx`**: trocar `team_members(id, name)` por `team_members_public(id, name)` no select do join, e a query de filtro de colaboradores também passa a ler de `team_members_public`.
- **`src/components/ProjectDetailDialog.tsx`**: idem no join de allocations.
- Demais lugares que fazem join `team_members` apenas para mostrar nome → trocar para a view.
- **`src/integrations/supabase/types.ts`** será regenerado automaticamente após a migração.

### O que NÃO muda
- Permissão de navegação por aba (sidebar / RoleProtectedRoute) continua igual.
- Permissão de escrita continua igual — estagiário não consegue editar nada de proposals/projects/clients.
- Salário continua invisível para quem não é sócio/administrativo.
- Tabelas sensíveis (`bonus_history`, `promotion_history`, `user_roles`) continuam restritas como estão.

### Resultado esperado
- **Estagiário em /alocacao**: vê todos os projetos, cliente, proposta, etapa e nomes da equipe (sem salário).
- **Administrativo em /contas-a-receber**: vê o número da proposta, título, empresa, cliente normalmente.
- **Consultor em /propostas e /projetos**: nada muda (já funcionava).
- Sócio/gerente: nada muda.

### Arquivos
- **Migração nova**: alterar policies de SELECT em `proposals`, `projects`, `clients`, `receivables`, `team_members`; criar view `team_members_public`.
- **Editar**: `src/pages/Alocacao.tsx`, `src/components/ProjectDetailDialog.tsx` (e qualquer outro componente que faça join `team_members(id, name)` apenas para exibir).

