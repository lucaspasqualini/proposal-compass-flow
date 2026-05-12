Diagnóstico confirmado: não é filtro ativo. A aba Propostas está carregando somente os 1000 registros mais recentes por causa do limite padrão do backend. A CSN tem 6 propostas no banco, mas apenas 1 está dentro desse lote recente; por isso a busca por “CSN” mostra só a proposta perdida. A aba Clientes calcula os números a partir de outro carregamento que, hoje, está retornando as 6 propostas da CSN, daí a divergência.

Plano de correção:

1. Criar um helper reutilizável para paginação completa
   - Buscar registros em páginas de 1000 usando `.range(...)` até não haver mais dados.
   - Manter ordenação estável quando necessário.
   - Evitar mexer no cliente de backend gerado automaticamente.

2. Corrigir a aba Propostas
   - Atualizar `useProposals()` para carregar todas as propostas, não só as primeiras 1000.
   - Preservar o join com clientes e a ordenação atual por `created_at desc`.
   - Isso fará a busca por “CSN” mostrar as 6 propostas.

3. Corrigir telas relacionadas para evitar a mesma classe de erro
   - Atualizar `useProjects()` e a consulta da aba Alocação, pois também listam tabelas que podem ultrapassar 1000 registros.
   - Revisar `useClientStats()` para garantir que Clientes, Propostas e Projetos usem carregamento completo de forma consistente.

4. Validar com dados reais
   - Confirmar no banco que CSN tem 6 propostas e R$ 1.220.500 em propostas ganhas.
   - Confirmar que a lógica corrigida não depende de filtros locais para exibir esses registros.

Resultado esperado:
- Na aba Propostas, buscar “CSN” deve exibir as 6 propostas existentes.
- A aba Clientes e a aba Propostas passam a usar bases completas e consistentes, eliminando a divergência causada por truncamento de dados.