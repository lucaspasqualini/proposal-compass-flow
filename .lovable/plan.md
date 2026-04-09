

# Adicionar campo "Documentação Necessária" na proposta

## Fluxo
1. Usuário envia o template PPTX atualizado com `{{DOCUMENTAÇÃO NECESSÁRIA}}` já posicionado
2. Substituímos o arquivo em `public/templates/proposta_modelo.pptx`
3. Implementamos as alterações abaixo

## Alterações

### 1. Banco de dados
Migração: `ALTER TABLE proposals ADD COLUMN documentacao_necessaria text DEFAULT NULL`

### 2. Card da proposta (`ProposalDetailDialog.tsx`)
- Adicionar campo `<Textarea>` com label "Documentação Necessária" logo após o campo "Escopo do Trabalho" (linha 576)
- Incluir no state `form` e no `handleSave`

### 3. Gerador PPTX (`generateProposalPptx.ts`)
- Adicionar `documentacao_necessaria` na interface `ProposalPptxData`
- Adicionar ao mapa de substituições: `"{{DOCUMENTAÇÃO NECESSÁRIA}}": data.documentacao_necessaria || "#N/A#"`
- Passar o campo na chamada do gerador (linha ~606)

## Próximo passo
Envie o template PPTX editado e eu implemento tudo de uma vez.

