# Roadmap: OCR de Despesas e Reembolsos

## Checklist de Features

| Feature | Progresso | Concluido | Observacao |
| :--- | :---: | :---: | :--- |
| Upload, storage e fila de OCR | 80% |  | Fluxo base ja existe com `ocr_jobs`, `ocr_files`, `ocr_executions`, storage local, Redis/BullMQ e worker. |
| OCR bruto e providers | 70% |  | Projeto ja suporta multiplos providers e armazena OCR em `ocr_executions.ocr_data`; falta integrar com despesas. |
| Dominio de despesas | 100% | [x] | `expenses`, CRUD, filtros, tipos compartilhados, relacoes com OCR e criacao minima apos OCR concluido implementados. |
| Consulta fiscal oficial e baixa de XML | 60% |  | Modulo fiscal, deteccao de chave, configs, provider SEFAZ preparado/stub seguro, status de consulta e integracao com despesas/OCR implementados; falta SOAP/mTLS real. |
| Extracao estruturada XML/OCR | 80% |  | Parser XML NF-e 55 e heuristicas OCR JSON extraem estabelecimento, valor, data e pagamento; falta ampliar cobertura com notas reais e confidencia por campo. |
| Cadastros de clientes e tipos de gasto | 100% | [x] | `records` com tipos `client` e `expense_type`, CRUD, filtros, soft delete e validacao nas despesas implementados. |
| Usuarios, login e permissoes | 0% |  | Criar autenticacao, roles, admin e regras de acesso por usuario. |
| Frontend de autenticacao | 0% |  | Criar login, criar usuario, alterar senha, guards e sessao. |
| Importacao de despesas | 20% |  | Upload/crop OCR ja existe parcialmente; falta fluxo orientado a despesa, XML e pendencia fiscal. |
| Tela de despesas | 0% |  | Criar listagem, filtros, edicao, selecao e atribuicao por admin. |
| Relatorios de despesas | 0% |  | Gerar relatorio por filtros ou selecionadas, total geral e total por tipo. |
| Migrations, seguranca e producao | 15% |  | Docker/Compose existem e dados runtime foram removidos do versionamento; falta migrations, indices, config validada e hardening fiscal. |

Este documento organiza a evolucao do projeto Open Receipt OCR para um sistema de despesas baseado em notas fiscais, com OCR, extracao estruturada, armazenamento, edicao, usuarios, permissoes e relatorios.

## Visao de Produto

O objetivo e permitir que usuarios importem imagens/PDFs/XMLs de documentos fiscais, processem o conteudo por OCR quando necessario, armazenem a fonte fiscal valida e transformem esse resultado em uma despesa editavel. Para NF-e modelo 55, o documento valido deve ser sempre o XML; para cupom fiscal sem XML disponivel, a fonte pode ser o JSON bruto criado pelo OCR. Cada despesa deve conter dados extraidos automaticamente, campos complementares preenchidos pelo usuario, relacoes com cadastros internos e suporte a filtros, relatorios e reembolso.

## Estado Atual do Projeto

O projeto ja possui:

- Backend NestJS com TypeORM e SQLite.
- Frontend Angular com PrimeNG.
- Upload de arquivos para OCR.
- Tabelas atuais de OCR: `ocr_jobs`, `ocr_files`, `ocr_executions`.
- Resultado bruto do OCR em `ocr_executions.ocr_data`.
- Storage local para uploads.
- Worker com fila Redis/BullMQ para processamento OCR.

O proximo passo recomendado e separar claramente o dominio de OCR do dominio de despesas:

- OCR continua responsavel por upload, fila, execucao e resultado bruto quando a entrada for imagem/PDF.
- XML fiscal passa a ser a fonte canonica quando o documento for NF-e modelo 55.
- Despesas passam a representar o dado de negocio final: estabelecimento, valor, data, pagamento, cliente, tipo de gasto, reembolso, descricao e dono da despesa.

