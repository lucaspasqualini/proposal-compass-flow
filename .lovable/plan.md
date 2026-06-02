## Diagnóstico

Para o projeto **MA_0077_26**, encontrei no banco que a parcela foi atualizada, mas os dados do cliente não:

- A parcela em `receivables` salvou campos como **Responsável = Lucas** e **NFe = 109**.
- O cliente **J&F S.A.** continua com `contact_name`, `email` vazios.
- `cnpjs_vinculados` continua `[]`.
- A tabela de contatos do cliente não tem nenhum contato vinculado.

A causa provável é que a consulta de `receivables` carrega `clients(name, cnpj, contact_name, email)`, mas **não carrega `clients.id` nem `clients.cnpjs_vinculados`**. No card, o salvamento de contato/CNPJ depende de `client.id`; sem esse ID, o código salva a parcela, mostra sucesso e pula a atualização do cliente/contato.

## Plano de correção

1. **Corrigir a consulta de Contas a Receber**
   - Incluir `clients(id, name, cnpj, contact_name, email, cnpjs_vinculados)` no hook de receivables.
   - Garantir que a mutação de atualização também retorne esses campos para manter a lista e o card sincronizados.

2. **Ajustar o botão Salvar do card**
   - O botão só deve mostrar sucesso quando todas as etapas esperadas forem concluídas.
   - Se a parcela salva, mas cliente/contato falha, mostrar erro claro em vez de “Alterações salvas”.
   - Manter o comportamento de salvar tudo junto: responsável, impostos, NFe, contato, email e CNPJ.

3. **Persistir contato novo corretamente**
   - Ao digitar um nome novo no campo Contato e clicar em Salvar:
     - criar registro em `client_contacts` para o cliente;
     - salvar email informado nesse contato;
     - atualizar também o contato/email principal do cliente quando alterados no card.

4. **Persistir CNPJ vinculado corretamente**
   - Se o CNPJ digitado for diferente do CNPJ principal do cliente:
     - adicionar em `clients.cnpjs_vinculados`;
     - não sobrescrever o CNPJ principal, exceto se ele estiver vazio.

5. **Melhorar feedback visual**
   - Desabilitar o botão enquanto salva.
   - Mensagem de sucesso apenas depois de invalidar/atualizar os caches de `receivables`, `clients` e `client_contacts`.

## Resultado esperado

Após a correção, ao abrir o card de **MA_0077_26**, digitar CNPJ/contato/email e clicar em **Salvar alterações**, esses dados devem aparecer depois em:

- Contas a Receber;
- Empresas > Dados Cadastrais > CNPJs vinculados;
- Empresas/Contatos, como contato vinculado ao cliente.