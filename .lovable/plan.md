

# Completar importação de status e colaboradores da planilha para todos os projetos

## Situação atual
- O banco de dados tem **204 projetos**, mas apenas **16** têm colaboradores alocados e **10** têm status diferente do padrão (em_andamento/iniciado).
- A planilha Excel tem ~190 linhas de projetos com status e equipe preenchidos para a maioria.
- A importação anterior só processou **13 projetos** -- provavelmente por falha no matching de proposal_number (escapamento de caracteres, espaços, etc.).

## Plano

### 1. Script Python para reimportação completa
- Ler a aba "Projetos" do Excel com openpyxl/pandas
- Extrair: coluna C (proposal_number), coluna D (status), colunas H-L (colaboradores)
- Normalizar proposal_numbers removendo `\_` e espaços extras
- Buscar todos os projetos do banco via SQL e fazer matching por proposal_number
- Mapeamento de status Excel para DB:
  - "Ativo" → `em_andamento`
  - "Finalizado" → `finalizado`
  - "Em pausa" → `pausado`
  - "Aguardando Retorno" → `aguardando_retorno`
- Mapeamento de nomes de colaboradores para team_member_id (usando a tabela team_members)
- Gerar e executar UPDATEs de status e INSERTs de project_allocations (removendo duplicatas existentes)

### 2. Mapeamento de nomes (apelidos → nomes completos)
Com base na planilha e na equipe cadastrada:
- "Lucas" → Lucas Pasqualini
- "Maurício" → Mauricio Emerick
- "Fellipe" → Fellipe Franco
- "Nicolau" → Antônio Nicolau
- "Victor" → Victor Ribeiro de Souza
- "Breno" → Breno Franco Pereira Sassi
- "Salles" / "Bernardo" → Bernardo Brandão Salles
- "Leonardo" → Leonardo Lourenço Gomes
- "Giovanni" → Giovanni Borges de Paula
- "Marina" → Marina Vianello de Souza
- "Fabio" → Fabio Tozo Pagotto
- "Hugo" → Hugo Gerd Véras Schulz
- "João Cobalea" → João Pedro Salgado Cobalea
- "Giovana" → Giovana Amaral Figueiredo
- "Maria Eduarda" → Maria Eduarda Monteiro de Barros
- "Caio" → Caio Lima Falcao
- "Gabriel Venturim" → Gabriel Venturim
- "Alessandro Sansone" → Alessandro Sansone
- "Técnico Externo" → ignorar (não cadastrado)

### 3. Execução
- Limpar allocations existentes antes de reinserir (para evitar duplicatas)
- Atualizar status de todos os projetos encontrados
- Inserir todas as alocações de colaboradores
- Gerar relatório: quantos projetos atualizados, quantos não encontrados, quais nomes não mapeados

## Detalhes técnicos
- Arquivo: `src/pages/Projetos.tsx` -- nenhuma alteração de código
- Tudo via script Python + SQL (psql) no sandbox
- Apenas operações de UPDATE e INSERT no banco

