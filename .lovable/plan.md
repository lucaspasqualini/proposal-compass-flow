

# Saneamento da Base de Clientes

## Resumo
Limpar duplicatas e enriquecer todos os 693 clientes com CNPJ automaticamente — incluindo os órfãos.

## Etapas

### Etapa 1 — Relatório de duplicatas (CSV)
Script Python com fuzzy matching (`difflib.SequenceMatcher`) nos 693 clientes. Gera CSV em `/mnt/documents/` com colunas: `grupo`, `id`, `nome`, `propostas`, `projetos`, `receivables`, `ação_sugerida` (manter/mesclar). Você revisa e decide quais mesclar e qual nome manter.

### Etapa 2 — Mesclar duplicatas aprovadas
Para cada grupo aprovado por você:
- `UPDATE proposals/projects/receivables SET client_id = <id_mantido>`
- `DELETE` o cliente duplicado
- **Clientes órfãos são mantidos** — não serão deletados

### Etapa 3 — Busca automática de CNPJ
- Criar edge function `search-cnpj-by-name` que busca empresas por nome usando a API pública `https://publica.cnpj.ws/cnpj` (gratuita, busca por razão social/nome fantasia)
- Executar script que percorre todos os clientes sem CNPJ, chama a edge function, e gera um segundo CSV com os resultados: `nome_cliente`, `cnpj_encontrado`, `razao_social`, `confiança` (match score)
- Você revisa o CSV e aprova quais CNPJs gravar
- Após aprovação, atualizo o banco com os CNPJs confirmados e preencho os demais campos (razão social, endereço, etc.) usando a edge function `search-cnpj` que já existe

### Limitações
- APIs públicas têm rate limit (~3 req/s no cnpj.ws gratuito) — o script fará pausas automáticas
- Nem todos os nomes terão match exato; alguns precisarão revisão manual

## Detalhes técnicos

| Etapa | Ferramenta | Resultado |
|---|---|---|
| 1 | Python script via `code--exec` | CSV de duplicatas |
| 2 | SQL UPDATE/DELETE via insert tool | Base limpa |
| 3 | Nova edge function + Python script | CSV de CNPJs para aprovação |