## Sugestao de Estrutura

### Backend

Criar modulos novos:

- `server/src/app/auth`
- `server/src/app/users`
- `server/src/app/expenses`
- `server/src/app/records`
- `server/src/app/reports`
- `server/src/app/expense-extraction`
- `server/src/app/fiscal-documents`

Criar entidades novas:

- `UserEntity`
- `ExpenseEntity`
- `RecordEntity`
- `ReportSnapshotEntity` opcional, se for necessario historico de relatorios gerados
- `FiscalDocumentFetchEntity` opcional, para registrar tentativas de consulta/baixa oficial

Criar tipos compartilhados em `packages/types`:

- `PaymentType`
- `FiscalDocumentType`
- `ExpenseSourceType`
- `RecordType`
- `UserRole`
- `ExpenseStatus`
- `FiscalFetchStatus`
- `Expense`
- `Record`
- `ReportSummary`

### Frontend

Criar areas/telas:

- `/login`
- `/expenses/import`
- `/expenses`
- `/records`
- `/users` somente admin
- `/reports` opcional, ou relatorio como acao dentro da tela de despesas

### Banco de Dados

Enquanto o projeto estiver em fase inicial, `synchronize: true` pode continuar sendo usado. Antes de producao, migrar para migrations TypeORM versionadas.

## Modelo de Dados Proposto

### Tabela `users`

Campos:

- `id`
- `name`
- `email`
- `password_hash`
- `role`: `admin` ou `user`
- `is_active`
- `created_at`
- `updated_at`

### Tabela `records`

Tabela generica de cadastros controlados pelo usuario.

Campos:

- `id`
- `name`
- `type`: `client` ou `expense_type`
- `created_by_user_id`
- `is_active`
- `created_at`
- `updated_at`

Regras:

- Usuario normal pode criar e editar registros do tipo `client`.
- Apenas admin pode criar e editar registros do tipo `expense_type`.

### Tabela `expenses`

Campos de origem fiscal:

- `id`
- `ocr_job_id`
- `ocr_file_id`
- `ocr_execution_id`
- `document_type`: `nfe_model_55`, `consumer_invoice`, `receipt`, `unknown`
- `source_type`: `xml`, `ocr_json`, `manual`
- `raw_ocr_json`: JSON/texto com o resultado bruto completo quando a origem for OCR
- `raw_xml`: XML completo quando a despesa vier de NF-e modelo 55
- `xml_access_key`: chave de acesso da NF-e, quando disponivel
- `official_lookup_status`: `not_attempted`, `pending`, `found`, `not_found`, `requires_certificate`, `not_authorized`, `failed`
- `official_lookup_message`: detalhe da ultima tentativa de verificacao/baixa oficial
- `official_lookup_at`: data/hora da ultima tentativa

Campos extraidos da fonte fiscal:

- `merchant_name`: nome do estabelecimento
- `total_amount`: valor total
- `expense_date`: data da nota
- `payment_type`: `cash`, `company_credit_card`, `personal_credit_card`, `unknown`

Campos preenchidos/editados pelo usuario:

- `owner_user_id`: usuario dono da despesa
- `client_record_id`: cliente relacionado, ou nulo se for despesa da empresa
- `is_company_expense`: booleano
- `expense_type_record_id`: tipo de gasto
- `reimbursement_date`: data de reembolso
- `is_reimbursed`: booleano
- `description`: texto livre

Controle:

- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`

### Tabela `fiscal_document_fetches` opcional

Registro de auditoria das tentativas de consulta oficial ou por provedor fiscal.

Campos:

- `id`
- `expense_id`
- `access_key`
- `document_type`
- `provider`: `sefaz_dfe`, `portal_manual`, `third_party`, `none`
- `status`: `pending`, `found`, `not_found`, `requires_certificate`, `not_authorized`, `failed`
- `request_payload`: XML/JSON da requisicao, sem segredos
- `response_summary`: resumo sanitizado da resposta
- `error_message`
- `created_at`
- `updated_at`

## Fases de Implementacao

### Fase 1: Dominio de Despesas

Criar a tabela `expenses`, relacionar com OCR/XML e permitir CRUD basico no backend.

Resultado esperado:

- Despesa criada automaticamente a partir de um OCR concluido para cupons/recibos sem XML.
- Despesa criada a partir do XML quando o documento for NF-e modelo 55.
- API para listar, detalhar, editar e excluir despesas.
- Resultado bruto do OCR preservado em `raw_ocr_json` quando aplicavel.
- XML fiscal preservado em `raw_xml` quando o documento for NF-e modelo 55.

Prompt para agente LLM:

```text
Voce esta trabalhando no repositorio open-receipt-ocr. Implemente o dominio de despesas no backend NestJS.

Contexto atual:
- O backend usa TypeORM com SQLite.
- As entidades atuais de OCR ficam em server/src/core/database/entities.
- O resultado bruto do OCR fica em OcrExecutionEntity.ocrData.
- O upload e processamento de OCR ja existem no modulo OcrJobsModule.

Tarefas:
1. Criar ExpenseEntity com os campos: id, ocrJobId nullable, ocrFileId nullable, ocrExecutionId nullable, documentType, sourceType, rawOcrJson nullable, rawXml nullable, xmlAccessKey nullable, merchantName, totalAmount, expenseDate, paymentType, ownerUserId nullable por enquanto, clientRecordId nullable, isCompanyExpense, expenseTypeRecordId nullable, reimbursementDate nullable, isReimbursed, description nullable, createdByUserId nullable, updatedByUserId nullable, createdAt, updatedAt.
2. Criar ExpenseDao seguindo o padrao dos DAOs existentes.
3. Criar ExpensesModule, ExpensesService e ExpensesController.
4. Criar endpoints: GET /api/expenses, GET /api/expenses/:id, PATCH /api/expenses/:id, DELETE /api/expenses/:id.
5. Adicionar filtros iniciais em GET /api/expenses: periodo por expenseDate, isReimbursed, reimbursementDate, clientRecordId, expenseTypeRecordId e ownerUserId.
6. Adicionar enums compartilhados em packages/types: FiscalDocumentType com nfe_model_55, consumer_invoice, receipt, unknown; ExpenseSourceType com xml, ocr_json, manual.
7. Registrar a entidade no TypeOrmConfigService.
8. Adicionar tipos compartilhados em packages/types quando fizer sentido.
9. Criar testes focados para service/controller ou e2e cobrindo listagem e edicao.

Regras:
- Mantenha o padrao de codigo existente.
- Nao remova ou reestruture o modulo OCR atual.
- Use DTOs com class-validator.
- Preserve rawOcrJson como texto/JSON serializado para compatibilidade com SQLite.
- Para NF-e modelo 55, considere o XML como documento valido e obrigatorio; OCR/JSON nao deve ser tratado como fonte fiscal canonica desse tipo de documento.
- Para cupom fiscal/recibo sem XML, rawOcrJson pode ser a fonte persistida.
```

### Fase 2: Consulta Fiscal Oficial e Baixa de XML Quando Possivel

Criar um modulo para tentar verificar ou baixar dados oficiais antes de confiar apenas no OCR.

Resultado esperado:

- Se a nota tiver chave de acesso, o sistema tenta identificar o tipo do documento fiscal.
- Para NF-e modelo 55, o sistema tenta obter/validar XML oficial quando houver certificado/autorizacao.
- Se nao for possivel baixar o XML oficialmente, o sistema registra o motivo e solicita upload manual do XML quando ele for obrigatorio.
- Para cupom fiscal/NFC-e/recibo, a consulta oficial pode ser tentada quando houver meio disponivel, mas o OCR JSON continua sendo fallback aceitavel quando nao houver XML.

Prompt para agente LLM:

```text
Implemente um modulo de consulta fiscal oficial para verificar ou baixar dados oficiais de documentos fiscais quando possivel.

