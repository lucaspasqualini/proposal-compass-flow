# Plano de Otimização de Performance

## Diagnóstico

Olhando o código, identifiquei 5 gargalos principais que explicam a lentidão:

1. **Bundle inicial enorme** — `src/App.tsx` importa todas as páginas de forma síncrona (Dashboard 1400 linhas, ContasReceber 618, Propostas 610, Projetos 581, Clientes/Usuarios). Tudo é baixado e parseado antes da primeira tela aparecer.

2. **Queries pesadas e duplicadas no Dashboard** — `Dashboard.tsx` chama `useProposals` + `useProjects` + `useClients` + `useReceivables` simultaneamente. Cada um traz `select("*")` com joins aninhados (ex.: projects traz `proposals(...)`, `clients(name)` e `project_allocations → team_members`). É muito mais dado do que o dashboard usa.

3. **Cache curto + invalidações amplas** — `staleTime: 30s` faz tudo refazer fetch a cada navegação rápida. Toda mutation invalida a query inteira (`["projects"]`, `["proposals"]`, `["receivables"]`), forçando recarregar 1000+ linhas para mudar 1 campo.

4. **Auth lock contention** — os warnings `Lock "lock:sb-...-auth-token" was not released within 5000ms` no console mostram que muitos hooks disparam em paralelo no boot, todos chamando `getSession()` e serializando no lock do GoTrue. Isso atrasa o primeiro render em vários segundos.

5. **Service Worker contraproducente para dados** — `public/sw.js` usa NetworkFirst para `/rest/`. Como ele faz `fetch` antes de devolver cache, não acelera nada e ainda adiciona overhead. Pior: re-cachea respostas de 1000 linhas a cada navegação.

## O que vamos mudar

### 1. Code-splitting das rotas (impacto alto, risco baixo)
Em `src/App.tsx`, converter cada página em `React.lazy(() => import(...))` e envolver `<Routes>` em `<Suspense fallback={<PageSkeleton />}>`. Reduz drasticamente o JS do primeiro carregamento — só Login + Dashboard sobem inicialmente.

### 2. Hooks especializados e leves (impacto alto)
Criar variantes "list" das hooks pesadas para uso em listagens/dashboard:
- `useProposalsList()` — `select("id, proposal_number, title, status, value, created_at, client_id, payment_type, tipo_projeto, clients(name)")`
- `useProjectsList()` — sem `project_allocations` aninhado (já temos `useTeamAllocations` quando precisamos)
- `useDashboardSummary()` — uma única query agregada (ou conjunto enxuto) só com os campos que o Dashboard usa, evitando trazer `parcelas`, `scope`, `description`, etc.

As hooks "completas" continuam disponíveis para telas de detalhe.

### 3. Cache mais agressivo no React Query
Em `src/App.tsx`:
- `staleTime: 5 * 60_000` (5 min) para listas estáveis.
- `gcTime: 30 * 60_000`.
- Manter `refetchOnWindowFocus: false`.

### 4. Invalidação cirúrgica nas mutations
Trocar `invalidateQueries({ queryKey: [...] })` por:
- `setQueryData(..., updater)` quando temos a linha atualizada (update/insert single).
- Invalidar apenas a chave da entidade quando estritamente necessário.

Isso elimina os ciclos "muda 1 parcela → re-baixa 1000 receivables".

### 5. Reduzir contenção do auth lock no boot
- Em `src/contexts/AuthContext.tsx`, expor a sessão e atrasar a primeira "leva" de queries até o auth resolver (já faz, mas garantir que `useUserRole`/`useTeamMembers` etc. tenham `enabled: !!session`).
- Em queries chamadas no boot, agrupar com `enabled` baseado em sessão para evitar 5+ chamadas paralelas competindo pelo lock do GoTrue.

### 6. Service Worker — não interceptar Supabase
Em `public/sw.js`, remover o handler de `/rest/` (ou trocar por StaleWhileRevalidate só para GETs marcados). Hoje ele só adiciona latência e memória de cache.

### 7. Limpezas pontuais
- `Dashboard.tsx` (1400 linhas): extrair seções pesadas em componentes memoizados (`React.memo`) e usar `useMemo` nos agregados. Não vou reescrever a lógica, só evitar recomputar tudo a cada render.
- `useReceivables`: trocar paginação manual por uma única request `range(0, 4999)` (mais que suficiente) e remover o loop quando o volume é menor que 1000, evitando 2 round-trips.

## Detalhes técnicos

Arquivos afetados:
```
src/App.tsx                       # lazy + Suspense + QueryClient defaults
src/hooks/useProposals.ts         # adicionar useProposalsList()
src/hooks/useProjects.ts          # adicionar useProjectsList()
src/hooks/useReceivables.ts       # range único + setQueryData no update
src/hooks/useClientStats.ts       # selects mais enxutos
src/pages/Dashboard.tsx           # trocar hooks pelos *List + memos
src/pages/Propostas.tsx           # trocar para useProposalsList
src/pages/Projetos.tsx            # trocar para useProjectsList
src/pages/ContasReceber.tsx       # usar useProjectsList (só id+etapa)
src/contexts/AuthContext.tsx      # garantir gating de queries
public/sw.js                      # remover intercept de /rest/
```

Ordem de execução: 1 → 3 → 6 → 2 → 4 → 5 → 7 (entrega valor cedo).

## Resultado esperado

- Tempo de primeiro render: −50% a −70% (menos JS, menos dados, sem lock contention).
- Navegação entre abas: praticamente instantânea (cache 5 min).
- Edição de linha (status de receivable, etapa de projeto): sem refetch da lista inteira.

## Pergunta antes de implementar

Posso seguir com **todas** as 7 mudanças, ou prefere que eu vá em fases (ex.: só 1+3+6 primeiro, medir, e depois o resto)?
