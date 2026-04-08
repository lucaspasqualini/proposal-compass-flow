

# Corrigir duplicação de projetos ao mudar status da proposta

## Problema
Quando uma proposta muda para "ganha", um projeto é criado. Porém:
1. Se o status muda de "ganha" para outro, o projeto permanece
2. Se voltar para "ganha", um novo projeto duplicado é criado

## Solução

**Arquivo:** `src/components/ProposalDetailDialog.tsx` (linhas ~250-269)

### Ao mudar status PARA "ganha"
Antes de criar um novo projeto, verificar se já existe um projeto vinculado a esta proposta (`proposal_id`). Se existir, reativar o projeto existente (status → `em_andamento`) ao invés de criar um novo.

### Ao mudar status DE "ganha" para outro
Quando `oldStatus === "ganha"` e o novo status não é "ganha", buscar o projeto vinculado via `proposal_id` e atualizar seu status para `cancelado`.

### Lógica resumida

```text
if (mudou para ganha) {
  projeto_existente = buscar projeto com proposal_id
  if (existe) → atualizar status para "em_andamento"
  else → criar novo projeto
}

if (saiu de ganha) {
  projeto_existente = buscar projeto com proposal_id
  if (existe) → atualizar status para "cancelado"
}
```

Nenhuma alteração no banco de dados necessária — a tabela `projects` já possui `proposal_id` e `status` com o enum que inclui `cancelado`.

