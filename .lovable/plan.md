
# Plano: reduzir lentidão nas páginas pesadas

## Diagnóstico

Sobre **preview vs. publicado**: sim, o preview é 3–10x mais lento (Vite com hot-reload, source maps, bundle não otimizado). Vale publicar e comparar. Mas há causas **reais no código** que afetam também a produção.

Volumes atuais no banco:
- Propostas: **1.646 linhas**
- Projetos: **932** (com joins de clientes + propostas + alocações + membros)
- Recebíveis: **1.916** (com joins de propostas + clientes)
- Alocações: **1.285**

Hoje todas as páginas chamam `fetchAllPaginated` e baixam **tudo de uma vez** com joins pesados. Pior: depois de qualquer mutação (editar 1 linha, mudar etapa, criar/excluir alocação), os hooks fazem `invalidateQueries` que **refaz a query inteira** (1k–2k linhas + joins). É isso que torna as interações lentas.

## Causas raiz

1. **Refetch total após cada mutação.** Ex.: mudar a etapa de 1 projeto invalida `["receivables"]` → baixa 1.916 recebíveis com joins de novo.
2. **Joins pesados nas listas.** `useProjects` traz `clients`, `proposals`, `project_allocations` aninhado com `team_members`. `useReceivables` traz propostas + clientes em cada linha.
3. **Sem paginação no servidor.** Tudo vem para o cliente; filtros/busca são feitos no front em cima da lista completa.
4. **Falta de `select` enxuto.** `useReceivables` usa `select("*")` (puxa colunas grandes como `notes`, impostos, etc. mesmo na listagem).
5. **`useBulkUpdateReceivables` é sequencial** (1 request por linha) — operações em lote travam a UI.

## Mudanças propostas

### A. Atualização in-place sem refetch (impacto maior, esforço baixo)
Trocar `invalidateQueries` por `setQueryData` nas mutações que hoje invalidam listas inteiras:

- `useUpdateProject`: ao mudar etapa, em vez de invalidar `["receivables"]` (1.916 linhas), aplicar o patch apenas nos recebíveis afetados via `setQueryData` (já temos o resultado de `autofillPrevisaoNfFromEtapa`, basta retornar os IDs).
- `useTeam` (alocações): a versão otimista já existe, mas o `onSettled` ainda chama `invalidateAllocationQueries` que refaz `["projects"]` e `["alocacao-projects"]` inteiros. Trocar por confirmação do item temporário (substituir `temp-id` pelo real) sem refetch.
- `useCreateTeamMember` / `useUpdate` / `useDelete`: trocar invalidate por `setQueryData`.

### B. Reduzir payload das listas
- **`useReceivables`**: trocar `select("*")` por colunas usadas na tabela; mover `notes` e impostos para `useReceivable(id)` carregado só ao abrir o detalhe.
- **`useProjects`**: separar a query de alocações. Hoje cada projeto traz `project_allocations(team_members(...))` aninhado. Buscar alocações em query própria (`["allocations-summary"]`) e juntar no front via Map. Reduz drasticamente o JSON.
- **`useProposals`**: remover `observacoes` da lista (texto longo).

### C. Índices no banco
Adicionar índices para acelerar joins e filtros:
- `receivables(proposal_id)`, `receivables(client_id)`, `receivables(due_date)`
- `project_allocations(project_id)`, `project_allocations(team_member_id)`
- `projects(proposal_id)`, `projects(client_id)`
- `proposals(client_id)`, `proposals(created_at desc)`

### D. Bulk update paralelo
`useBulkUpdateReceivables` hoje faz 1 request por linha em série. Trocar por `Promise.all` em lotes de 10 ou usar `.in('id', [...])` quando todas as atualizações forem iguais.

### E. Lazy de diálogos pesados
`ProposalDetailDialog`, `ProjectDetailDialog`, `ReceivableDetailDialog` são montados/importados eagerly. Trocar por `React.lazy` para reduzir o JS inicial de cada página.

## Ordem de execução

1. **A** (mutações sem refetch) — ganho imediato em todas as interações
2. **B** (payload menor) — ganho no carregamento inicial e nos invalidates restantes
3. **C** (índices) — ganho no servidor
4. **D** (bulk paralelo) — ganho em operações em lote
5. **E** (lazy dialogs) — ganho marginal no primeiro load

## Fora de escopo (não vou mexer agora)

- Refatorar para paginação server-side com infinite query (mudança grande de UX dos filtros/exportações que hoje operam sobre o conjunto todo). Posso propor depois se mesmo com A–E ainda houver lentidão.
- Mudar arquitetura do React Query / setup do Vite.

## Detalhes técnicos

**Exemplo do padrão A** (em `useUpdateProject`):
```ts
// antes
if ("etapa" in data) qc.invalidateQueries({ queryKey: ["receivables"] });

// depois
if (affectedReceivableIds.length > 0) {
  qc.setQueryData<any[]>(["receivables"], (old) =>
    old?.map((r) => affectedReceivableIds.includes(r.id)
      ? { ...r, previsao_nf: today } : r));
}
```

**Migration de índices** (idempotente com `IF NOT EXISTS`):
```sql
CREATE INDEX IF NOT EXISTS idx_receivables_proposal_id ON receivables(proposal_id);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_allocations_project ON project_allocations(project_id);
-- etc.
```

Posso começar pela parte **A + C** que dá o maior ganho com menos risco. Aprova?