Contexto:
- NF-e modelo 55 deve usar XML como fonte canonica.
- OCR/JSON pode ser fonte persistida para cupom fiscal/recibo quando XML oficial nao estiver disponivel.
- Nao assuma que existe uma API publica simples da Receita Federal para baixar qualquer XML apenas pela chave de acesso.
- O caminho oficial para DF-e/NF-e normalmente envolve SEFAZ/Ambiente Nacional, certificado digital ICP-Brasil, SOAP/mTLS e autorizacao do participante da nota.

Tarefas:
1. Criar FiscalDocumentsModule e FiscalDocumentsService.
2. Criar FiscalDocumentFetchEntity opcional para auditar tentativas de consulta/baixa.
3. Criar enums FiscalFetchStatus e FiscalLookupProvider em packages/types.
4. Implementar uma interface FiscalDocumentProvider com metodos lookupByAccessKey e downloadXmlByAccessKey.
5. Criar provider inicial SefazDfeProvider preparado para Distribuicao DF-e com certificado A1, SOAP, XML e mTLS; se a integracao completa for grande demais, criar a interface, DTOs, configuracoes e stub com erro controlado requires_certificate.
6. Suportar configuracoes por ambiente: FISCAL_LOOKUP_ENABLED, FISCAL_PROVIDER, FISCAL_CERT_PATH, FISCAL_CERT_PASSWORD, FISCAL_CNPJ, FISCAL_UF.
7. Ao importar uma imagem/PDF, tentar extrair chave de acesso de 44 digitos do OCR; se encontrada, chamar o fiscal lookup antes de criar a despesa final.
8. Ao importar XML manualmente, validar se e NF-e modelo 55 e persistir rawXml.
9. Atualizar ExpenseEntity com officialLookupStatus, officialLookupMessage e officialLookupAt.
10. Registrar claramente quando a baixa oficial falhar por falta de certificado, falta de autorizacao, nota nao encontrada ou erro tecnico.
11. Adicionar testes unitarios para deteccao de chave de acesso, status de lookup e comportamento quando o XML e obrigatorio.

Regras:
- Nunca armazene senha de certificado em logs ou response_summary.
- Nao tente burlar captcha, scraping ou restricoes de portais publicos.
- Se for usar API fiscal terceirizada, encapsule atras de FiscalDocumentProvider para permitir troca futura.
- Para NF-e modelo 55 sem XML baixado/importado, marque a despesa como pendente de XML e nao trate OCR como fonte fiscal canonica.
```

### Fase 3: Extracao Estruturada a Partir de XML e OCR

Criar um servico para transformar XML fiscal ou OCR bruto em campos da despesa.

Resultado esperado:

- Ao receber uma NF-e modelo 55, o sistema usa o XML como fonte valida para extrair estabelecimento, valor total, data e forma de pagamento.
- Ao concluir uma execucao OCR de cupom/recibo, o sistema tenta extrair estabelecimento, valor total, data e forma de pagamento a partir do JSON/texto bruto.
- Os campos ficam editaveis posteriormente.
- A extracao deve ser tolerante a falhas.

Prompt para agente LLM:

```text
Implemente a extracao estruturada de despesas a partir de XML fiscal e do resultado OCR.

Contexto:
- OcrExecutionEntity.ocrData contem o resultado bruto do OCR.
- ExpenseEntity ja existe.
- Para NF-e modelo 55, o documento valido e sempre o XML; OCR pode ajudar na interface, mas nao deve substituir o XML.
- Diferentes providers retornam formatos diferentes; o frontend ja possui parsers em client/src/app/pipes/parsers, mas esta extracao deve ficar no backend.

