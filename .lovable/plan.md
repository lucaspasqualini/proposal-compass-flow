

# Página "Alocação" — Tabela com filtros dropdown

## Visão geral
Nova página `/alocacao` com dois filtros dropdown no topo (Colaborador e Status) e uma tabela abaixo listando os projetos filtrados. Sem dados financeiros expostos.

## Layout

```text
┌─────────────────────────────────────────────────┐
│  Alocação                                       │
│                                                 │
│  [Colaborador ▼]        [Status ▼]              │
│                                                 │
│  ┌───────────┬──────────┬────────┬──────────┬───┐
│  │ Proposta  │ Projeto  │ Status │  Etapa   │Eq.│
│  ├───────────┼──────────┼────────┼──────────┼───┤
│  │ MA_001_25 │ Laudo... │ Ativo  │ Assinado │👤👤│
│  │ MA_002_25 │ Perí...  │ Ativo  │ Minuta   │👤 │
│  └───────────┴──────────┴────────┴──────────┴───┘
└─────────────────────────────────────────────────┘
```

## Filtro hierárquico de Status
Cada opção inclui os anteriores na hierarquia:
- **Ativo** → só `em_andamento`
- **Aguardando Retorno** → `em_andamento` + `aguardando_retorno`
- **Em Pausa** → os dois acima + `em_pausa`
- **Finalizado** → todos (inclui `finalizado`)

Default: "Ativo" (mostra apenas projetos ativos).

## Colunas da tabela
| Coluna | Fonte |
|---|---|
| Proposta | `proposals.proposal_number` |
| Projeto | `projects.title` |
| Cliente | `clients.name` |
| Status | `projects.status` (badge colorido) |
| Etapa | `projects.etapa` (badge colorido) |
| Equipe | avatares/nomes dos colaboradores alocados |

## Arquivos a criar/editar

1. **`src/pages/Alocacao.tsx`** — Nova página com:
   - Query: `projects` com joins em `clients`, `proposals`, `project_allocations → team_members`
   - Dois `<Select>` (shadcn) para Colaborador e Status
   - Tabela (shadcn `<Table>`) com as colunas acima
   - Filtragem client-side baseada nos selects

2. **`src/App.tsx`** — Adicionar rota `/alocacao`

3. **`src/components/AppSidebar.tsx`** — Adicionar link "Alocação" no menu

4. **`src/lib/format.ts`** — Já tem os labels/colors de status e etapa, sem alteração necessária

## Sem alterações no banco
Todos os dados necessários já existem nas tabelas `projects`, `project_allocations`, `team_members`, `proposals` e `clients`.

