

## Logotipo automático nos cards de cliente via Clearbit

### Objetivo
Exibir o logotipo da empresa no card/lista de clientes e na página de detalhe, buscando automaticamente via Clearbit a partir do **website** do cliente. Quando não houver website, derivar o domínio do **email** cadastrado.

### Sobre a Clearbit Logo API
- Endpoint público: `https://logo.clearbit.com/{dominio}`
- Não requer chave de API nem backend — é uma simples tag `<img src="...">`
- Retorna 404 quando não encontra o logo → tratamos com fallback (ícone `Building2` + iniciais do nome, como já existe hoje)

### Mudanças

**1. Banco — adicionar coluna `website`**
Migração para adicionar `website TEXT` na tabela `clients`. Necessário porque hoje não existe esse campo, e o email nem sempre usa o domínio corporativo (ex.: gmail).

**2. Helper de domínio — `src/lib/clientLogo.ts` (novo)**
Função pura `getClientLogoUrl(client)` que:
- Se `client.website` preenchido → extrai o hostname (remove `http://`, `https://`, `www.`, paths)
- Senão, se `client.email` preenchido e o domínio **não** for genérico (gmail, hotmail, outlook, yahoo, icloud, uol, bol, terra) → usa o domínio do email
- Senão → retorna `null`
- Quando há domínio → retorna `https://logo.clearbit.com/{dominio}`

**3. Componente `ClientLogo` — `src/components/ClientLogo.tsx` (novo)**
Wrapper sobre o `Avatar` do shadcn:
- Props: `client`, `size` (`sm` | `md` | `lg`), `className`
- Usa `AvatarImage` com a URL da Clearbit
- `AvatarFallback` mostra as iniciais do nome do cliente (já com cor primária suave) — Radix automaticamente exibe o fallback se a imagem der 404
- Tamanhos: `sm` 32px (linha de tabela), `md` 48px (cards), `lg` 80px (header de detalhe)

**4. Aplicar nos pontos de exibição**
- `src/pages/Clientes.tsx` → adicionar coluna logo (32px) no início de cada linha da tabela, antes do nome
- `src/pages/ClienteDetail.tsx` → trocar o quadrado azul com `Building2` no header pelo `ClientLogo` tamanho `lg`
- `src/pages/ClienteDetail.tsx` → adicionar campo `Website` no card "Contato e Endereço" (input ao lado do telefone), salvo via `updateClient`
- `src/components/CnpjLookupDialog.tsx` (consulta) — verificar se a API de CNPJ retorna site/email e propagar para o form (apenas se já existir; sem novas dependências)

**5. Reaproveitamento**
O `ClientLogo` também pode ser usado depois nos cards de Propostas e Projetos (o cliente é a chave estrangeira), mas isso fica fora deste escopo a menos que solicitado.

### Arquivos
- **Migração**: adicionar coluna `website` em `clients`
- **Criar**: `src/lib/clientLogo.ts`, `src/components/ClientLogo.tsx`
- **Editar**: `src/pages/Clientes.tsx`, `src/pages/ClienteDetail.tsx`

### Considerações
- Sem custo: Clearbit Logo API é gratuita e pública
- Sem requisições do backend: o navegador faz a chamada direto
- LGPD/privacidade: apenas o domínio público da empresa é exposto
- Performance: navegador faz cache automático; carga única por domínio
- Fallback elegante: iniciais aparecem se logo não existir, mantendo consistência visual

