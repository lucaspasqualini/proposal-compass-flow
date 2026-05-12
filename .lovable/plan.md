# Sincronização entre abas — diagnóstico e correção

## O que já funciona hoje

- **Propostas → Projetos / Contas a Receber (edição manual)**: ao mudar o status de uma proposta para `ganha` em `ProposalDetailDialog`, o `syncProposalProjectStatus` cria o projeto e gera os receivables. Voltando atrás, apaga ambos.
- **Projetos ↔ Alocação (alocar/remover pessoa)**: `useCreateAllocation` / `useDeleteAllocation` fazem optimistic update e invalidam `["projects"]` e `["alocacao-projects"]`. A aba Alocação compartilha o namespace `["projects"]`, então recarrega.

## Lacunas que estão causando o problema

1. **Importação em massa de Propostas (`ImportProposals.tsx`)** insere direto no banco e só invalida `["proposals"]`. **Não cria projetos nem receivables** para linhas com status `ganha`/`aprovada`. É por isso que importar uma planilha não “puxa” para Projetos e Contas a Receber.
2. **Mapeamento de status do importador** aceita `aprovada` e `ganha` como valores distintos, mas a regra de negócio que dispara projeto+receivables só roda em `ganha`. Linhas marcadas como `aprovada` ficam órfãs.
3. **Alocação (`/alocacao`) usa querykey `["projects","alocacao-light"]`** com select reduzido. As mutações de alocação invalidam `["projects"]` (prefixo bate, então recarrega), mas o **optimistic update não atinge essa lista** — há um pequeno delay até o refetch. Em telas lentas dá impressão de “não atualizou”.
4. Não há nenhum trigger no banco garantindo a sincronia: tudo depende do código do front. Se alguém inserir/alterar uma proposta por outro caminho (importador, edição direta), a cadeia quebra.

## Plano de correção

### 1. Sincronizar importação de propostas
No `ImportProposals.handleImport`:
- Após `insert(...).select()`, percorrer as linhas retornadas e, para cada proposta com status `ganha`, chamar `syncProposalProjectStatus({ proposal, previousStatus: null })`.
- Tratar `aprovada` como sinônimo de `ganha` na importação (ou normalizar para `ganha` no `STATUS_MAP`) — alinhar com a regra única de negócio.
- Invalidar também `["projects"]` e `["receivables"]` ao final.
- Mostrar no toast quantos projetos e parcelas foram gerados.

### 2. Garantir sincronização no banco (defesa em profundidade)
Criar um **trigger** em `proposals` (`AFTER INSERT OR UPDATE OF status`) que:
- Quando `status` passar a `ganha` e não existir projeto vinculado: cria projeto (`status='em_andamento'`, copia título/cliente/valor) e gera receivables a partir de `parcelas` (ou parcela única).
- Quando sair de `ganha`: apaga projeto e receivables vinculados.
Assim qualquer caminho (importação, edição manual, SQL direto, futura API) mantém a cadeia consistente — o front passa a ser apenas “acelerador” via optimistic update.

### 3. Otimistic update na aba Alocação
Em `useCreateAllocation` / `useDeleteAllocation`, estender o optimistic update para também atualizar queries com prefixo `["projects","alocacao-light"]`, não só `["projects"]` puro e `["alocacao-projects"]`. Mantém a sensação de instantâneo na aba Alocação.

### 4. Backfill único
Migration de dados (executada uma vez) para varrer propostas existentes com `status='ganha'` que não tenham projeto/receivables e gerar o que está faltando — assim a base atual fica coerente antes do trigger entrar em ação.

## Resposta direta à sua pergunta

**Parcialmente.** Edição manual de uma proposta já propaga para Projetos e Contas a Receber. Alocação atualiza Projetos e vice-versa. Mas **importação em massa de propostas hoje não dispara essa cadeia**, e não há salvaguarda no banco. O plano acima fecha esses buracos.
