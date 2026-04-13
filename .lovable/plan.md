

# Busca de CNPJ via Google Search

## Resumo
Usar busca web para pesquisar "{nome do cliente} CNPJ" e extrair o CNPJ diretamente dos snippets do Google — sem precisar entrar nas páginas.

## Como funciona
1. **Script Python** percorre os ~687 clientes sem CNPJ
2. Para cada um, usa a ferramenta de busca web com query `"{nome}" CNPJ`
3. Aplica regex `\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}` nos snippets/títulos dos resultados
4. Se encontrar um CNPJ, registra como match
5. Gera CSV em `/mnt/documents/cnpj_google_results.csv` com colunas: `id`, `nome_cliente`, `cnpj_encontrado`, `fonte` (URL do resultado)
6. Você revisa o CSV e aprova quais gravar
7. Após aprovação, atualizo o banco e busco dados completos (razão social, endereço, etc.) usando a edge function `search-cnpj` que já existe

## Limitações
- A busca web tem rate limit — processamento em lotes com pausas
- Alguns clientes podem não ter resultado (nomes genéricos, pessoas físicas)
- Possíveis falsos positivos — por isso a etapa de revisão via CSV é essencial

## Detalhes técnicos
- Ferramenta: `websearch--web_search` (disponível no sandbox)
- Regex de extração: `\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[\-\s]?\d{2}`
- Após aprovação do CSV, enriquecimento completo via `search-cnpj` edge function existente

