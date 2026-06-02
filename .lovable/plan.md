## Melhorias na página Equipe

Adicionar campos de cadastro pessoais aos membros do time, com visualização organizada em seções na tela de detalhe.

### 1. Banco de dados
Adicionar colunas à tabela `team_members`:
- `cpf` (text)
- `birth_date` (date)
- `hire_date` (date) — data de admissão
- `termination_date` (date) — data de desligamento
- `corporate_email` (text) — contato corporativo
- `phone` (text)
- `address` (text)

Cargo, área e salário permanecem como já existem.

### 2. Formulário (criar/editar membro)
Reorganizar o formulário em seções colapsáveis ou agrupadas:
- **Identificação**: Nome, CPF, Data de nascimento
- **Contato**: E-mail corporativo, Telefone, Endereço
- **Cargo & Compensação**: Cargo, Área, Salário
- **Vínculo**: Data de admissão, Data de desligamento, Ativo (switch)

Validações:
- CPF: máscara `000.000.000-00` e validação básica de dígito
- Telefone: máscara `(00) 00000-0000`
- E-mail corporativo: validação de formato
- Data de desligamento: se preenchida, automaticamente desativa o membro (`is_active = false`)

### 3. Tela de detalhe do membro
Exibir os novos campos organizados nas mesmas seções acima, mantendo o histórico de promoções e bônus já existente. Cabeçalho mostra nome, cargo, status (ativo/desligado) e tempo de casa calculado a partir de `hire_date`.

### 4. Lista/cards na página Equipe
Manter o card atual enxuto (nome, cargo, área), mas adicionar:
- Badge de tempo de casa quando `hire_date` existir
- Indicador visual de "Desligado" quando `termination_date` preenchida
- Filtros adicionais no cabeçalho: por área, status (ativo/desligado/todos) e ordenação por nome, admissão ou cargo

### Permissões
RLS atual mantida: apenas `socio` escreve; todos autenticados leem. Campos sensíveis (CPF, salário, endereço) ficam visíveis apenas para `socio` e `administrativo` na UI (ocultar via condicional no frontend já que a tabela toda é legível).

### Arquivos afetados
- Migração SQL: novas colunas em `team_members`
- `src/pages/Equipe.tsx`: filtros, ordenação, badges
- `src/components/team/TeamMemberForm.tsx` (ou equivalente): novos campos + máscaras
- `src/components/team/TeamMemberDetail.tsx` (ou equivalente): seções de exibição
- `src/hooks/useTeamMembers.ts`: tipos atualizados
