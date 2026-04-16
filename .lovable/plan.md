

## Diagnóstico: lentidão e falhas na alocação de colaboradores

### Problemas encontrados

**1. Cascata de invalidações pesadas (causa principal da lentidão)**
Cada toggle de colaborador chama `createAllocation` ou `deleteAllocation`, que invalida `["project_allocations"]`. Mas as listas de projetos puxam allocations **embarcadas** dentro do query `["projects"]` / `["alocacao-projects"]` / `["projects", id]`, que **não são invalidadas**. Resultado: o backend confirma a mudança, porém a UI continua mostrando o estado antigo até o usuário recarregar — parecendo "não vai" ou "demora".

**2. Falta de optimistic updates**
Cada clique no checkbox espera o round-trip (~300-800 ms) antes da UI atualizar. Em conexões mais lentas vira falha aparente — usuário clica de novo, dispara mutações duplicadas que podem dar erro de unique constraint.

**3. `useProject` usa `.single()` (causa do "Projeto não encontrado" no replay)**
Quando há latência ou o ID muda durante navegação, `.single()` lança erro. Deve ser `.maybeSingle()` com tratamento adequado.

**4. Sem `staleTime` no QueryClient**
Cada navegação entre Projetos ↔ Alocação ↔ ProjectDetailDialog refetch tudo do zero, pesando dezenas de KB de joins desnecessariamente.

**5. Query de Alocação e Projetos têm queryKeys diferentes**
`["alocacao-projects"]` vs `["projects"]` — alterar alocação numa página não atualiza a outra.

### Plano de correção

**A. Atualizar `src/hooks/useTeam.ts`**
- `useCreateAllocation` e `useDeleteAllocation` passam a invalidar **também** `["projects"]`, `["alocacao-projects"]` e a query individual `["projects", projectId]`.
- Adicionar **optimistic updates** via `onMutate` / `onError` / `onSettled`: a UI muda imediatamente; em caso de erro, faz rollback e mostra toast.

**B. Unificar queryKey em `src/pages/Alocacao.tsx`**
- Trocar `["alocacao-projects"]` por `["projects", "alocacao-light"]` ou simplesmente reusar `useProjects` para que invalidações se propaguem corretamente.

**C. `src/hooks/useProjects.ts`**
- Trocar `.single()` por `.maybeSingle()` em `useProject` e tratar `null` (evita o erro "Projeto não encontrado" durante transições).

**D. `src/main.tsx` — configurar QueryClient**
- Adicionar `staleTime: 30_000` e `refetchOnWindowFocus: false` como defaults. Reduz refetches redundantes ao trocar de aba.

**E. Proteger contra cliques duplicados**
- Em `ProjectDetailDialog.handleToggleMember` e `Projetos.handleToggleMember`, desabilitar o `Checkbox` enquanto a mutação correspondente está pendente (`disabled={createAllocation.isPending || deleteAllocation.isPending}`).

### Arquivos a editar
- `src/hooks/useTeam.ts` — invalidações abrangentes + optimistic updates nas mutações de alocação
- `src/hooks/useProjects.ts` — `.maybeSingle()` em `useProject`
- `src/pages/Alocacao.tsx` — unificar queryKey de projetos
- `src/pages/Projetos.tsx` — desabilitar checkbox durante pending
- `src/components/ProjectDetailDialog.tsx` — desabilitar checkbox durante pending; tratar `project === null`
- `src/main.tsx` — defaults do QueryClient (`staleTime`, `refetchOnWindowFocus`)

### Resultado esperado
- Toggle de colaborador reflete **instantaneamente** na UI (optimistic).
- Em caso de erro real, rollback automático + toast.
- Mudanças feitas em qualquer aba (Projetos, Alocação, dialog do projeto) aparecem **imediatamente** nas outras.
- Sem mais "Projeto não encontrado" durante transições rápidas.

### Observações
- Sem mudanças no banco — apenas lógica client-side.
- Não impacta filtros persistidos nem outras funcionalidades.

