

## Persistência de filtros e ordenação entre navegações

### Objetivo
Quando o usuário aplicar filtros ou ordenação em qualquer aba (Propostas, Projetos, Clientes, Equipe, Alocação, Contas a Receber, Templates) e navegar para outra aba, ao voltar os filtros devem permanecer como estavam. O reset para o padrão acontece apenas quando:
- A página é recarregada (F5 / refresh)
- O usuário faz logout

### Abordagem técnica

Criar um **hook genérico `usePersistedState`** que substitui `useState` e armazena o valor em `sessionStorage` (não `localStorage`).

Por que `sessionStorage`?
- Persiste enquanto a aba do navegador estiver aberta → sobrevive a navegações entre rotas
- É limpo automaticamente ao fechar a aba ou recarregar a página → atende ao requisito de "resetar ao atualizar"
- Logout limpará a chave manualmente para garantir consistência

```text
┌─────────────────────────────────────────────────┐
│  Navegação entre abas        → MANTÉM filtros   │
│  F5 / refresh                → RESETA filtros   │
│  Logout                      → RESETA filtros   │
│  Fechar aba do navegador     → RESETA filtros   │
└─────────────────────────────────────────────────┘
```

### Mudanças

**1. Novo hook `src/hooks/usePersistedState.ts`**
- API idêntica a `useState<T>(initial)` mas recebe uma `key` única
- Lê de `sessionStorage` na montagem; se não houver, usa o valor inicial
- Grava em `sessionStorage` a cada mudança (JSON serializado)
- Em refresh, `sessionStorage` mantém os dados — então adicionamos um marcador `session-active` setado no carregamento inicial do app que, se ausente, limpa as chaves de filtros antes de hidratar

Estratégia de reset no refresh: usar a Performance API (`performance.getEntriesByType("navigation")[0].type === "reload"`) no `main.tsx` para limpar todas as chaves com prefixo `filter:` antes do React montar.

**2. Logout limpa filtros — `src/contexts/AuthContext.tsx`**
- No `signOut()`, antes do `supabase.auth.signOut()`, percorrer `sessionStorage` e remover chaves com prefixo `filter:`

**3. Aplicar o hook em todas as páginas com filtros/ordenação**

Substituir `useState` por `usePersistedState` nos states de filtros, busca e ordenação:

| Página | States a persistir |
|---|---|
| `Propostas.tsx` | busca, filtros de status/ano/empresa, sortKey, sortDir |
| `Projetos.tsx` | busca, filtros de coluna, sortKey, sortDir |
| `Clientes.tsx` | busca, filtros, ordenação |
| `Equipe.tsx` | busca, filtros, ordenação |
| `Alocacao.tsx` | search, selectedMember, selectedStatus, selectedEtapa, sortKey, sortDir |
| `ContasReceber.tsx` | busca, filtros (status/ano/empresa), view mode (parcela/projeto), sortKey, sortDir |
| `Templates.tsx` | aba ativa (Templates Propostas / Email Comercial) |

Cada página usa uma key única, ex.: `filter:propostas:search`, `filter:alocacao:sortKey`.

**NÃO** persistir: dados de formulários de criação/edição, diálogos abertos, IDs selecionados — apenas filtros de listagem e ordenação.

### Arquivos a editar/criar
- **Criar**: `src/hooks/usePersistedState.ts`
- **Editar**: `src/main.tsx` (lógica de reset no refresh), `src/contexts/AuthContext.tsx` (limpeza no logout), `src/pages/Propostas.tsx`, `src/pages/Projetos.tsx`, `src/pages/Clientes.tsx`, `src/pages/Equipe.tsx`, `src/pages/Alocacao.tsx`, `src/pages/ContasReceber.tsx`, `src/pages/Templates.tsx`

### Observações
- A solução é puramente client-side, não requer mudanças no banco
- Não afeta performance: `sessionStorage` é síncrono e leve
- Funciona em todos os navegadores modernos

