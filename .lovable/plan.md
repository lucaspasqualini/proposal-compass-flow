# Enriquecimento de CNPJs por Excel

Nova funcionalidade que recebe uma planilha, detecta a coluna de CNPJ, busca para cada empresa **razão social, indústria (CNAE), site oficial e LinkedIn**, e devolve um Excel enriquecido. Sem persistência no banco — fluxo 100% em memória + download.

## Arquitetura

```text
[Upload .xlsx] → [Parse + auto-detect coluna CNPJ]
       ↓
[Loop por CNPJ, em lotes paralelos de 5]
       ↓
   ┌──────────────────────────────────────────┐
   │ Edge Function: enrich-cnpj               │
   │  1. BrasilAPI → razão social + CNAE      │
   │  2. Firecrawl Search (site oficial)      │
   │  3. Firecrawl Search (LinkedIn company)  │
   │  ↳ se Firecrawl 402/credits → Google CSE │
   └──────────────────────────────────────────┘
       ↓
[Tabela com progresso] → [Botão "Exportar Excel"]
```

## Etapas

### 1. Conectores e secrets
- Conectar **Firecrawl** via Connectors (injeta `FIRECRAWL_API_KEY`).
- Pedir ao usuário 2 secrets para o fallback: `GOOGLE_CSE_API_KEY` e `GOOGLE_CSE_CX`. Não vou pedir agora — peço quando o build começar.

### 2. Edge function `enrich-cnpj`
- Input: `{ cnpj: string }`
- Passo A — BrasilAPI (reaproveita lógica de `search-cnpj`): retorna `razao_social`, `nome_fantasia`, `cnae_principal`, `cnae_descricao`.
- Passo B — Site oficial:
  - Tenta `Firecrawl /v2/search` com query `"<razao_social>" site oficial` + filtros para descartar linkedin/facebook/instagram/glassdoor.
  - Pega o 1º domínio "raiz" plausível.
- Passo C — LinkedIn:
  - Firecrawl search `"<razao_social>" site:linkedin.com/company`.
- Fallback Google CSE: ativa quando Firecrawl responde `402` / `payment required` / `insufficient credits`. Mesmo padrão de queries, endpoint `https://www.googleapis.com/customsearch/v1`.
- Estado de fallback é mantido em memória do processo da função; cada invocação tenta Firecrawl primeiro e só "lembra" do fail dentro daquela request.
- Retorna: `{ cnpj, razao_social, nome_fantasia, cnae, industria, site, linkedin, source: 'firecrawl'|'google'|'mixed', errors: [] }`.

### 3. Página `/enriquecimento` (rota nova)
- Adicionar item no sidebar (`AppSidebar.tsx`), ícone `Search` ou `Sparkles`.
- Layout:
  - **Dropzone** de upload (.xlsx/.xls). Usa `xlsx` (já instalado).
  - **Auto-detect**: procura coluna cujo header contém "CNPJ" (case-insensitive, sem acentos); se não achar, escaneia primeiras 20 linhas por valores com 14 dígitos.
  - **Preview**: tabela mostrando até 10 linhas e qual coluna foi escolhida, com opção de trocar manualmente.
  - **Botão "Enriquecer N CNPJs"**.
- Execução:
  - Lotes de 5 em paralelo via `Promise.all`, com barra de progresso (`Progress` do shadcn) "X de N".
  - Cada linha aparece em tempo real com status (✓ ok / ⚠ parcial / ✗ erro) e os campos preenchidos.
  - Toast no fim com resumo.
- **Exportar**: gera novo `.xlsx` mantendo as colunas originais + 4 novas (`razao_social`, `cnae`, `site`, `linkedin`). Usa `xlsx` writer.

### 4. UX / detalhes
- Validação: arquivo > 1000 linhas → aviso (limite recomendado 500).
- CNPJs inválidos (≠ 14 dígitos após limpar) marcados como erro sem chamar API.
- Deduplicação automática antes de buscar (mesmo CNPJ repetido = 1 chamada).
- Cache em memória durante a sessão (Map<cnpj, resultado>) para o caso de o usuário rodar de novo.

## Detalhes técnicos

**Arquivos novos:**
- `supabase/functions/enrich-cnpj/index.ts`
- `src/pages/Enriquecimento.tsx`
- `src/lib/enrichExcel.ts` (parse + auto-detect coluna + export)

**Arquivos editados:**
- `src/App.tsx` — registrar rota
- `src/components/AppSidebar.tsx` — novo item de menu

**Dependências:** nenhuma nova; `xlsx` já existe.

**Custo aproximado:** Firecrawl Search ~1 crédito por query × 2 queries por CNPJ = ~1000 créditos para 500 empresas. Google CSE = 100 buscas/dia grátis (200 = 100 empresas/dia no fallback).

## Antes de começar a implementar

Quando aprovar o plano, eu vou:
1. Pedir para conectar o **Firecrawl** (Connectors).
2. Pedir os secrets `GOOGLE_CSE_API_KEY` e `GOOGLE_CSE_CX` para o fallback. Instruções de como obter:
   - API Key: console.cloud.google.com → APIs & Services → Credentials → Create API Key, e habilitar "Custom Search API".
   - CX: programmablesearchengine.google.com → Create → "Search the entire web" → copiar Search engine ID.
