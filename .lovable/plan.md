

# Busca de CNPJ por API Pública

## Objetivo
Adicionar um botão "Buscar CNPJ" na página de detalhes do cliente que consulta a API pública BrasilAPI pelo nome da empresa, exibe os resultados encontrados e permite ao usuário selecionar o correto para preencher automaticamente o CNPJ (e opcionalmente outros dados como endereço e telefone).

## Como funciona
1. Na página do cliente, ao lado do campo CNPJ, aparecerá um botão "Buscar CNPJ"
2. Ao clicar, uma janela (dialog) abrirá com o nome do cliente pré-preenchido como termo de busca
3. O sistema consultará a BrasilAPI (endpoint de busca por CNPJ ou nome) e exibirá os resultados
4. O usuário seleciona a empresa correta e o CNPJ (+ endereço, telefone) é preenchido automaticamente

## Abordagem Técnica

**Edge Function** (`search-cnpj`):
- Recebe o nome da empresa como parâmetro
- Consulta a API pública `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` — porém essa API só busca por CNPJ exato, não por nome
- Alternativa mais viável: usar a API da ReceitaWS (`https://receitaws.com.br`) ou a BrasilAPI com consulta por CNPJ
- Como APIs públicas gratuitas não buscam por **nome**, a abordagem será: o usuário digita o CNPJ na busca e o sistema retorna os dados cadastrais (razão social, endereço, telefone) para confirmar e preencher

**Fluxo revisado (mais prático)**:
1. Botão "Consultar CNPJ" ao lado do campo CNPJ
2. Usuário digita o CNPJ (14 dígitos)
3. Edge function consulta `brasilapi.com.br/api/cnpj/v1/{cnpj}`
4. Retorna razão social, endereço, telefone
5. Usuário confirma e os campos são preenchidos automaticamente

## Implementação

1. **Criar Edge Function** `supabase/functions/search-cnpj/index.ts`
   - Recebe CNPJ como query param
   - Consulta BrasilAPI (gratuita, sem chave)
   - Retorna dados formatados

2. **Atualizar `ClienteDetail.tsx`**
   - Adicionar botão "Consultar CNPJ" ao lado do campo
   - Dialog com input para digitar CNPJ
   - Ao consultar, preenche automaticamente: CNPJ, endereço, telefone, nome de contato

3. **Também adicionar na página de Clientes (lista)**
   - No dialog de "Novo Cliente", opção de consultar CNPJ antes de salvar

## Limitação
APIs públicas brasileiras gratuitas (BrasilAPI, ReceitaWS free) permitem busca apenas por CNPJ, não por nome da empresa. O usuário precisará informar o CNPJ para consultar os dados cadastrais.