Tarefas:
1. Criar ExpenseExtractionModule e ExpenseExtractionService.
2. Criar uma interface ExtractedExpenseData com documentType, sourceType, merchantName, totalAmount, expenseDate, paymentType, xmlAccessKey opcional e confidence opcional por campo.
3. Criar um parser para XML de NF-e modelo 55 usando parser XML estruturado, nao regex. Extrair ao menos: chave de acesso quando disponivel, emitente/nome do estabelecimento, valor total, data de emissao e forma de pagamento quando existir.
4. Implementar heuristicas iniciais para cupons/recibos brasileiros vindos de OCR:
   - merchantName: primeiras linhas relevantes, evitando CNPJ, endereco e chaves longas.
   - totalAmount: priorizar termos como "valor total", "total", "valor a pagar".
   - expenseDate: reconhecer formatos dd/mm/yyyy, dd/mm/yy e datas ISO.
   - paymentType: detectar dinheiro, cartao de credito, cartao empresa/pessoal quando houver texto indicativo; usar unknown se incerto.
5. Integrar a criacao de ExpenseEntity quando uma OcrExecution for concluida com sucesso para fontes OCR.
6. Integrar com FiscalDocumentsService para usar XML baixado/importado antes do OCR quando documentType for nfe_model_55.
7. Criar fluxo para criar ExpenseEntity a partir de upload/importacao de XML.
8. Garantir que uma execucao OCR nao crie despesas duplicadas e que XMLs de NF-e nao sejam duplicados pela mesma xmlAccessKey.
9. Salvar o OCR bruto completo em rawOcrJson quando sourceType for ocr_json.
10. Salvar o XML completo em rawXml quando sourceType for xml.
11. Adicionar testes unitarios com exemplos reais/sinteticos de OCR e XML de NF-e modelo 55.

Regras:
- Nao usar regex fragil isolada quando for melhor normalizar texto primeiro.
- Para XML, use parser XML e trate namespaces/estruturas comuns da NF-e.
- Se a extracao OCR falhar, ainda criar a despesa com rawOcrJson e campos nulos/unknown.
- Se uma NF-e modelo 55 for identificada sem XML, sinalize que falta o documento fiscal valido em vez de salvar OCR como fonte canonica.
- Documentar no codigo apenas os pontos de heuristica nao obvios.
```

### Fase 4: Cadastros Genericos

Criar a tabela `records` para clientes e tipos de gasto.

Resultado esperado:

- Clientes cadastraveis por usuarios.
- Tipos de gasto cadastraveis apenas por admin futuramente.
- Despesas relacionadas por ID a cliente e tipo de gasto.

Prompt para agente LLM:

```text
Implemente o modulo de cadastros genericos chamado Records.

Tarefas:
1. Criar RecordEntity com id, name, type, createdByUserId nullable por enquanto, isActive, createdAt e updatedAt.
2. Criar enum RecordType com valores client e expense_type em packages/types.
3. Criar RecordsModule, RecordsService, RecordsController e RecordDao.
4. Criar endpoints: GET /api/records, POST /api/records, PATCH /api/records/:id, DELETE ou PATCH isActive.
5. Permitir filtros por type, search e isActive.
6. Relacionar ExpenseEntity com RecordEntity nos campos clientRecordId e expenseTypeRecordId.
7. Adicionar validacoes para impedir tipo invalido.
8. Adicionar testes de criacao, listagem filtrada e atualizacao.

Regras:
- Ainda nao implemente permissoes se Auth nao existir; deixe o service preparado para receber user context depois.
- Prefira desativacao logica com isActive em vez de apagar registros usados por despesas.
```

### Fase 5: Usuarios, Login e Permissoes

Adicionar autenticacao e controle de acesso.

Resultado esperado:

- Login com email/senha.
- Criacao de usuario.
- Alteracao de senha.
- Admin pode gerenciar usuarios e permissoes.
- Usuario normal ve apenas suas despesas.
- Admin ve todas e pode atribuir despesa a outro usuario.

Prompt para agente LLM:

```text
Implemente autenticacao e autorizacao no projeto.

