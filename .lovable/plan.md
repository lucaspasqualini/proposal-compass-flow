## Dashboard executivo, informativo e interativo

Hoje o dashboard mostra 4 contadores estáticos e um valor aprovado total. Vamos transformar numa visão executiva real, com filtros, gráficos, atalhos clicáveis e seções acionáveis. Como o `/` é restrito a **sócio**, podemos expor todas as métricas (incluindo financeiras).

### 1. Filtro global de período
Topo da página, ao lado do título: seletor de período (`Este mês` / `Últimos 3 meses` / `Este ano` / `Tudo`). Persistido em `usePersistedState`. Todas as métricas e gráficos abaixo respondem ao filtro.

### 2. KPIs com variação vs. período anterior
Linha de 4 cards, cada um com valor atual + delta % colorido (verde ↑ / vermelho ↓) vs. período anterior comparável. Cada card é clicável e leva à aba correspondente já filtrada.

| KPI | Cálculo |
|---|---|
| Receita aprovada | soma `value` de propostas `ganha` no período |
| Pipeline ativo | soma `value` de propostas em `em_elaboracao` + `em_negociacao` |
| Taxa de conversão | `ganha` / (`ganha` + `perdida`) no período |
| A receber (próx. 30 dias) | soma `amount` de receivables `pendente` com `due_date` ≤ hoje+30 |

### 3. Pipeline de propostas (gráfico de barras horizontal)
Quantidade + valor agregado por status (`em_elaboracao`, `em_negociacao`, `ganha`, `perdida`). Barra clicável → leva para `/propostas` filtrada por aquele status.

### 4. Funil de projetos por etapa
Cards compactos lado a lado com contagem por `etapa` (`iniciado`, `minuta`, `assinado`). Mostra também valor total em projetos ativos. Clique → `/projetos` filtrado.

### 5. Fluxo de caixa — próximos 6 meses (gráfico de linha/área)
Eixo X = mês, eixo Y = R$. Duas séries:
- **Previsto**: soma de `receivables` por mês de `due_date` (status `pendente`)
- **Recebido**: soma por mês de `paid_at` (status `pago`)

Tooltip mostra valores formatados em BRL. Usa `recharts` (já comum em projetos shadcn).

### 6. Top 5 clientes por receita
Tabela compacta: nome, nº de projetos, valor aprovado total. Clique na linha → `/clientes/:id`.

### 7. Alertas acionáveis (lista com ícones)
Cards/itens vermelhos/amarelos quando relevante:
- Propostas com `data_fup` vencida
- Recebíveis vencidos (`due_date` < hoje, status `pendente`)
- Propostas em negociação há > 30 dias sem atualização
- Projetos em `iniciado` há > 14 dias sem virar `minuta`

Cada alerta é clicável e leva ao item específico.

### 8. Atividade recente (timeline)
Últimos 8 eventos misturando: propostas criadas/ganhas, projetos assinados, recebíveis pagos. Ordenado por data desc, com ícone por tipo e link.

### Layout proposto

```text
┌─────────────────────────────────────────────────────────┐
│ Dashboard                            [Período ▼] [+ Proposta] │
├─────────────────────────────────────────────────────────┤
│ [Receita] [Pipeline] [Conversão] [A Receber]   ← KPIs   │
├──────────────────────────┬──────────────────────────────┤
│ Pipeline de Propostas    │ Funil de Projetos            │
│ (barras horizontais)     │ (cards por etapa)            │
├──────────────────────────┴──────────────────────────────┤
│ Fluxo de Caixa — próximos 6 meses (gráfico área)        │
├──────────────────────────┬──────────────────────────────┤
│ Top 5 Clientes           │ Alertas                      │
├──────────────────────────┴──────────────────────────────┤
│ Atividade Recente (timeline)                            │
└─────────────────────────────────────────────────────────┘
```

Responsivo: em telas estreitas vira 1 coluna.

### Detalhes técnicos

- **Arquivo único**: reescrever `src/pages/Dashboard.tsx`, dividindo em subcomponentes locais (`KpiCard`, `PipelineChart`, `CashflowChart`, `TopClients`, `AlertsList`, `ActivityFeed`) no mesmo arquivo ou em `src/components/dashboard/*`.
- **Dados**: reaproveitar `useProposals`, `useProjects`, `useClients`, `useReceivables` — todos já trazem joins suficientes. Cálculos derivados em `useMemo` no componente, sem novas queries.
- **Gráficos**: usar `recharts` (instalar se ainda não estiver no projeto) com wrapper de `src/components/ui/chart.tsx` que já existe.
- **Formatação**: `formatCurrency` de `@/lib/format`, datas em `dd/MM/yyyy`.
- **Filtro de período**: helper local que retorna `{ start, end, prevStart, prevEnd }` para cálculo de delta.
- **Navegação clicável**: `useNavigate` + querystring (ex.: `/propostas?status=ganha`) — Propostas já lê filtros da URL? Se não, apenas navegar sem filtro automático nesta entrega; o filtro fica como melhoria futura.
- **Empty states**: cada bloco mostra mensagem amigável quando não há dados no período.

### Fora do escopo desta entrega
- Drag-and-drop / customização de widgets pelo usuário.
- Exportação do dashboard em PDF.
- Comparação entre múltiplos períodos arbitrários.
- Sincronizar querystring com filtros das telas internas (Propostas/Projetos) — pode virar tarefa separada.

### Arquivos
- **Editar**: `src/pages/Dashboard.tsx` (reescrita completa).
- **Criar (opcional, se preferir modular)**: `src/components/dashboard/KpiCard.tsx`, `PipelineChart.tsx`, `CashflowChart.tsx`, `TopClients.tsx`, `AlertsList.tsx`, `ActivityFeed.tsx`.
- **Dependência**: garantir `recharts` instalado (`bun add recharts` se faltar).
