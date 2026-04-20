

## Controle de acesso por papel — 5 níveis (ajuste final)

### Mapa final de permissões

| Papel | Dashboard | Propostas | Projetos | Templates | Alocação | Clientes | Equipe | Contas a Receber | Usuários |
|---|---|---|---|---|---|---|---|---|---|
| **Sócio** | ✅ tudo | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD (com salário) | ✅ CRUD | ✅ |
| **Gerente de Projetos** | ❌ | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ❌ | ✅ CRUD | ❌ |
| **Consultor de Projetos** | ❌ | ✅ CRUD (sem cards de totalizador) | ✅ CRUD (sem cards de totalizador) | ✅ CRUD | ✅ CRUD | 👁️ leitura | ❌ | ❌ | ❌ |
| **Estagiário** | ❌ | ❌ | ❌ | ❌ | 👁️ leitura | ❌ | ❌ | ❌ | ❌ |
| **Administrativo** | ❌ | ❌ | ❌ | ❌ | 👁️ leitura | ✅ CRUD | 👁️ leitura (com salário) | ✅ CRUD | ❌ |

Mudança em relação à versão anterior: **Gerente de Projetos** agora também tem acesso completo a **Contas a Receber**.

### Banco de dados

**1. Enum e tabela de papéis**
- Enum `app_role`: `socio`, `gerente_projetos`, `consultor_projetos`, `estagiario`, `administrativo`
- Tabela `user_roles` (`id`, `user_id`, `role`, `created_at`) com unique em `(user_id, role)`
- Função `has_role(_user_id, _role)` (`SECURITY DEFINER`) para evitar recursão
- Função utilitária `is_socio(_user_id)`
- Seu usuário atual é inserido como `socio` automaticamente

**2. Reescrita das RLS**

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `proposals` | socio, gerente_projetos, consultor_projetos | socio, gerente_projetos, consultor_projetos |
| `projects` | socio, gerente_projetos, consultor_projetos | socio, gerente_projetos, consultor_projetos |
| `proposal_templates` | socio, gerente_projetos, consultor_projetos | socio, gerente_projetos, consultor_projetos |
| `project_allocations` | todos os 5 papéis | socio, gerente_projetos, consultor_projetos |
| `clients` | socio, gerente_projetos, consultor_projetos, administrativo | socio, gerente_projetos, administrativo |
| `team_members` | socio, administrativo | socio |
| `bonus_history`, `promotion_history` | socio, administrativo | socio |
| `receivables` | socio, gerente_projetos, administrativo | socio, gerente_projetos, administrativo |
| `cnpj_review_queue` | socio, gerente_projetos, administrativo | mesmos |
| `user_roles` | só socio | só socio |
| `profiles` | mantém atual | mantém |

### Frontend

**Novos arquivos**
- `src/hooks/useUserRole.ts` — `{ role, isSocio, isGerente, isConsultor, isEstagiario, isAdministrativo, isLoading }`
- `src/components/RoleGuard.tsx` — esconde seções por papel
- `src/components/RoleProtectedRoute.tsx` — redireciona para a primeira rota permitida
- `src/pages/Usuarios.tsx` — só sócio: lista usuários e atribui papel
- `src/pages/AguardandoAcesso.tsx` — usuário sem papel atribuído

**Edições**
- `src/contexts/AuthContext.tsx` — carregar papel junto com a sessão
- `src/App.tsx` — envolver rotas em `RoleProtectedRoute`; raiz redireciona conforme papel
- `src/components/AppSidebar.tsx` — filtrar menu pelo papel; adicionar "Usuários" só para sócio
- `src/pages/Propostas.tsx` — esconder cards de totalizador para consultor
- `src/pages/Projetos.tsx` — esconder cards de totalizador para consultor
- `src/pages/Clientes.tsx` + `src/pages/ClienteDetail.tsx` — modo leitura para consultor
- `src/pages/Equipe.tsx` + `src/components/TeamMemberDetailDialog.tsx` — modo leitura para administrativo

### Redirecionamento por papel
```text
socio              → /
gerente_projetos   → /propostas
consultor_projetos → /propostas
estagiario         → /alocacao
administrativo     → /contas-a-receber
sem papel          → /aguardando-acesso
```

### Arquivos
- **Migração**: enum `app_role`, tabela `user_roles`, funções `has_role`/`is_socio`, inserção do sócio atual, reescrita de RLS de 10 tabelas
- **Criar**: `src/hooks/useUserRole.ts`, `src/components/RoleGuard.tsx`, `src/components/RoleProtectedRoute.tsx`, `src/pages/Usuarios.tsx`, `src/pages/AguardandoAcesso.tsx`
- **Editar**: `src/contexts/AuthContext.tsx`, `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/pages/Propostas.tsx`, `src/pages/Projetos.tsx`, `src/pages/Clientes.tsx`, `src/pages/ClienteDetail.tsx`, `src/pages/Equipe.tsx`, `src/components/TeamMemberDetailDialog.tsx`

### Observações
- Você (sócio) não perde nenhum acesso — ganha a aba "Usuários".
- Mudança não destrutiva: dados intactos, só RLS fica mais restritiva.
- Reversível a qualquer momento via "Usuários".

