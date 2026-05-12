# Sub-abas no Dashboard

## Objetivo
Transformar o Dashboard atual (1.400 linhas, tudo numa página só) em um painel com sub-abas por domínio, no mesmo padrão visual das abas "Por Projeto / Por Parcela" do Contas a Receber. Cada aba foca num tipo de informação, abrindo espaço para gráficos/KPIs novos sem poluir a tela.

## Estrutura proposta de abas

```text
Dashboard
├── Visão Geral      ← KPIs consolidados + destaques (já existe hoje)
├── Propostas        ← funil, conversão, ticket médio, pipeline por status/tipo
├── Projetos         ← projetos ativos, etapas, prazos, distribuição por tipo
├── Clientes         ← top clientes, novos x recorrentes, concentração de receita
├── Alocação         ← carga por colaborador, ocupação, projetos por pessoa
├── Contas a Receber ← faturamento previsto x realizado, atrasos, "a emitir"
└── Contas a Pagar   ← (placeholder até existir o módulo)
```

Filtros globais (período, ano, mês, empresa) ficam **acima das abas** e se aplicam à aba ativa — exatamente como o `Tabs` em `ContasReceber.tsx`.

## Plano de execução

### Fase 1 — Refatoração estrutural (sem mudar conteúdo)
1. Quebrar `src/pages/Dashboard.tsx` em componentes por aba dentro de `src/components/dashboard/`:
   - `OverviewTab.tsx` (conteúdo atual condensado: KPIs principais + alertas)
   - `PropostasTab.tsx` (gráficos de funil/pipeline já existentes)
   - `ProjetosTab.tsx` (etapas, status, tipo)
   - `ClientesTab.tsx` (placeholder inicial com top clientes)
   - `AlocacaoTab.tsx` (placeholder inicial)
   - `ReceberTab.tsx` (resumo financeiro já existente)
   - `PagarTab.tsx` (placeholder "Em breve")
2. `Dashboard.tsx` passa a ser um shell:
   - cabeçalho + filtros globais (mantidos)
   - `<Tabs>` com `usePersistedState("dashboard:tab", "overview")` para lembrar a aba
   - cada `TabsContent` renderiza o componente correspondente
3. Hooks de dados (`useProposals`, `useProjects`, `useClients`, `useReceivables`) ficam no shell e os dados já filtrados são passados via props para cada aba — evita re-fetch e mantém o cache único.

### Fase 2 — Conteúdo das novas abas
Para cada aba criada vazia, definir 3–5 widgets relevantes. Sugestões iniciais:

- **Propostas**: funil (em elaboração → enviada → ganha/perdida), taxa de conversão, ticket médio, top tipos de projeto, propostas vencendo (`validity_date`).
- **Projetos**: projetos por etapa, projetos por status, prazo médio iniciado→assinado, projetos sem alocação.
- **Clientes**: top 10 por valor ganho, novos clientes no período, % de receita concentrada nos top 5.
- **Alocação**: horas/colaborador, colaboradores sobre/subalocados, projetos sem responsável.
- **Contas a Receber**: previsto vs recebido por mês, parcelas atrasadas, "a emitir" por etapa, aging.
- **Contas a Pagar**: aba reservada com mensagem "Módulo em desenvolvimento" (sem backend ainda).

> Esta fase pode ir por aba — não precisa entregar tudo de uma vez.

### Fase 3 — Performance
- Lazy-load das abas pesadas com `React.lazy` + `Suspense` dentro de `Dashboard.tsx`, para que abas não visitadas não montem gráficos do Recharts.

## Detalhes técnicos
- Componente de tabs: `@/components/ui/tabs` (já em uso no projeto).
- Persistência da aba ativa: `usePersistedState` (já em uso, ex.: `Alocacao.tsx`).
- Filtros globais ficam no shell; cada sub-componente recebe `{ proposals, projects, clients, receivables, period, year, month, empresa }` via props.
- Nenhuma mudança de schema / backend nesta etapa.
- Visual idêntico ao `Tabs` do `ContasReceber.tsx` (linha 437–608) para consistência.

## Pergunta antes de implementar
Posso seguir essa estrutura de **7 abas** (Visão Geral, Propostas, Projetos, Clientes, Alocação, Contas a Receber, Contas a Pagar) e começar pela **Fase 1** (refatorar o Dashboard atual em abas, mantendo o conteúdo de hoje na "Visão Geral" e criando as outras como esqueletos)? Ou você prefere já entrar com widgets específicos em alguma aba primeiro?
