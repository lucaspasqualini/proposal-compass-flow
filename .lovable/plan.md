## Diagnóstico objetivo

O problema restante parece ser principalmente **frontend/renderização**, não Lovable Cloud:

- O banco está saudável: memória 51%, conexões 7/60, disco 11%, tamanho ~14,8 MB.
- As consultas que medi retornaram rápido (~100–200 ms), mas a página chegou a **110 mil nós de DOM**, **224 mil event listeners**, **323 MB de JS heap** e ~**9s de script**.
- As páginas renderizam listas inteiras de 900–1.900 registros com componentes caros por linha: `Select`, `Popover`, `Calendar`, `AlertDialog`, `Tooltip`, `Avatar`, etc.
- Ainda há bundle pesado carregado cedo: `xlsx` entra no carregamento das páginas por causa de imports estáticos de exportação/importação.

Em outras palavras: os dados chegam relativamente rápido, mas o navegador fica pesado para montar e atualizar tudo.

## Plano de otimização

### 1. Paginação visual imediata nas tabelas pesadas

Implementar paginação local nas páginas:

- Propostas
- Projetos
- Contas a Receber
- Alocação

Começar exibindo 50 ou 100 linhas por página, com controles no rodapé.

Benefício esperado:

- Reduzir DOM de dezenas/centenas de milhares de elementos para poucos milhares.
- Melhorar bastante digitação em busca, troca de filtros, abertura de menus e scroll.
- Baixo risco, pois mantém os dados e filtros atuais funcionando.

### 2. Adiar componentes caros por linha

Trocar controles pesados renderizados em todas as linhas por versões mais leves:

- Evitar `Calendar` montado em cada linha de Contas a Receber/Propostas.
- Evitar `AlertDialog` por linha quando possível; usar um único diálogo compartilhado de confirmação.
- Manter `Select` apenas onde for realmente necessário; onde possível, usar menu/modal compartilhado.

Benefício esperado:

- Menos event listeners.
- Menos custo de renderização inicial.
- Menos travamento ao interagir com filtros e status.

### 3. Lazy load dos diálogos e ferramentas pesadas

Carregar sob demanda:

- `ProposalDetailDialog`
- `ProjectDetailDialog`
- `ReceivableDetailDialog`
- `ImportProposals`
- `ImportReceivablesDialog`
- biblioteca `xlsx` usada em exportação/importação

Hoje `xlsx` aparece entre os maiores scripts carregados mesmo antes de exportar/importar.

Benefício esperado:

- Primeiro carregamento menor.
- Páginas abrem mais rápido.
- Exportação/importação continuam funcionando, mas só carregam o peso quando o usuário clicar.

### 4. Reduzir buscas e filtros a cada tecla

Aplicar `useDeferredValue` ou debounce curto nos campos de busca das páginas pesadas.

Benefício esperado:

- Digitação mais fluida.
- Evita recalcular filtro/sort de milhares de itens em cada tecla imediatamente.

### 5. Enxugar payload restante das queries

Ajustar selects onde ainda baixamos colunas demais:

- `useReceivables`: remover `select("*")` da listagem e carregar impostos/notes só no detalhe.
- `useProposals`: remover `observacoes` da lista, carregar no detalhe.
- `useClients`: criar versão leve para dropdowns (`id`, `name`) em vez de `select("*")` nos diálogos.
- `useProjects`: separar alocações em uma query leve ou compor no frontend, reduzindo join aninhado.

Benefício esperado:

- Menos JSON transferido e menos objetos para o React processar.

### 6. Segunda etapa: paginação no servidor

Depois dos ganhos rápidos acima, migrar gradualmente para paginação real no banco:

- filtros e ordenação enviados para a query;
- `range()` por página;
- `count` total;
- exportação buscando todos os resultados apenas sob demanda;
- estatísticas via consultas agregadas ou views/funções leves.

Esta é a mudança com maior ganho estrutural, mas também a mais delicada porque altera como filtros, totais e exportação funcionam.

## Ordem recomendada

1. Paginação visual + debounce nas 4 páginas.
2. Lazy load de diálogos/importação/exportação e `xlsx`.
3. Diálogo único para ações por linha e redução de `Calendar/AlertDialog` repetidos.
4. Selects mais enxutos nos hooks.
5. Paginação no servidor como fase 2, se ainda houver lentidão com muitos dados.

## Fora de escopo por enquanto

- Upgrade da instância Lovable Cloud: neste momento os sinais não indicam saturação do backend.
- Reescrever toda a UX das tabelas.
- Trocar o design system.