

## Redesign da aba Usuários — tabela editável + convite por email + exclusão + reset de senha

### Visão geral

Simplificar a página para uma tabela com 3 colunas editáveis (Nome, Email, Papel) + coluna de ações. Adicionar botão "Adicionar usuário" que envia convite por email. Permitir excluir usuários e redefinir senhas.

### 1. Edge Function `manage-users`

Criar `supabase/functions/manage-users/index.ts` — uma edge function que usa o `service_role` key para operações administrativas que o client-side não pode fazer:

- **`POST /invite`**: Recebe `{ email, full_name, role }`. Usa `supabase.auth.admin.inviteUserByEmail()` para enviar convite. Após criação do usuário, insere o papel em `user_roles` e atualiza `full_name` em `profiles`.
- **`POST /delete`**: Recebe `{ user_id }`. Usa `supabase.auth.admin.deleteUser()` para remover o usuário do auth (cascade deleta `profiles` e `user_roles`).
- **`POST /reset-password`**: Recebe `{ email }`. Usa `supabase.auth.admin.generateLink({ type: 'recovery', email })` para gerar link de redefinição de senha e enviar por email.

Todas as ações validam que o chamador é `socio` (verificando JWT + consultando `user_roles`).

### 2. Migração de banco

- Remover o botão "Criar conta" da página de Login (signup público) — apenas convites.
- Adicionar `ON DELETE CASCADE` na foreign key de `profiles.user_id` para `auth.users(id)` (se não existir), garantindo limpeza ao deletar.

### 3. Reescrever `src/pages/Usuarios.tsx`

**Layout simplificado:**
- Cabeçalho com título + botão "Adicionar usuário"
- Remover seção "Meu perfil" (mover para sidebar ou manter inline na tabela)
- Manter matriz de permissões colapsável

**Tabela com 3 colunas editáveis + ações:**

| Nome | Email | Papel | Ações |
|---|---|---|---|
| Input editável inline | Input editável inline | Select dropdown | Excluir / Redefinir senha |

- Cada célula de Nome e Email é um `<Input>` que salva ao perder foco (onBlur) ou ao pressionar Enter
- Célula de Papel é um `<Select>` que salva ao trocar valor
- Linha do próprio sócio: papel não editável (proteção), sem botão de excluir
- Coluna de Ações: menu dropdown com "Redefinir senha" e "Excluir usuário"
- Excluir pede confirmação via AlertDialog antes de executar
- Filtro por nome/email e por papel no cabeçalho da tabela
- Ordenação por clique no cabeçalho de cada coluna

**Dialog "Adicionar usuário":**
- Campos: Nome completo, Email, Papel (select)
- Ao confirmar: chama edge function `/invite`
- Mostra toast de sucesso: "Convite enviado para [email]"
- O usuário convidado recebe email com link para definir senha

### 4. Remover signup público

Editar `src/pages/Login.tsx`:
- Remover botão "Criar conta" — acesso só via convite do sócio

### 5. Atualizar sidebar

O bloco de usuário no rodapé da sidebar já existe. Manter como está — nome + papel do usuário logado.

### Arquivos

- **Criar**: `supabase/functions/manage-users/index.ts` — edge function para invite, delete, reset
- **Reescrever**: `src/pages/Usuarios.tsx` — tabela editável inline + dialog de adicionar + ações
- **Editar**: `src/pages/Login.tsx` — remover botão "Criar conta"
- **Migração**: garantir cascade delete em profiles, ajustar se necessário

### Observações
- Convites usam o sistema nativo de auth — o usuário recebe email com link para definir senha
- Excluir um usuário remove completamente do auth e, por cascade, de profiles e user_roles
- Redefinir senha envia email de recuperação ao usuário
- Você (sócio) não consegue excluir a si mesmo nem alterar seu próprio papel

