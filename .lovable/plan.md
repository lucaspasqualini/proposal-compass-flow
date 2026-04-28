
## Execução: Dashboard 3 fases (sem performance por consultor)

### Fase 1 — Corrigir filtros existentes
1. Novo seletor de período com opções: Este mês, Mês anterior, Últimos 3 meses, Últimos 6 meses, Este ano, Ano anterior, **Mês específico…** (dropdown com meses gerados a partir dos dados), Tudo.
2. Aplicar `range.start`/`range.end` em **todos** os blocos: Pipeline de propostas, Funil de projetos, Top 5 clientes, Atividade recente.
3. Mostrar o range exato aplicado abaixo do título (ex: "01/04/2026 → 28/04/2026").
4. KPI "Pipeline ativo" mantém snapshot atual mas com label "(snapshot atual)".

### Fase 2 — Novos insights
5. **Tendência mensal de receita** — bar chart 12 meses, com média móvel e clique-para-filtrar aquele mês.
6. **Ticket médio** — novo KPI: receita ganha ÷ propostas ganhas no período.
7. **Tempo médio de ciclo de venda** — novo KPI: média de dias entre `created_at` e `data_aprovacao` das ganhas.
8. **Comparativo MoM/YoY** — card com 3 valores: mês atual, mês anterior, mesmo mês ano passado.

### Fase 3 — Análises avançadas
9. **Distribuição por tipo de projeto** — donut/pie chart das ganhas no período por `tipo_projeto`.
10. **Heatmap de atividade comercial** — grid mostrando volume de propostas criadas por dia da semana × semana do período.

### Arquivos
- `src/pages/Dashboard.tsx` — refatoração principal
- `src/lib/dashboardFilters.ts` — novo helper para isolar lógica de períodos e ranges
