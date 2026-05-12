## Objetivo
Permitir selecionar múltiplos anos e múltiplos meses simultaneamente nos filtros da página de Propostas.

## Mudanças

### 1. `src/pages/Propostas.tsx`
- Trocar `yearFilter: string` e `monthFilter: string` por arrays persistidos:
  - `yearFilters: string[]` (ex: `["2024","2025"]`, `[]` = todos)
  - `monthFilters: string[]` (ex: `["01","04"]`, `[]` = todos)
- Substituir os dois componentes `<Select>` de Ano e Mês por um `<Popover>` cada, com:
  - Trigger estilo `Button variant="outline"` mostrando: "Todos os Anos" / "2024" / "2024, 2025" / "3 anos" (acima de 2 itens), idem para meses.
  - Conteúdo: lista de `<Checkbox>` + label, mais um item "Todos" (limpa a seleção).
- Atualizar a lógica de filtro:
  - `matchYear = yearFilters.length === 0 || yearFilters.includes(filterDate.substring(0,4))`
  - `matchMonth = monthFilters.length === 0 || monthFilters.includes(filterDate.substring(5,7))`
- Adicionar dependências corretas em `useMemo`.

### 2. Compatibilidade com filtros antigos persistidos
- `usePersistedState` lê valores antigos (string `"all"` ou `"2025"`) que não são arrays. Inicializar como `[]` e ignorar valores inválidos para evitar quebra (o sessionStorage é por aba, então o impacto é mínimo, mas vamos fazer um guard simples: se o valor lido não for array, tratar como `[]`).

## Fora de escopo
- Outras páginas (Projetos, Dashboard etc.) mantêm seus filtros atuais.
- Sem mudanças no backend ou hooks.