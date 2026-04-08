

# Ajustes na Aba de Propostas

## 1. Ordenação inteligente do Nº do Projeto

**Arquivo:** `src/pages/Propostas.tsx`

Alterar o comparador do `sortKey === "proposal_number"` para extrair ano (últimos 2 dígitos) e sequência (4 dígitos centrais) do padrão `MA_XXXX_YY`, ordenando primeiro por ano, depois por sequência.

```text
MA_0070_26 → (26, 70)
MA_0309_25 → (25, 309)
MA_0040_27 → (27, 40)
Desc: 27/40 > 26/70 > 25/309
```

## 2. Rediagramação do Card de Proposta

**Arquivo:** `src/components/ProposalDetailDialog.tsx`

Reorganizar o layout em seções visuais com grid mais estruturado:

```text
┌─ IDENTIFICAÇÃO ──────────────────────────────┐
│  Código (mono)    Status (badge)              │
│  Projeto *        Tipo de Projeto (dropdown)  │
│  Empresa          Cliente                     │
│  Indicador        Contato                     │
├─ DATAS ──────────────────────────────────────┤
│  Data Envio    Data Aprovação    Follow-up    │
├─ VALOR E PAGAMENTO ─────────────────────────┤
│  Valor (R$)    Forma de Pagamento (tipo)     │
│  [Se "Por Etapas": linhas Início/Minuta/Ass.]│
│  [Se "Por Prazo": parcelas livres como hoje] │
├─ DESCRIÇÃO ──────────────────────────────────┤
│  Entendimento da Situação                    │
│  Escopo do Trabalho                          │
│  Observações                                 │
├─ AÇÕES ──────────────────────────────────────┤
│  [Salvar]  [Gerar PPT]  [Cancelar]          │
└──────────────────────────────────────────────┘
```

Cada seção terá um título (`h4` ou label de grupo) com `Separator` entre elas.

## 3. Valor e Forma de Pagamento juntos

Mover o bloco de pagamento para logo abaixo do campo Valor, dentro da mesma seção visual "Valor e Pagamento".

## 4. Pagamento "Por Etapas" — linhas fixas

Quando `payment_type === "etapas"`, em vez de parcelas livres, exibir 3 linhas fixas:
- **Início** — campo valor (R$ ou %)
- **Minuta** — campo valor (R$ ou %)
- **Assinatura** — campo valor (R$ ou %)

Adicionar um toggle ou select para o usuário escolher entre "%" e "R$". Exibir validação visual (soma deve ser 100% ou igual ao valor total). Os dados serão salvos no campo `parcelas` (jsonb) com `descricao: "inicio" | "minuta" | "assinatura"`.

Quando `payment_type === "prazo"`, manter o sistema atual de parcelas livres.

## 5. Tipo de Projeto — Dropdown com lista fixa

Substituir o `<Input>` por um `<Select>` com as opções:
Ass. Perícia, CI/GAI, Contábil, CPC 04, Criminal, Gerencial, Impairment, Interno, Inventário, LSA, M&A, Marcação de Cotas, OPA, Perícia, Planejamento, PPA, RJ Laudos, RJ Advisor, RVU, SAF, Outros

## Arquivos a alterar

| Arquivo | Alteração |
|---|---|
| `src/pages/Propostas.tsx` | Comparador de ordenação para `proposal_number` |
| `src/components/ProposalDetailDialog.tsx` | Layout completo: seções, dropdown tipo, pagamento por etapas |

Sem alterações no banco de dados — todos os campos já existem.

