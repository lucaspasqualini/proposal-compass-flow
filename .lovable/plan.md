

## Melhorar Usuários + mostrar identidade do usuário logado

### Diagnóstico
- Hoje os 2 usuários estão na base (`lpasqualinidelima@gmail.com` e `admin@admin.com.br`), ambos como **Sócio**, mas com `full_name` em branco — por isso aparecem como "Sem nome".
- Não temos email visível em lugar nenhum (só está em `auth.users`, que não é exposto pelo frontend).
- A sidebar não mostra quem está logado.
- A aba Usuários só tem nome + dropdown de papel, sem contexto (email, status, etc).

### O que vamos construir

**1. Mostrar email na lista de usuários**
- Adicionar coluna `email` à tabela `profiles` (sincronizada do `auth.users` via trigger `handle_new_user`).
- Backfill: copiar email dos 2 usuários existentes.
- Coluna "Email" passa a aparecer na tabela de Usuários.

**2. Permitir editar o próprio nome**
- Novo cartão "Meu perfil" no topo da página Usuários (visível para qualquer papel que entrar na página — mas como só Sócio acessa, fica natural).
- Mostra: avatar com iniciais, nome (editável), email (somente leitura), papel atual.
- Botão "Salvar" grava em `profiles.full_name`.

**3. Reformular a tabela "Todos os usuários"**
Colunas: **Avatar+Nome | Email | Papel atual | Data de cadastro | Ações**
- Cada linha mostra avatar com iniciais, nome (ou "—" se vazio) e email logo abaixo.
- Coluna "Papel" exibe **badge colorida** com o papel atual + dropdown discreto para trocar.
- Badges: Sócio (roxo), Gerente (azul), Consultor (verde), Estagiário (amarelo), Administrativo (laranja), Sem acesso (cinza).
- Filtros no cabeçalho: busca por nome/email + filtro por papel (dropdown "Todos os papéis").
- Ordenação por nome, email ou data.
- Linha do próprio usuário fica destacada com fundo sutil + tag "(você)".
- Proteção: o Sócio não consegue revogar o próprio acesso nem rebaixar a si mesmo (botão desabilitado com tooltip explicativo) — evita ficar trancado fora.

**4. Mostrar usuário logado na sidebar**
- Bloco no rodapé da sidebar (acima do botão "Sair") com avatar + nome + papel.
- Quando colapsada, mostra só o avatar com tooltip.
- Clicar no bloco abre `/usuarios` (ou um menu com "Meu perfil" + "Sair").

**5. Texto explicativo no topo da página Usuários**
Substituir o subtítulo atual por um bloco curto explicando:
> Aqui você gerencia quem tem acesso ao sistema e o nível de permissão de cada pessoa. Cada papel libera um conjunto específico de abas — veja a tabela de permissões expandindo o painel abaixo.

Painel colapsável "Ver matriz de permissões" mostrando a tabela completa de quem acessa o quê (a mesma do plano anterior) — assim você não precisa lembrar de cabeça.

### Arquivos
- **Migração**: adicionar coluna `email TEXT` em `profiles`; atualizar trigger `handle_new_user` para preencher `email = NEW.email`; backfill dos 2 registros existentes
- **Editar tipos**: `src/integrations/supabase/types.ts` (auto)
- **Editar**: 
  - `src/pages/Usuarios.tsx` — cartão "Meu perfil", nova tabela com email + badge + filtros + proteção do próprio sócio + painel de matriz de permissões
  - `src/components/AppSidebar.tsx` — bloco do usuário logado no rodapé
- **Criar**: 
  - `src/components/RoleBadge.tsx` — badge colorida reutilizável por papel
  - `src/components/UserAvatar.tsx` — avatar com iniciais a partir do nome/email

### Observações
- Mudança não destrutiva.
- Você poderá finalmente colocar seu nome ("Lucas Pasqualini de Lima"?) e ele vai aparecer na sidebar e em qualquer lugar que use `profiles.full_name`.
- O segundo usuário (`admin@admin.com.br`) também aparecerá com email — fica fácil decidir se mantém ou revoga.