Tarefas:
1. Criar UserEntity com id, name, email unico, passwordHash, role, isActive, createdAt, updatedAt.
2. Criar UserRole em packages/types com admin e user.
3. Criar UsersModule com CRUD administrativo basico.
4. Criar AuthModule com login, registro inicial de usuario e alteracao de senha.
5. Usar hash seguro de senha com bcrypt ou argon2.
6. Implementar JWT access token e guard NestJS.
7. Criar decorators/guards para usuario autenticado e role admin.
8. Proteger endpoints de expenses, records e users.
9. Aplicar regras:
   - Usuario normal lista apenas despesas com ownerUserId igual ao seu id.
   - Admin lista todas.
   - Admin pode alterar ownerUserId.
   - Usuario normal pode criar/editar clientes.
   - Apenas admin pode criar/editar tipos de gasto.
10. Criar seed opcional para primeiro admin via variaveis de ambiente.
11. Adicionar testes para login, acesso negado e acesso admin.

Regras:
- Nao retornar passwordHash em nenhuma API.
- Validar email unico.
- Manter endpoints publicos apenas para login e criacao de usuario se o produto exigir auto-cadastro.
```

### Fase 6: Frontend de Login e Sessao

Criar experiencia de autenticacao no Angular.

Resultado esperado:

- Tela de login.
- Criacao de usuario.
- Alteracao de senha.
- Menu com usuario logado e logout.
- Rotas protegidas.

Prompt para agente LLM:

```text
Implemente o frontend de autenticacao em Angular.

Contexto:
- O app usa Angular standalone components, PrimeNG e Transloco.
- As rotas ficam em client/src/app/app.routes.ts.
- O layout principal fica em client/src/app/layouts/shell.

Tarefas:
1. Criar AuthService para login, logout, persistencia de token e usuario atual.
2. Criar interceptador HTTP para enviar Authorization Bearer.
3. Criar auth guard para proteger rotas internas.
4. Criar LoginPage com formulario de email/senha.
5. Criar fluxo de criar usuario conforme endpoints do backend.
6. Criar tela/dialog de alterar senha.
7. Mostrar usuario logado e botao de logout no shell layout.
8. Redirecionar usuario nao autenticado para /login.
9. Adicionar mensagens de erro claras para credenciais invalidas.
10. Atualizar traducoes em pt/en quando necessario.

Regras:
- Seguir o padrao visual atual do app.
- Nao expor token em tela.
- Usar reactive forms para validacao.
```

### Fase 7: Importacao de Despesas

Evoluir a tela de OCR para uma aba de importacao de despesas.

Resultado esperado:

- Aba/tela "Importar despesas".
- Upload de nota fiscal em imagem, PDF ou XML.
- Se imagem, sugerir recorte da area da nota antes do envio.
- Salvar imagem em pasta organizada pela aplicacao.
- Se houver XML, criar a despesa diretamente a partir dele.
- Se houver imagem/PDF, executar OCR, tentar detectar chave de acesso e consultar dados oficiais quando possivel.
- Se for identificada NF-e modelo 55 sem XML baixado/importado, marcar a despesa como pendente de XML em vez de tratar OCR como fonte canonica.
- Apos OCR/XML/consulta fiscal, criar ou atualizar a despesa automaticamente.

Prompt para agente LLM:

```text
Crie a experiencia de importacao de despesas no frontend e integre com o backend existente de OCR.

