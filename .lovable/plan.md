# Importar Propostas + Projetos via Excel (upsert)

## Objetivo

Estender a importação de Excel para aceitar **um único arquivo com 2 abas** ("Propostas" e "Projetos"), atualizando registros existentes em vez de duplicar, e criando alocações de equipe a partir de uma coluna na aba Projetos.

## Estrutura esperada do Excel

### Aba "Propostas"
Colunas (case-insensitive, partial match — mesma lógica de hoje):
- **Projeto / Título** *(obrigatório)*
- **Número** (proposal_number, ex: `MA_0012_25`) — **chave do upsert**
- Tipo, Data de Envio, Valor, Status, Data de Aprovação, Data de FUP
- Empresa (casa com `clients.name`), Cliente/Contato, Indicador, Observações

### Aba "Projetos"
- **Projeto / Título** *(obrigatório)* — junto com Empresa forma a **chave do upsert**
- Empresa (casa com `clients.name`)
- Proposta (proposal_number — opcional, vincula a `proposal_id`)
- Status, Etapa, Data Início, Data Fim, Orçamento, Descrição
- **Equipe / Alocações** — nomes separados por `,` ou `;` (casa com `team_members.name`)

## Fluxo de importação

1. Usuário clica **"Importar Excel"** em Propostas ou em Projetos (mesmo botão, mesmo dialog reaproveitado).
2. App lê o arquivo, identifica abas presentes (Propostas, Projetos ou ambas) e mostra preview separado por aba.
3. Para cada linha:
   - **Propostas**: se `proposal_number` existe na base → `UPDATE`; senão → `INSERT`. Linhas sem número também viram INSERT (gera número novo via trigger).
   - **Projetos**: busca por `(title + client_id)`; se existe → `UPDATE`; senão → `INSERT`.
   - **Alocações**: para cada nome na coluna Equipe, casa com `team_members.name`. Substitui as alocações atuais do projeto pelas novas (apaga e reinsere — mais simples e previsível).
4. Toast com resumo: `X propostas inseridas, Y atualizadas / Z projetos inseridos, W atualizados, K alocações criadas`.

## Mudanças técnicas

### Novo arquivo
- **`src/lib/importWorkbook.ts`** — funções puras de parsing/normalização reutilizáveis (parseDate, normalizeStatus, mapColumns, matchClient, matchTeamMember).

### Refatorar
- **`src/components/ImportProposals.tsx`** → renomear para **`ImportWorkbook.tsx`**:
  - Aceita workbook com múltiplas abas.
  - Tabs no preview (Propostas / Projetos).
  - Lógica de upsert (busca prévia de chaves existentes, separa em `inserts` vs `updates`).
  - Mantém prop `mode?: "proposals" | "projects" | "both"` para o botão saber qual aba esperar (mas tolerante: se vier as duas, importa as duas).

### Integrar
- **`src/pages/Propostas.tsx`** — botão já existe, troca import.
- **`src/pages/Projetos.tsx`** — adiciona o mesmo botão "Importar Excel".

### Sem migrations
Schema do banco já suporta tudo (proposal_number, project_allocations, etc).

## Lógica de matching detalhada

```text
Status Proposta:  rascunho | enviada | em_analise | em_negociacao | aprovada | ganha | rejeitada | perdida
Status Projeto:   planejamento | em_andamento | pausado | concluido | cancelado
Etapa:            iniciado | assinado | em_execucao | concluido  (texto livre, mantém o que vier)
Datas:            DD/MM/AAAA, AAAA-MM-DD, ou serial Excel
Valor:            remove R$, pontos de milhar; aceita vírgula decimal
Empresa→cliente:  match por lowercase exato em clients.name
Membro→alocação:  match por lowercase exato em team_members.name (ignora não encontrados, avisa no toast)
```

## Importante sobre upsert de Propostas ganhas

Ao **atualizar** uma proposta existente, NÃO disparamos `syncProposalProjectStatus` automaticamente (evita criar projeto duplicado, já que ele virá na aba Projetos). Caso o usuário queira que o sync rode, melhor importar Propostas primeiro sem aba Projetos.

## Entrega

Após aprovado, eu implemento e te aviso. Aí você me envia o `.xlsx` (pode ser via chat) e eu te mostro o preview antes do import real, ou se preferir, faço o import direto no banco usando o arquivo que você anexar.
