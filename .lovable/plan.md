## Mudanças em `src/pages/ContatoDetail.tsx`

### 1. Reordenar
- Mover o card "Empresas Secundárias" para **depois** do bloco `Dados do Contato` (e antes de "Última Interação"), reduzindo o destaque visual.

### 2. Simplificar a aparência
- Remover o ícone grande e o `Badge` de contagem do header.
- Trocar o `CardTitle text-lg` por um título mais discreto (`text-sm font-medium text-muted-foreground`), no mesmo estilo de um sublabel.
- Reduzir paddings internos do card.

### 3. Substituir checkboxes por dropdown + campo tipo "Observações"
- Trocar a lista de `<label><Checkbox/></label>` por um **dropdown multi-seleção** usando `Popover` + `Command` (`CommandInput`, `CommandList`, `CommandItem`), o mesmo padrão usado em `ContactCombobox.tsx` / `ReceivableDetailDialog`.
  - O dropdown lista todos os CNPJs secundários do cliente (`razão social — CNPJ`).
  - Cada item exibe um check à esquerda quando já está vinculado ao contato.
  - Clicar em um item alterna o vínculo (mesma lógica de `upsertVinculadoContact` / `removeVinculadoContact` já existente).
- Abaixo do dropdown, exibir um **campo somente-leitura no estilo do `Textarea` de Observações** (mesma borda, padding, `min-h`) contendo os nomes selecionados como **chips/badges**:
  - Cada chip mostra a razão social (ou CNPJ se faltar razão social).
  - O símbolo "×" aparece **apenas no hover do chip** (via `opacity-0 group-hover:opacity-100`, transição suave). Clicar no "×" remove o vínculo (chama o mesmo `toggle` com `checked=false`).
  - Quando vazio, exibe placeholder discreto: "Nenhuma empresa secundária vinculada".

### 4. Preservar a opção "Adicionar novo CNPJ"
- Manter o bloco "Adicionar nova empresa secundária" abaixo, com a mesma aparência simplificada (borda tracejada, label pequeno). A lógica de `lookupCnpj` + criação continua igual.

### Detalhes técnicos
- Nenhuma alteração de dados/backend; toda a lógica de `cnpjs_vinculados` em `useUpdateClient` permanece.
- Reutilizar `Command`/`Popover` de `@/components/ui` (já importados em outros pontos do projeto).
- Manter `useUpdateClient`, `lookupCnpj`, `upsertVinculadoContact`, `removeVinculadoContact` como estão.
