## Regra de previsão de NF para propostas por etapas

Quando uma proposta com `payment_type = "etapas"` for marcada como **ganha**, preencher automaticamente o campo `previsao_nf` de cada parcela com base na `data_aprovacao` da proposta:

| Parcela (`descricao`) | previsao_nf |
|---|---|
| `inicio` | data_aprovacao |
| `minuta` | data_aprovacao + 30 dias corridos |
| `assinatura` | data_aprovacao + 60 dias corridos |

Se a proposta não tiver `data_aprovacao` preenchida no momento do ganho, deixar `previsao_nf` em branco (sem fallback para `now()`).

### 1. Atualizar `src/lib/syncReceivables.ts`
- Adicionar helper `computePrevisaoNf(descricao, dataAprovacao)` que retorna a data conforme regra acima (string ISO `YYYY-MM-DD`) ou `null`.
- Em `generateReceivables`, receber também `data_aprovacao` da proposta. Quando `isEtapas`, preencher `previsao_nf` com o resultado do helper em vez de `null`.
- Atualizar a chamada em `src/lib/syncProposalProject.ts` para passar `data_aprovacao` no payload (tanto no caminho "created" quanto "reactivated").

### 2. Atualizar o trigger SQL `sync_proposal_to_project_receivables`
Via migration: replicar a mesma lógica no INSERT de receivables dentro do trigger, usando `NEW.data_aprovacao` e `(NEW.data_aprovacao + interval 'N days')::date` conforme `descricao` da parcela. Mantém o comportamento atual para `payment_type` não-etapas.

### 3. Backfill retroativo (apenas parcelas não lançadas)
Via migration (UPDATE em uma chamada à ferramenta de migração — é uma alteração pontual de dados que acompanha a regra):

```sql
UPDATE receivables r
SET previsao_nf = CASE
  WHEN r.description = 'inicio'     THEN p.data_aprovacao
  WHEN r.description = 'minuta'     THEN (p.data_aprovacao + interval '30 days')::date
  WHEN r.description = 'assinatura' THEN (p.data_aprovacao + interval '60 days')::date
END
FROM proposals p
WHERE r.proposal_id = p.id
  AND p.status = 'ganha'
  AND p.payment_type = 'etapas'
  AND p.data_aprovacao IS NOT NULL
  AND r.status <> 'lancado'
  AND r.description IN ('inicio','minuta','assinatura');
```

Parcelas já com status `lancado` (e também `pago`/`cancelado`/`pdd` por segurança) **não** são alteradas — limitamos o UPDATE a `status NOT IN ('lancado','pago','cancelado','pdd')` para evitar mexer em qualquer parcela já processada.

### Sem mudanças em
- UI de Contas a Receber (campo `previsao_nf` continua editável manualmente como hoje).
- Cálculo de `due_date` / lógica de `lancado` (`lancadoDefaults.ts`).
- Propostas por prazo (`payment_type ≠ "etapas"`).
