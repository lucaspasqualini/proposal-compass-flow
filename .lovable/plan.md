O erro aparece porque o card está entendendo que a parcela não tem cliente carregado no objeto da tela, então ele salva apenas os dados da parcela e bloqueia o salvamento de CNPJ/contato/email para evitar gravar em cliente errado.

Pelo banco, a parcela MA_0077_26 está sim vinculada ao cliente J&F S.A. (`client_id` preenchido). Portanto, o problema está na atualização/cache do frontend: após salvar a parcela, o objeto `receivable` usado pelo card fica sem `clients.id` em algum momento e dispara essa validação.

Plano de correção:

1. Ajustar o `Salvar alterações` para usar um `clientId` seguro:
   - priorizar `receivable.client_id`;
   - usar `receivable.clients.id` apenas como fallback;
   - não depender só do objeto relacional `clients` carregado no cache.

2. Salvar contato/email/CNPJ mesmo quando o relacionamento `clients` vier incompleto:
   - buscar/usar os dados atuais do cliente pelo `client_id` antes de montar a atualização;
   - atualizar `clients.contact_name`, `clients.email` e `clients.cnpjs_vinculados` corretamente.

3. Corrigir o cache após salvar:
   - invalidar `receivables`, `clients` e `client_contacts`;
   - evitar que o card continue com dados antigos após a atualização da parcela.

4. Melhorar a mensagem de erro:
   - só mostrar “cliente não vinculado” quando `receivable.client_id` realmente estiver vazio;
   - se houver falha real ao atualizar cliente/contato, mostrar o erro específico.

Resultado esperado: no projeto MA_0077_26, o CNPJ `08.505.736/0001-23`, o contato Letícia Melon e o email serão salvos no cadastro do cliente/contatos, e o CNPJ aparecerá em Empresas > Dados Cadastrais > CNPJs vinculados.