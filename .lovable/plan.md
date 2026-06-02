## Importação do cadastro de colaboradores

Usar a planilha `Colaboradores - Cadastro.xlsx` (29 linhas, colunas: Nome, Status, CPF, Nascimento, E-mail corporativo, Telefone, Endereço, Admissão, Desligamento) para preencher os dados básicos da tabela `team_members`.

### Estratégia de match

Cruzar por **nome normalizado** (sem acentos, lowercase, espaços colapsados). Como há divergências entre planilha e banco, aplicar mapeamento manual para esses casos:

| Planilha | Banco |
|---|---|
| Antonio Luiz Feijó Nicolau | Antônio Nicolau |
| Fellipe Franco Rosman | Fellipe Franco |
| Lucas Pasqualini de Lima | Lucas Pasqualini |
| Caio Lima Falcão | Caio Lima Falcao |

Demais 13 nomes "Ativo/Sócio" batem direto.

### Ações por linha

1. **Match encontrado** (existe no banco) → `UPDATE` preenchendo `cpf`, `birth_date`, `corporate_email`, `phone`, `address`, `hire_date`, `termination_date`. Não sobrescrever campos do banco com `NULL` da planilha (usar `COALESCE(planilha, atual)`).
2. **Não encontrado + status Ativo/Sócio** (ex.: "João Gabriel Ponce") → `INSERT` novo membro ativo, sem `role`/`area`/`salary` (não estão na planilha).
3. **Não encontrado + status Desligado** (10 nomes) → `INSERT` com `is_active = false`, preenchendo `termination_date` se houver. Sem `role`/`area`/`salary`.

### No banco

- 19 membros atuais: ~15 receberão `UPDATE`, 4 sem correspondência permanecem inalterados (Gabriel Venturim, Mauricio Emerick — não estão na planilha).
- ~11 novos `INSERT` (1 ativo + 10 desligados).

### Avisos

- Membros do banco que **não estão na planilha** (Gabriel Venturim, Mauricio Emerick) ficam intocados.
- Desligados sem `termination_date` na planilha ficam com `is_active=false` e `termination_date=NULL`.
- A planilha não traz cargo, área ou salário — esses campos não serão alterados.

### Execução

Script Node/TS no sandbox que: (1) lê a planilha, (2) consulta `team_members`, (3) faz match, (4) emite SQL de `UPDATE`/`INSERT` via supabase insert tool. Sem mudanças de schema, sem mudanças de UI.