Tarefas:
1. Criar rota /expenses/import.
2. Reaproveitar ou adaptar UploadDialogComponent para importacao de despesas.
3. Para imagens, usar o componente existente de crop quando aplicavel, sugerindo o corpo da nota fiscal antes do upload.
4. Permitir usuario escolher provider OCR.
5. Apos upload, exibir status de processamento.
6. Quando a despesa for criada, direcionar para a tela de edicao/detalhe da despesa.
7. No backend, garantir que o storage local organize arquivos em uma estrutura previsivel, por exemplo data/uploads/YYYY/MM ou data/uploads/user-{id}/YYYY/MM.
8. Aceitar upload de XML fiscal e enviar para o fluxo de importacao XML.
9. Se o backend retornar pendencia de XML para NF-e modelo 55, exibir estado claro para o usuario anexar o XML.
10. Adicionar testes ou validacoes manuais documentadas para upload de PNG, JPEG, PDF e XML.

Regras:
- Nao duplicar logica de upload sem necessidade; extraia componentes comuns se isso reduzir complexidade real.
- A sugestao de recorte pode comecar manual/assistida, usando o cropper ja existente; deteccao automatica pode ficar para uma fase posterior.
```

### Fase 8: Tela Principal de Despesas

Criar listagem, filtros e edicao de despesas.

Resultado esperado:

- Aba/tela "Visualizar despesas".
- Filtros por periodo, cliente, reembolsadas, data de reembolso e tipo de gasto.
- Edicao dos campos extraidos e campos preenchidos pelo usuario.
- Checkbox para selecao de despesas.

Prompt para agente LLM:

```text
Implemente a tela de visualizacao e edicao de despesas.

Tarefas:
1. Criar rota /expenses.
2. Criar ExpenseService no frontend.
3. Criar tabela PrimeNG com paginacao, ordenacao e selecao por checkbox.
4. Adicionar filtros:
   - periodo por data da despesa
   - reembolsadas/somente pendentes/todas
   - cliente
   - tipo de gasto
   - data de reembolso
5. Permitir edicao de merchantName, totalAmount, expenseDate, paymentType, clientRecordId, isCompanyExpense, expenseTypeRecordId, reimbursementDate, isReimbursed e description.
6. Para admin, permitir alterar ownerUserId.
7. Para usuario normal, ocultar ou bloquear campos administrativos.
8. Criar detalhe lateral ou dialog para edicao completa.
9. Atualizar traducoes.
10. Adicionar testes de componente/service quando viavel.

Regras:
- A tela deve ser densa e eficiente, com foco em trabalho recorrente.
- Evite cards decorativos; priorize tabela, filtros compactos e acoes claras.
- O estado dos filtros deve sobreviver a refresh via query params ou localStorage.
```

### Fase 9: Relatorios

Gerar relatorio com base nos filtros ou despesas selecionadas.

Resultado esperado:

- Botao "Gerar relatorio".
- Relatorio contem lista de despesas, total geral e total por tipo de despesa.
- Pode gerar usando filtros ativos ou apenas itens selecionados.

Prompt para agente LLM:

```text
Implemente relatorios de despesas.

Tarefas:
1. Criar endpoint POST /api/reports/expenses/preview que recebe filtros ou lista de expenseIds.
2. Retornar lista de despesas, totalAmount geral e breakdown por expenseTypeRecordId/nome.
3. Criar ReportsService no backend.
4. No frontend, adicionar botao Gerar relatorio na tela /expenses.
5. Se houver despesas selecionadas, perguntar se o relatorio deve usar selecionadas ou filtros ativos.
6. Exibir relatorio em dialog ou rota dedicada.
7. Permitir exportacao inicial em CSV; PDF pode ser fase posterior.
8. Garantir que usuario normal nao consiga incluir despesas de outros usuarios.
9. Adicionar testes de permissao e calculo dos totais.

Regras:
- Calculos monetarios devem evitar erro de ponto flutuante; prefira armazenar centavos como inteiro ou normalize com cuidado.
- O total por tipo deve agrupar despesas sem tipo em "Sem tipo".
```

### Fase 10: Melhorias de Qualidade e Producao

Consolidar estrutura, migrations, seguranca e observabilidade.

Prompt para agente LLM:

```text
Prepare o projeto para uso mais robusto em producao.

