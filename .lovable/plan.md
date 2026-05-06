# Importar alocações da planilha (aba Projeto, mock-6)

## O que a planilha tem agora

- Aba **Projeto**: 1.183 linhas com `NUM.` preenchido (formato `MA_XXXX_YY`)
- **568 linhas** com pelo menos 1 colaborador alocado
- Filtrando 2021+ → ~390 projetos com alocação
- Estrutura: matriz 0/1 com 23 colunas-membro + 5 colunas-texto `COLABORADOR 1-5` (redundantes; vou usar a matriz como fonte canônica)

## Mapeamento de nomes (planilha → team_members)

Match fuzzy por primeiro nome / palavra-chave:

| Planilha | team_members |
|---|---|
| Maurício | Mauricio Emerick |
| Fellipe | Fellipe Franco |
| Lucas | Lucas Pasqualini |
| Nicolau | Antônio Nicolau |
| João Gabriel | Gabriel Paes Orenstein *(confirmar)* |
| Breno | Breno Franco Pereira Sassi |
| Victor | Victor Ribeiro de Souza |
| Giovanni | Giovanni Borges de Paula |
| Rodrigo Barbosa | *(não existe na equipe — pular ou criar?)* |
| João Cobalea | João Pedro Salgado Cobalea |
| Gabriel Venturim | Gabriel Venturim |
| Alessandro Sansone | Alessandro Sansone |
| Marina | Marina Vianello de Souza |
| Bernardo | *(ambíguo: Bernardo Brandão Salles; "Salles" também aparece — provavelmente são a mesma pessoa)* |
| Salles | Bernardo Brandão Salles |
| Leonardo | Leonardo Lourenço Gomes |
| Fabio | Fabio Tozo Pagotto |
| Hugo | Hugo Gerd Véras Schulz |
| Maria Eduarda | Maria Eduarda Monteiro de Barros |
| Giovana | Giovana Amaral Figueiredo |
| Caio | Caio Lima Falcao |
| Técnico Externo | *(não existe — pular)* |
| Desalocado | *(ignorar — não é alocação real)* |

**Pontos a confirmar antes da importação** (vou listar e te perguntar se houver dúvida real):
- "João Gabriel" da planilha = Gabriel Paes Orenstein? Ou outra pessoa?
- "Rodrigo Barbosa" não está cadastrado na Equipe — **pular essas alocações** ou criar membro?
- "Bernardo" e "Salles" como colunas separadas: vou tratar ambos como Bernardo Brandão Salles (mesma pessoa). Se um projeto tiver os dois marcados, gera só 1 alocação.
- "Técnico Externo" / "Desalocado" → **ignorar**.

## Como vou executar

1. Ler aba Projeto, filtrar `NUM.` com ano ≥ 21
2. Para cada linha, extrair lista de membros marcados na matriz (valor ≠ 0)
3. Match `proposal_number` → `project_id` (apenas projetos já existentes na base, ~918)
4. Aplicar mapa de nomes → `team_member_id`
5. Inserir em `project_allocations` com `INSERT ... ON CONFLICT DO NOTHING` por `(project_id, team_member_id)` — para não duplicar se rodar de novo
6. Reportar:
   - Total de alocações inseridas
   - Linhas da planilha sem projeto correspondente no banco (NUM. não encontrado)
   - Nomes não mapeados (se algum)

## Resultado esperado

- ~1.000–1.500 registros novos em `project_allocations`
- Aparecendo automaticamente em /projetos, /alocacao e no detalhe de cada projeto

## Detalhes técnicos

- Script Python (pandas) para parsear o XLSX e gerar SQL
- Inserção via tool de DB do Lovable Cloud
- Garantia de idempotência: `ON CONFLICT (project_id, team_member_id) DO NOTHING` (preciso adicionar índice único antes — ou simplesmente fazer SELECT prévio para deduplicar no script). Vou usar a 2ª via para não criar índice desnecessário.
