

# Filtros e Ordenação — Alocação + Contas a Receber

## Resumo
Padronizar filtros e ordenação por coluna nas abas **Alocação** e **Contas a Receber**, seguindo o padrão já usado em **Projetos** (headers clicáveis com ícones de sort, filtros por coluna com popover de checkboxes).

## Alocação (`src/pages/Alocacao.tsx`)

**Manter** o filtro cumulativo `STATUS_HIERARCHY` (como pedido), mas melhorar o layout e adicionar:

- **Busca textual** global (projeto, cliente, proposta) — `Input` com ícone `Search`
- **Filtro de Etapa** — `Select` com valores do enum
- **Ordenação clicável** em todas as colunas (Proposta, Projeto, Cliente, Status, Etapa) com ícones `ArrowUpDown`/`ArrowUp`/`ArrowDown`
- **Layout da barra de filtros** unificado: todos os controles na mesma linha, sem labels separados (usar placeholders), `flex flex-wrap gap-3`
- Corrigir tipagem (remover `any` onde possível)

## Contas a Receber (`src/pages/ContasReceber.tsx`)

Manter filtros existentes (busca, status, ano, empresa) e adicionar:

- **Ordenação clicável por coluna** nas colunas: Nº Projeto, Nome, Valor, Previsão, Emissão, Status, Recebimento
- Headers com `cursor-pointer` + ícones de sort (`ArrowUpDown`/`ArrowUp`/`ArrowDown`)
- State `sortKey`/`sortDir` integrado ao `useMemo` de `filtered`
- Aplicar ordenação tanto na view "Por Parcela" quanto "Por Projeto"

## Padrão visual
- Mesma mecânica de sort do `Projetos.tsx` (`handleSort`, `SortIcon`)
- Barra de filtros inline sem labels (placeholder nos selects/inputs)
- Arquivos editados: `src/pages/Alocacao.tsx`, `src/pages/ContasReceber.tsx`