Tarefas:
1. Substituir TypeORM synchronize por migrations versionadas.
2. Criar migrations para OCR, users, records e expenses.
3. Revisar variaveis de ambiente e exemplos .env.
4. Adicionar validacao centralizada de configuracao.
5. Adicionar logs mais claros para criacao de despesas e falhas de extracao.
6. Adicionar indices em expenses para ownerUserId, expenseDate, reimbursementDate, clientRecordId, expenseTypeRecordId e isReimbursed.
7. Revisar integracao fiscal oficial, certificados, limites de consulta, armazenamento seguro e logs sanitizados.
8. Revisar Dockerfile para incluir dependencias necessarias sem instalar pacotes pesados em runtime quando possivel.
9. Adicionar documentacao de uso no README.
10. Adicionar testes e2e principais: login, upload, criacao de despesa, filtro e relatorio.

Regras:
- Nao quebrar o fluxo atual de Docker Compose.
- Manter compatibilidade com SQLite, mas deixar caminho claro para Postgres se o projeto crescer.
```

## Decisoes Recomendadas

### Armazenar valores monetarios como inteiro

Recomenda-se armazenar `total_amount_cents` como inteiro em vez de `total_amount` decimal. Isso evita erros de arredondamento em relatorios. Se o campo `total_amount` ja for criado primeiro, planejar migracao posterior.

### Criar despesas a partir de arquivos, nao apenas jobs

Um `ocr_job` pode conter varios arquivos. Cada arquivo deve poder gerar uma despesa separada. Por isso `expenses` deve relacionar `ocr_file_id` e `ocr_execution_id`.

### Preservar OCR bruto sempre

Mesmo quando a extracao estruturada falhar, a aplicacao deve guardar o JSON/texto bruto. Isso permite corrigir heuristicas depois sem perder informacao.

### Usar XML como fonte canonica para NF-e modelo 55

Quando o documento fiscal for uma NF-e modelo 55, o XML deve ser armazenado em `raw_xml` e usado como fonte valida para extracao e auditoria. Imagem, PDF ou OCR podem ser anexos auxiliares, mas nao devem substituir o XML nesse caso. Para cupom fiscal/recibo sem XML disponivel, `raw_ocr_json` pode ser a fonte persistida.

### Baixar dados oficiais somente quando houver meio autorizado

O sistema deve tentar verificacao/baixa oficial quando houver chave de acesso e configuracao adequada, mas nao deve assumir que qualquer XML pode ser baixado livremente pela chave. Para NF-e/DF-e, o caminho oficial normalmente depende de certificado digital ICP-Brasil, comunicacao SOAP/mTLS com ambiente SEFAZ/Ambiente Nacional e autorizacao do participante do documento. Quando a baixa oficial nao for possivel, registrar o motivo e solicitar upload manual do XML quando ele for obrigatorio.

### Separar cliente de despesa da empresa

Usar `client_record_id` nulo junto com `is_company_expense=true` para despesas da propria empresa. Isso evita criar um "cliente fake" chamado Empresa.

### Comecar com recorte manual assistido

A deteccao automatica do corpo da nota e uma feature mais complexa. O projeto ja tem componente de crop; a primeira entrega deve permitir recorte manual simples e salvar a versao recortada.

## Ordem Recomendada de Execucao

1. Dominio de despesas.
2. Consulta fiscal oficial e baixa de XML quando possivel.
3. Extracao estruturada.
4. Cadastros genericos.
5. Usuarios e permissoes.
6. Login no frontend.
7. Importacao de despesas.
8. Listagem e edicao de despesas.
9. Relatorios.
10. Migrations, seguranca e producao.

Essa ordem reduz risco porque primeiro cria o dado central do produto, depois define a fonte fiscal valida, melhora extracao, aplica regras de acesso e por fim entrega a experiencia completa no frontend.
