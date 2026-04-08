

# Ajustar lógica de "Clientes Ativos" e adicionar campo `etapa_assinado_at` nos projetos

## Contexto

Hoje, "cliente ativo" = qualquer cliente com pelo menos 1 proposta. A nova regra considera ativo se:
1. Tem proposta com status `em_elaboracao` ou `em_negociacao`; ou
2. Tem projeto com etapa `iniciado` ou `minuta`; ou
3. Tem projeto com etapa `assinado` cuja data de mudança para essa etapa foi há menos de 3 meses.

## Alterações

### 1. Migração — adicionar coluna `etapa_assinado_at` na tabela `projects`

```sql
ALTER TABLE public.projects ADD COLUMN etapa_assinado_at timestamptz;
UPDATE public.projects SET etapa_assinado_at = '2026-04-04T00:00:00Z' WHERE etapa = 'assinado';
```

### 2. `src/components/ProjectDetailDialog.tsx` — registrar data ao mudar etapa para "assinado"

Na função `handleEtapaChange`, ao detectar que o novo valor é `assinado`, incluir `etapa_assinado_at: new Date().toISOString()` no update. Se mudar de `assinado` para outra etapa, limpar o campo (`etapa_assinado_at: null`).

### 3. `src/hooks/useClientStats.ts` — nova lógica de "ativo"

- Alterar a query de projects para incluir `client_id, etapa, etapa_assinado_at`
- Agrupar projetos por client_id
- Um cliente é ativo se:
  - Tem proposta com status `em_elaboracao` ou `em_negociacao`; ou
  - Tem projeto com etapa `iniciado` ou `minuta`; ou
  - Tem projeto com etapa `assinado` e `etapa_assinado_at` nos últimos 3 meses
- Adicionar campo `is_active: boolean` ao `ClientWithStats`

### 4. `src/pages/Clientes.tsx` — usar o novo campo

Substituir `clients?.filter((c) => c.proposal_count > 0)` por `clients?.filter((c) => c.is_active)`.

## Arquivos a alterar

| Arquivo | Alteração |
|---|---|
| Migração SQL | Adicionar coluna `etapa_assinado_at` + popular projetos assinados com 04/04/2026 |
| `src/components/ProjectDetailDialog.tsx` | Setar/limpar `etapa_assinado_at` ao mudar etapa |
| `src/hooks/useClientStats.ts` | Nova lógica de cliente ativo com as 3 condições |
| `src/pages/Clientes.tsx` | Usar `is_active` no card de resumo |

