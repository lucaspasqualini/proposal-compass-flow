# Plano: Transformar o app em PWA instalável

Vou configurar o app como **Progressive Web App (PWA)** para que você possa instalá-lo na tela inicial do iPhone ou Android e usá-lo como um app nativo, com suporte offline e notificações push.

## O que será feito

### 1. Configuração base do PWA
- Instalar `vite-plugin-pwa` e configurar no `vite.config.ts`
- Criar `manifest.json` com nome do app, ícones, cores (teal #0D7377) e `display: standalone` (abre em tela cheia, sem barra do navegador)
- Adicionar meta tags mobile no `index.html` (theme-color, apple-touch-icon, viewport otimizado)
- Gerar ícones do app em vários tamanhos (192x192, 512x512, Apple touch icon 180x180)

### 2. Suporte offline
- Configurar Service Worker via Workbox (incluso no `vite-plugin-pwa`)
- Estratégia **NetworkFirst** para navegação HTML (sempre tenta buscar versão nova, usa cache se offline)
- Estratégia **CacheFirst** para assets estáticos (CSS, JS, fontes, imagens)
- Cache de respostas da API do Lovable Cloud para leitura offline (Propostas, Projetos, Clientes, Contas a Receber)
- Indicador visual no app quando estiver offline

### 3. Notificações push
- Criar tabela `push_subscriptions` no Lovable Cloud para armazenar inscrições por usuário
- Gerar par de chaves VAPID (será necessário adicionar como secrets: `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`)
- Componente de UI para o usuário ativar/desativar notificações (em Configurações)
- Edge Function `send-push-notification` para disparar notificações
- Triggers iniciais sugeridos (a confirmar com você):
  - Nova proposta criada
  - Conta a receber vencendo em X dias
  - Status de projeto alterado

### 4. Página de instalação
- Criar rota `/instalar` com instruções passo a passo:
  - **iPhone (Safari)**: Compartilhar → Adicionar à Tela de Início
  - **Android (Chrome)**: Menu → Instalar app
- Botão "Instalar app" que aparece automaticamente quando o navegador suporta (`beforeinstallprompt`)

### 5. Validação
- Testar instalação no preview publicado
- Verificar que abre em tela cheia
- Confirmar que funciona offline
- Testar notificação push de teste

## Detalhes técnicos

**Importante sobre o preview do Lovable:** O Service Worker e as notificações push **só funcionam na versão publicada** (URL `*.lovable.app`), não no editor. Você precisará clicar em **Publish** antes de instalar no celular.

**Limitações de push no iOS:**
- Notificações push em PWA no iPhone só funcionam a partir do **iOS 16.4+**
- O usuário precisa **primeiro instalar o app na tela inicial** e abrir a partir dela para que push funcione (limitação da Apple, não do Lovable)
- No Android funciona normalmente sem instalar

**Cache offline:** Por padrão vou cachear as últimas leituras das tabelas principais. Edição/criação offline com sincronização posterior é um projeto bem maior — não está incluso neste plano.

## Perguntas antes de implementar

1. Quais eventos devem disparar notificação push? (sugeri 3 acima, mas pode escolher outros)
2. Quer que eu use o nome "Compass" / "Proposal Compass" no app instalado, ou outro nome?
3. Usar o ícone atual do projeto ou gerar um novo (posso criar um com a cor teal da marca)?
