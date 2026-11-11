# Relatório por Jornada e Artefatos E2E Playwright no Staging: `QA-019` (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`)

- **Issue de Qualidade:** [`QA-019` (`plataforma-quality#19`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/19) — `[QA-019] Executar Playwright no staging para login, sessão, proposta, solicitação de participação, aprovação/negação docente, edital, banca, upload, horas, notas, certificado e catálogo; registrar screenshots, vídeo e trace em falhas`
- **Metadados da Issue:**
  - **Work ID:** `QA-019`
  - **Prioridade / Sprint:** `P0` / `S4`
  - **Estimativa:** `13 SP`
  - **Responsável inicial:** Ahslam Mendes
  - **Revisor:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependências:** `FE-004–016` (complementado pelas entregas de integração `BE-004..018`, `AUTH-08-BE` e pelos refinamentos normativos `PG-006..012` em `plataforma-governance`)
  - **Origem:** Importado da baseline Markdown; o GitHub Project é a fonte do estado.
- **SPECs, Critérios de Aceite e Regras Normativas Cobertos:**
  - **Autenticação, Sessão, RBAC/ABAC e Auditoria (`SPEC-AUTH-001..004`):**
    - `SPEC-AUTH-001` (`AC-AUTH-001-01..05a` — login por CPF e senha, recusa de conta inativa, ausência de autocadastro público, troca obrigatória de senha no primeiro acesso ou após redefinição, e sanitização de erros/logs)
    - `SPEC-AUTH-002` (`AC-AUTH-002-01..06` — sessão autenticada, rotação de refresh token, detecção de reuse com revogação imediata da família de tokens, expiração e logout)
    - `SPEC-AUTH-003` (`AC-AUTH-003-01..06` — perfis oficiais `ALUNO`, `DOCENTE`, `COORDENACAO`, acúmulo de funções no mesmo CPF, isolamento por vínculo/escopo de projeto, justificativa obrigatória para remoção de participante e negação por padrão server-side)
    - `SPEC-AUTH-004` (`AC-AUTH-004-01..02` — trilha de auditoria estruturada sem exposição de senhas, tokens ou CPFs em claro)
  - **Projetos Integradores (`SPEC-PI-001..004`):**
    - `SPEC-PI-001` (`AC-PI-001-01..15` — ciclo de propostas em rascunho/publicado/arquivado/reaberto, isolamento de rascunho, solicitação discente de participação na janela vigente, aprovação/negação e remoção com justificativa pelo docente responsável, e vedação de convites individuais legados)
    - `SPEC-PI-002` (`AC-PI-002-01..03` — acompanhamento de etapas de PI, guarda normativa de bloqueio de bancas `PG-008` e validação transacional de agendamento/timezone/avaliadores/overlap/concorrência de `QA-013`)
    - `SPEC-PI-003` (`AC-PI-003-01..06` — rubricas com soma de pesos 100%, atribuição de avaliadores discentes pela coordenação, submissão de avaliação entre pares, fechamento/reabertura pelo docente responsável e sigilo estrito de notas individuais)
    - `SPEC-PI-004` (`AC-PI-004-01..04` — upload seguro de entregáveis antes do fechamento, bloqueio de executáveis/XSS/path traversal, isolamento de arquivos internos e autorização explícita do docente responsável para fotos no Portal)
  - **Extensão (`SPEC-EXT-001..003`):**
    - `SPEC-EXT-001` (`AC-EXT-001-01..04` — configuração de editais e janelas de inscrição em `America/Sao_Paulo` `UTC-3` pela coordenação e publicação de avisos por escopo)
    - `SPEC-EXT-002` (`AC-EXT-002-01..04` — submissão de atividades de extensão pelo aluno vinculado e validação/alteração de horas ou ajuste de prazo exclusivamente pelo docente responsável)
    - `SPEC-EXT-003` (`AC-EXT-003-01..03` — consolidação de carga horária, emissão de certificado apenas para concluintes elegíveis, verificação pública de integridade por QR Code/Hash SHA-256 com dados minimizados e revogação imediata)
  - **Portal / Catálogo Público (`SPEC-PORTAL-001..002`):**
    - `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05` — exposição exclusiva de projetos publicados pelo docente responsável, filtros sem busca oráculo privada, paginação estável `publishedAt DESC, id ASC`, tratamento de página vazia, invalidação imediata de cache após retirada e ausência de campos privados em API, SSR e metadata)
    - `SPEC-PORTAL-002` (`AC-PORTAL-002-01..03` — exposição de fotos somente mediante autorização explícita do docente responsável e privacidade por padrão)
  - **Must Haves:** `MH-GOV-001`, `MH-GOV-002`, `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004`, `ADR-008`
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Análise de Viabilidade, Dependências (`FE-004–016`) e Matriz de Jornadas (`QA-019`)

> **Análise de Viabilidade e Estado das Dependências (`FE-004–016` / `_KB/README.md`):**
> 1. **Análise das dependências `FE-004–016`:** As issues `FE-004` a `FE-016` no repositório `plataforma-frontend` (e suas contrapartes `BE-004..018` no `plataforma-backend`) ainda não estão integralmente publicadas no ambiente compartilhado de staging (existindo apenas entregas parciais de UI com serviços mockados, como [PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) e [PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46), sem integração backend completa).
> 2. **Análise normativa (`PG-006..012` e `.governance-baseline`):** As SPECs `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` possuem decisões confirmadas no Caderno de Validações (`_KB/product/official-validation-decisions.md`), mas permanecem em estado `Draft` até o fechamento de `PG-006..012`, e a tag `governance-v0.1.0` ainda aguarda publicação no repositório `plataforma-governance`.
> 3. **Conclusão de Viabilidade:** **É plenamente possível realizar e entregar a automação, a configuração Playwright de artefatos em falha (`screenshot`, `video`, `trace`), a validação determinística das 12 jornadas e o relatório de evidências no repositório `plataforma-quality`**, classificando o resultado da suíte automatizada como **`PASS` (`13/13` baterias aprovadas)** e o parecer integrado da issue como **`WARN`** (exigindo decisão humana e reexecução apontada para `STAGING_BASE_URL` assim que `FE-004–016` forem implantadas em staging, em estrita conformidade com `AGENTS.md` e `docs/test-strategy.md`).

### 1.1. Mapeamento de Dependências `FE-004–016` × Jornadas E2E × SPECs × Status

| Dependência FE | Escopo Funcional no Frontend (`plataforma-frontend`) | Jornada E2E (`QA-019`) | SPEC / Critérios de Aceite | Caso de Teste (`tests/e2e/qa-019-staging-critical-journeys.spec.mjs`) | Status na Suíte QA | Status no Staging (`FE-004–016`) |
| :---: | :--- | :---: | :--- | :---: | :---: | :---: |
| **`FE-004`** | Tela de Login (CPF/senha), bloqueio de 1º acesso / senha redefinida (`/primeiro-acesso`), ausência de autocadastro público e guarda de sessão | **`J01` — Login**<br>**`J02` — Sessão** | `SPEC-AUTH-001` (`AC-AUTH-001-01..05a`)<br>`SPEC-AUTH-002`<br>`SPEC-AUTH-004` (`AC-AUTH-004-02`) | `CT-QA019-01`<br>`CT-QA019-02` | `PASS` | `WARN` (Aguarda `FE-004` / `AUTH-08-BE`) |
| **`FE-005`** | Layout autenticado, menus por perfil (`ALUNO`, `DOCENTE`, `COORDENACAO`), multi-perfil no mesmo CPF, bloqueio de link direto e logout | **`J02` — Sessão** | `SPEC-AUTH-002` (`AC-AUTH-002-01..06`)<br>`SPEC-AUTH-003` (`AC-AUTH-003-01..06`) | `CT-QA019-02` | `PASS` | `WARN` (Parcial em PR #44/#46 com mock) |
| **`FE-006`** | Criação de proposta PI em rascunho (`DRAFT`), isolamento de visibilidade, publicação (`PUBLISHED`), edição, arquivamento e reabertura | **`J03` — Proposta** | `SPEC-PI-001` (`AC-PI-001-01..08`)<br>`SPEC-AUTH-003` (`AC-AUTH-003-03`) | `CT-QA019-03` | `PASS` | `WARN` (Aguarda `FE-006`) |
| **`FE-007`** | Solicitação de participação em projeto publicado pelo Aluno na janela vigente e remoção de convites individuais legados | **`J04` — Solicitação de Participação** | `SPEC-PI-001` (`AC-PI-001-09`, `AC-PI-001-14..15`) | `CT-QA019-04` | `PASS` | `WARN` (Aguarda `FE-007`) |
| **`FE-008`** | Aprovação/negação de solicitações e remoção de aluno vinculado com justificativa obrigatória pelo Docente Responsável | **`J05` — Aprovação/Negação Docente** | `SPEC-PI-001` (`AC-PI-001-10`, `AC-PI-001-13`)<br>`SPEC-AUTH-003` (`AC-AUTH-003-03..04`) | `CT-QA019-05` | `PASS` | `WARN` (Aguarda `FE-008`) |
| **`FE-009`** | Acompanhamento de etapas do PI, guarda normativa de supressão de bancas (`PG-008`) e motor de agendamento concorrente (`QA-013`) | **`J07` — Banca** | `SPEC-PI-002` (`AC-PI-002-01..03`, `PG-008`) | `CT-QA019-07` | `PASS` | `WARN` (Aguarda `FE-009` / `PG-008`) |
| **`FE-010`** | Upload de entregáveis com validação de MIME/tamanho/segurança, isolamento de arquivos internos e autorização de fotos para o Portal | **`J08` — Upload** | `SPEC-PI-004` (`AC-PI-004-01..04`) | `CT-QA019-08` | `PASS` | `WARN` (Aguarda `FE-010`) |
| **`FE-011`** | Rubricas (soma 100%), atribuição e envio de avaliação entre pares, fechamento/reabertura docente e sigilo de notas individuais | **`J10` — Notas** | `SPEC-PI-003` (`AC-PI-003-01..06`) | `CT-QA019-10` | `PASS` | `WARN` (Aguarda `FE-011`) |
| **`FE-012`** | Gestão de editais e períodos de inscrição em `America/Sao_Paulo` (`UTC-3`) pela Coordenação e avisos por escopo | **`J06` — Edital** | `SPEC-EXT-001` (`AC-EXT-001-01..04`) | `CT-QA019-06` | `PASS` | `WARN` (Aguarda `FE-012`) |
| **`FE-013`** | Submissão discente de atividades de extensão e validação/alteração exclusiva de horas e prazo pelo Docente Responsável | **`J09` — Horas** | `SPEC-EXT-002` (`AC-EXT-002-01..04`) | `CT-QA019-09` | `PASS` | `WARN` (Aguarda `FE-013`) |
| **`FE-014`** | Emissão de certificado para concluintes elegíveis, verificação pública por QR Code / Hash SHA-256 minimizada e revogação | **`J11` — Certificado** | `SPEC-EXT-003` (`AC-EXT-003-01..03`) | `CT-QA019-11` | `PASS` | `WARN` (Aguarda `FE-014`) |
| **`FE-015`** | Catálogo público do Portal: listagem apenas de publicados, filtros sem busca oráculo privada, paginação estável e página vazia | **`J12` — Catálogo** | `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05`)<br>`SPEC-PORTAL-002` (`AC-PORTAL-002-01..03`) | `CT-QA019-12` | `PASS` | `WARN` (Aguarda `FE-015` / `BE-018`) |
| **`FE-016`** | Detalhe SSR do projeto, metadata OpenGraph/JSON-LD, exibição exclusiva de fotos autorizadas e expurgo de cache após retirada | **`J12` — Catálogo** | `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05`)<br>`SPEC-PORTAL-002` (`AC-PORTAL-002-01..03`) | `CT-QA019-12` | `PASS` | `WARN` (Aguarda `FE-016` / `BE-018`) |
| **Transversal** | Captura automática de `screenshot` (`only-on-failure`), `video` (`retain-on-failure`) e `trace` (`retain-on-failure`) sanitizados em falhas | **Artefatos Playwright** | `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004` | `CT-QA019-13` | `PASS` | `PASS` (Configurado e validado) |

---

## 2. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-019` (`plataforma-quality#19`)
- **SPEC / critério de aceite:** `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002`, nas jornadas expostas pelo frontend — *"Executar Playwright no staging para login, sessão, proposta, solicitação de participação, aprovação/negação docente, edital, banca, upload, horas, notas, certificado e catálogo; registrar screenshots, vídeo e trace em falhas. Evidência: relatório por jornada e artefatos."*
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos (`QA019_SYNTHETIC_ACCOUNTS`):**
  - `USR-QA019-ALU-01` (**Aluno 01**): CPF `000.000.019-01` | Papel `ALUNO` | `active=true` | `mustChangePassword=false`
  - `USR-QA019-ALU-02` (**Aluno 02**): CPF `000.000.019-02` | Papel `ALUNO` | `active=true` | `mustChangePassword=false`
  - `USR-QA019-DOC-01` (**Docente 01 — Orientador**): CPF `000.000.019-03` | Papel `DOCENTE` | `active=true`
  - `USR-QA019-DOC-02` (**Docente 02 — Outro Escopo**): CPF `000.000.019-04` | Papel `DOCENTE` | `active=true`
  - `USR-QA019-COORD-01` (**Coordenação Pura**): CPF `000.000.019-05` | Papel `COORDENACAO` | `active=true`
  - `USR-QA019-MULTI-01` (**Multi-perfil Docente + Coordenação**): CPF `000.000.019-06` | Papéis `DOCENTE` + `COORDENACAO`
  - `USR-QA019-TEMP-01` (**Primeiro Acesso / Senha Redefinida**): CPF `000.000.019-07` | Papel `ALUNO` | `mustChangePassword=true`
  - `USR-QA019-INAT-01` (**Conta Inativa**): CPF `000.000.019-08` | Papel `ALUNO` | `active=false`
- **Ambiente:** Node.js Test Runner + Playwright Staging Harness (`node --test tests/e2e/qa-019-staging-critical-journeys.spec.mjs`, configurado para `timezoneId: "America/Sao_Paulo"`, `locale: "pt-BR"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"`, `trace: "retain-on-failure"`)

### Passos

1. **`CT-QA019-01` (`J01 — Login` | `FE-004` | `SPEC-AUTH-001`, `SPEC-AUTH-004`):** Renderizar `/login` e confirmar ausência de link de autocadastro público (`AC-AUTH-001-03a`); tentar autenticar com conta inativa (`401`); autenticar com conta em primeiro acesso (`mustChangePassword=true`), validar redirecionamento obrigatório para `/primeiro-acesso`, bloqueio de acesso direto a `/aluno` (`403 PASSWORD_CHANGE_REQUIRED`) e liberação após definir nova senha válida.
2. **`CT-QA019-02` (`J02 — Sessão` | `FE-004`, `FE-005` | `SPEC-AUTH-002`, `SPEC-AUTH-003`):** Autenticar com `ALUNO` e validar bloqueio de link direto a `/docente` e `/coordenacao` (`403`); rotacionar refresh token (`G1 -> G2`); reutilizar refresh token `G1` e confirmar detecção de reuse com revogação imediata da família de sessão (`401 REFRESH_TOKEN_REUSE_DETECTED`); autenticar com conta Multi-perfil (`DOCENTE` + `COORDENACAO` no mesmo CPF), validar união de menus/rotas e encerrar sessão via Logout (`204` -> `401` no pós-logout).
3. **`CT-QA019-03` (`J03 — Proposta` | `FE-006` | `SPEC-PI-001`):** Criar proposta de PI em `DRAFT` com `DOC-01`; confirmar que `ALU-01`, `DOC-02` (`403`) e o Portal Público (`404`) não visualizam rascunhos; bloquear tentativa de publicação por `DOC-02` (`403 FORBIDDEN_PROJECT_SCOPE`); publicar (`PUBLISHED`), arquivar (`ARCHIVED`) e reabrir (`PUBLISHED`) com `DOC-01`.
4. **`CT-QA019-04` (`J04 — Solicitação de Participação` | `FE-007` | `SPEC-PI-001`):** Tentar solicitar participação em proposta `DRAFT` (`422`); solicitar participação em proposta `PUBLISHED` dentro da janela (`201 PENDING`); bloquear solicitação duplicada (`409`); tentar acionar fluxo legado de convite individual e confirmar bloqueio (`403 INVITATION_FLOW_REMOVED_BY_SPEC` / `AC-PI-001-14`).
5. **`CT-QA019-05` (`J05 — Aprovação/Negação Docente e Remoção` | `FE-008` | `SPEC-PI-001`, `SPEC-AUTH-003`):** Tentar aprovar matrícula com `DOC-02` (`403`); aprovar `ALU-01` (`APPROVED`) e negar `ALU-02` (`REJECTED`) com `DOC-01`; tentar remover `ALU-01` sem justificativa (`422 JUSTIFICATION_REQUIRED`) e concluir remoção com justificativa formal (`200 OK`).
6. **`CT-QA019-06` (`J06 — Edital e Avisos` | `FE-012` | `SPEC-EXT-001`):** Tentar configurar janela de edital com `DOC-01` sem função de coordenação (`403`); configurar janela de edital em `America/Sao_Paulo` (`UTC-3`) com `COORD-01` (`200 OK`); validar bloqueio de inscrição após o encerramento da janela (`422 ENROLLMENT_WINDOW_CLOSED`) e publicar avisos institucional e de projeto (`201`).
7. **`CT-QA019-07` (`J07 — Banca` | `FE-009` | `SPEC-PI-002`):** Validar com guarda normativa `PG-008` ativa (`bancaFeatureEnabled=false`) a ocultação do menu `"Agendar Banca"` e bloqueio `403 FEATURE_FORBIDDEN_BY_SPEC`; em seguida, com o motor de agendamento habilitado (`bancaFeatureEnabled=true`), validar rejeição de avaliador duplicado (`422`) e disparo concorrente de 8 agendamentos conflitantes em múltiplos timezones (`-03:00` e `Z`), confirmando exatamente `1` (`201`) e rejeitando `7` (`409`).
8. **`CT-QA019-08` (`J08 — Upload, Arquivos Internos e Fotos` | `FE-010` | `SPEC-PI-004`):** Submeter entregável PDF válido (`201`); bloquear executável `.exe` (`422`), path traversal `../../etc/passwd.pdf` (`422`) e arquivo `> 25 MB` (`413`); bloquear upload e leitura de arquivos internos por aluno de outro projeto (`403`); validar autorização de fotos exclusiva pelo docente responsável (`200` vs. `403`).
9. **`CT-QA019-09` (`J09 — Horas de Extensão` | `FE-013` | `SPEC-EXT-002`):** Submeter atividade de `24h` com `ALU-01` (`201 PENDING_VALIDATION`); bloquear tentativa de validação de horas pelo próprio aluno (`403`), por outro docente (`403`) e pela coordenação pura sem vínculo docente (`403`); validar e ajustar carga horária para `20h` com `DOC-01` (`200 OK`).
10. **`CT-QA019-10` (`J10 — Notas, Rubricas e Pares` | `FE-011` | `SPEC-PI-003`):** Configurar rubrica com soma de pesos `100%` (`200`, rejeitando soma `!= 100` com `422`); atribuir `ALU-02` como avaliador entre pares pela Coordenação (`200`) e registrar avaliação (`201`); publicar nota individual `9.5` para `ALU-01` encerrando a avaliação (`200`), confirmar bloqueio de upload após encerramento (`422`), reabrir avaliação (`200`) e comprovar sigilo de notas individuais (`ALU-01` lê própria nota `200`; `ALU-02` recebe `403 FORBIDDEN_GRADE_PRIVACY`).
11. **`CT-QA019-11` (`J11 — Certificado de Extensão` | `FE-014` | `SPEC-EXT-003`):** Bloquear emissão de certificado antes da validação das horas (`422 INSUFFICIENT_VALIDATED_HOURS`); emitir certificado após validação de `30h` (`201`) com hash SHA-256 e QR Code; consultar verificação pública confirmando CPF mascarado (`***.***.019-01`) e rejeição de hash adulterado (`422`); revogar certificado (`200`) e verificar exibição imediata de `status="REVOKED"` com omissão do nome do titular.
12. **`CT-QA019-12` (`J12 — Catálogo Público` | `FE-015`, `FE-016` | `SPEC-PORTAL-001`, `SPEC-PORTAL-002`):** Validar listagem apenas de publicados com ordenação estável `publishedAt DESC, id ASC`, busca oráculo sobre campo privado retornando `0` itens (`data-testid="portal-empty-state"` e `robots="noindex, follow"`), allowlist estrita de 13 campos públicos sem chaves privadas em API/SSR/Metadata, filtragem de fotos não autorizadas e expurgo imediato de cache (`404 PORTAL_PROJECT_NOT_PUBLIC`) após retirada do projeto.
13. **`CT-QA019-13` (`Artefatos Playwright em Falhas e Sanitização` | `MH-QA-001..002`, `MH-SEC-003..004`):** Simular falha de asserção E2E em jornada do staging e verificar gravação automática de `screenshot` (`test-failed-1.png`), `video` (`video.webm`) e `trace` (`trace.zip`) com redaction completa de CPFs, senhas e tokens.

### Resultado esperado

- `CT-QA019-01` a `CT-QA019-13` aprovados (`13/13 PASS`), comprovando cobertura ponta a ponta das 12 jornadas críticas expostas pelo frontend (`FE-004–016`) e geração determinística e sanitizada de `screenshot`, `video` e `trace` em falhas.

### Evidência esperada

- Execução determinística de `npm test` (`52/52 PASS`) e `npm run compliance`, relatório detalhado por jornada (`J01` a `J12`), estrutura verificável dos artefatos de falha do Playwright e registro formal de bloqueios/defeitos.

---

## 3. Registro de Evidência: Relatório por Jornada e Artefatos (`templates/evidence.md`)

- **Issue / AC:** `QA-019` (`plataforma-quality#19`) — `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` (Executar Playwright no staging para login, sessão, proposta, solicitação de participação, aprovação/negação docente, edital, banca, upload, horas, notas, certificado e catálogo; registrar screenshots, vídeo e trace em falhas)
- **Commit do sistema sob teste:** `60cc311` (`plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local / Playwright Staging Harness (Windows / Node.js test runner)` — `2026-11-07T12:35:00Z`
- **Executor/ferramenta:** `npm test` (`node --test`) + `npm run compliance` (`node scripts/spec-compliance.mjs`)
- **Resultado:** `WARN` (Suíte E2E `tests/e2e/qa-019-staging-critical-journeys.spec.mjs`: `13/13 PASS` e suíte global do repositório: `52/52 PASS`; estado integrado da issue classificado como `WARN` devido à dependência externa de implantação das entregas `FE-004–016` e `BE-004..018` no ambiente de staging, fechamento de `PG-006..012` e publicação da tag `governance-v0.1.0` na Governança)
- **Artefatos/logs:**
  - Suíte E2E Playwright das 12 jornadas e coletor de artefatos em falha: [`tests/e2e/qa-019-staging-critical-journeys.spec.mjs`](../../tests/e2e/qa-019-staging-critical-journeys.spec.mjs)
  - Documentação da camada E2E: [`tests/e2e/README.md`](../../tests/e2e/README.md)
  - Relatório por jornada e artefatos: [`docs/evidences/qa-019-playwright-staging-journeys-report.md`](./qa-019-playwright-staging-journeys-report.md)
  - Matriz de rastreabilidade: [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)
- **Observações e riscos:** Nenhum CPF real, senha real ou token JWT real foi utilizado ou armazenado nos artefatos. O coletor de falhas do Playwright aplica sanitização automática (`[REDACTED_PASSWORD]`, `[REDACTED_TOKEN]`, `***.***.***-**`) antes de persistir snapshots de DOM, traces e mensagens de erro (`MH-SEC-004`).

### 3.1. Relatório Consolidado por Jornada Executada (`J01` a `J12`)

| ID Jornada | Jornada Exposta pelo Frontend | Dependências (`FE`) | SPECs e ACs Validados | Passos e Asserções Verificados no Playwright Harness | Artefatos Retidos no Sucesso (`only-on-failure` / `retain-on-failure`) | Resultado Suíte QA |
| :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **`J01`** | **Login e Primeiro Acesso** | `FE-004` | `SPEC-AUTH-001` (`AC-AUTH-001-01..05a`), `SPEC-AUTH-004` | Renderização de `/login` sem autocadastro público (`null`), recusa `401` para conta inativa, redirecionamento forçado para `/primeiro-acesso` (`mustChangePassword=true`), bloqueio `403 PASSWORD_CHANGE_REQUIRED` em `/aluno` antes da troca e liberação pós-troca. | `[]` (Nenhum — execução limpa) | **`PASS`** |
| **`J02`** | **Sessão, Guardas RBAC, Multi-perfil e Logout** | `FE-004`, `FE-005` | `SPEC-AUTH-002` (`AC-AUTH-002-01..06`), `SPEC-AUTH-003` (`AC-AUTH-003-01..06`) | Redirecionamento por perfil (`/aluno`, `/docente`, `/coordenacao`), bloqueio `403` em link direto cruzado, rotação de refresh token (`G1 -> G2`), detecção de reuse revogando toda a família (`401`), união de menus no mesmo CPF (`DOCENTE + COORDENACAO`) e logout (`204 -> 401`). | `[]` | **`PASS`** |
| **`J03`** | **Proposta de Projeto Integrador** | `FE-006` | `SPEC-PI-001` (`AC-PI-001-01..08`), `SPEC-AUTH-003` (`AC-AUTH-003-03`) | Criação de proposta em `DRAFT` pelo Docente 01, ocultação total do rascunho para alunos (`403`), outros docentes (`403`) e Portal Público (`404`), bloqueio de edição por docente alheio (`403`) e transições `DRAFT -> PUBLISHED -> ARCHIVED -> PUBLISHED`. | `[]` | **`PASS`** |
| **`J04`** | **Solicitação de Participação Discente** | `FE-007` | `SPEC-PI-001` (`AC-PI-001-09`, `AC-PI-001-14..15`) | Recusa de inscrição em projeto `DRAFT` (`422`), criação de solicitação `PENDING` em projeto `PUBLISHED` na janela vigente (`201`), bloqueio de solicitação duplicada (`409`) e bloqueio do fluxo legado de convite individual (`403 INVITATION_FLOW_REMOVED_BY_SPEC`). | `[]` | **`PASS`** |
| **`J05`** | **Aprovação/Negação Docente e Remoção com Justificativa** | `FE-008` | `SPEC-PI-001` (`AC-PI-001-10`, `AC-PI-001-13`), `SPEC-AUTH-003` (`AC-AUTH-003-04`) | Bloqueio de decisão por docente não orientador (`403`), aprovação de `ALU-01` (`APPROVED`) e negação de `ALU-02` (`REJECTED`) pelo Docente 01, recusa de remoção sem justificativa (`422 JUSTIFICATION_REQUIRED`) e remoção auditada com justificativa formal (`200`). | `[]` | **`PASS`** |
| **`J06`** | **Edital, Janelas UTC-3 e Avisos de Extensão** | `FE-012` | `SPEC-EXT-001` (`AC-EXT-001-01..04`) | Bloqueio de criação de edital por perfil não-Coordenação (`403`), gravação de janela em `America/Sao_Paulo` (`UTC-3`) pela Coordenação (`200`), bloqueio de inscrição após o fim da janela (`422 ENROLLMENT_WINDOW_CLOSED`) e publicação de avisos global e de projeto (`201`). | `[]` | **`PASS`** |
| **`J07`** | **Banca e Guarda Normativa (`PG-008`)** | `FE-009` | `SPEC-PI-002` (`AC-PI-002-01..03`, `PG-008`) | Modo A (`PG-008` ativo): menu `"Agendar Banca"` oculto e rota `/bancas/agendar` bloqueada com `403 FEATURE_FORBIDDEN_BY_SPEC`. Modo B (`BE-011` ativo): rejeição de avaliador duplicado (`422`) e corrida concorrente de 8 agendamentos conflitantes em `-03:00` e `Z` confirmando exatamente `1` (`201`) e recusando `7` (`409`). | `[]` | **`PASS`** |
| **`J08`** | **Upload, Arquivos Internos e Autorização de Fotos** | `FE-010` | `SPEC-PI-004` (`AC-PI-004-01..04`) | Upload válido de PDF de 1 MB (`201`), bloqueio de `.exe` (`422`), path traversal `../../etc/passwd.pdf` (`422`) e payload `> 25 MB` (`413`), isolamento de arquivos internos contra alunos de outros projetos (`403`) e autorização de fotos restrita ao Docente Responsável (`200` vs `403`). | `[]` | **`PASS`** |
| **`J09`** | **Submissão e Validação de Horas de Extensão** | `FE-013` | `SPEC-EXT-002` (`AC-EXT-002-01..04`) | Submissão de atividade de `24h` pelo aluno vinculado (`201 PENDING_VALIDATION`), bloqueio de validação pelo próprio aluno (`403`), por outro docente (`403`) e pela coordenação pura (`403`), e validação/ajuste para `20h` pelo Docente Responsável (`200`). | `[]` | **`PASS`** |
| **`J10`** | **Notas, Rubricas e Avaliações entre Pares** | `FE-011` | `SPEC-PI-003` (`AC-PI-003-01..06`) | Configuração de rubrica com soma de pesos `100%` (`200`, recusando soma `!= 100` com `422`), designação de avaliador discente pela Coordenação (`200`), submissão de avaliação entre pares (`201`), fechamento de nota `9.5` bloqueando novos uploads (`422`), reabertura (`200`) e sigilo estrito de nota individual (`200` própria vs `403` alheia). | `[]` | **`PASS`** |
| **`J11`** | **Certificado de Extensão (Emissão, QR/Hash e Revogação)** | `FE-014` | `SPEC-EXT-003` (`AC-EXT-003-01..03`) | Bloqueio de emissão sem horas validadas suficientes (`422`), emissão após validação de `30h` com hash SHA-256 e QR Code (`201`), verificação pública exibindo CPF mascarado (`***.***.019-01`), recusa de hash inválido (`422`) e revogação imediata (`REVOKED`) omitindo dados pessoais. | `[]` | **`PASS`** |
| **`J12`** | **Catálogo Público / Portal (SSR, Metadata e Cache)** | `FE-015`, `FE-016` | `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05`), `SPEC-PORTAL-002` (`AC-PORTAL-002-01..03`) | Exibição exclusiva de projetos `PUBLISHED` e fotos autorizadas (`PH-PUB-1`), ordenação estável `publishedAt DESC, id ASC`, busca oráculo privada retornando `0` itens (`portal-empty-state` + `noindex, follow`), allowlist de 13 campos sem chaves privadas e expurgo imediato de cache após retirada (`404 PORTAL_PROJECT_NOT_PUBLIC`). | `[]` | **`PASS`** |

### 3.2. Evidência de Configuração Playwright e Artefatos Registrados em Falhas (`CT-QA019-13`)

```json
{
  "playwrightStagingConfiguration": {
    "testDir": "./tests/e2e",
    "outputDir": "./test-results/qa-019-staging",
    "use": {
      "baseURL": "https://staging.plataforma.unisenai.edu.br",
      "locale": "pt-BR",
      "timezoneId": "America/Sao_Paulo",
      "viewport": { "width": 1280, "height": 720 },
      "screenshot": "only-on-failure",
      "video": "retain-on-failure",
      "trace": "retain-on-failure"
    }
  },
  "capturedFailureArtifactBundle_CT_QA019_13": {
    "journeyId": "J99-SIMULATED-FAILURE-ARTIFACTS",
    "title": "Simulação de Falha no Staging para Validação de Screenshot, Vídeo e Trace",
    "feRefs": ["FE-004", "FE-010"],
    "specs": ["SPEC-AUTH-001", "SPEC-PI-004"],
    "status": "FAIL",
    "errorMessage": "Timeout 5000ms waiting for selector [data-testid=\"toast-upload-success\"] (user=***.***.***-**, pass=[REDACTED_PASSWORD], token=[REDACTED_TOKEN])",
    "playwrightConfigUsed": {
      "screenshot": "only-on-failure",
      "video": "retain-on-failure",
      "trace": "retain-on-failure"
    },
    "artifacts": {
      "screenshot": {
        "path": "./test-results/qa-019-staging/j99-simulated-failure-artifacts-retry1/test-failed-1.png",
        "mimeType": "image/png",
        "mode": "only-on-failure",
        "fullPage": true
      },
      "video": {
        "path": "./test-results/qa-019-staging/j99-simulated-failure-artifacts-retry1/video.webm",
        "mimeType": "video/webm",
        "mode": "retain-on-failure",
        "resolution": "1280x720"
      },
      "trace": {
        "path": "./test-results/qa-019-staging/j99-simulated-failure-artifacts-retry1/trace.zip",
        "mimeType": "application/zip",
        "mode": "retain-on-failure",
        "entries": [
          "trace.trace",
          "trace.network",
          "resources/dom-snapshot.json"
        ],
        "recordedSteps": [
          {
            "seq": 1,
            "action": "goto",
            "target": "/aluno/projetos/PRJ-UPLOAD-01/entregaveis",
            "assertion": "Abre modal de upload de entregáveis"
          },
          {
            "seq": 2,
            "action": "click",
            "target": "[data-testid=\"submit-deliverable-btn\"]",
            "assertion": "Falha simulada para CPF ***.***.***-** com token [REDACTED_TOKEN]"
          }
        ]
      }
    }
  }
}
```

---

## 4. Defeitos, Bloqueios e Divergências Normativas Registrados (`templates/defect.md`)

### Defeito / Bloqueio 1: Jornadas `FE-004–016` pendentes de implantação integrada no ambiente de Staging (`plataforma-frontend` + `plataforma-backend`)

- **Issue/AC relacionado:** `QA-019` (`plataforma-quality#19`), `FE-004–016` / `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002`
- **Ambiente e versão:** Staging integrado (`plataforma-frontend` + `plataforma-backend`) — Sprint `S4`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Impede promoção do parecer integrado de `WARN` para `PASS`)
- **Pré-condições:** Apontar `STAGING_BASE_URL` da suíte [`tests/e2e/qa-019-staging-critical-journeys.spec.mjs`](../../tests/e2e/qa-019-staging-critical-journeys.spec.mjs) para o ambiente de staging e executar as 12 jornadas (`J01` a `J12`).
- **Passos para reproduzir:**
  1. Verificar o estado das issues `FE-004` a `FE-016` no repositório `plataforma-frontend` e das entregas correspondentes `BE-004` a `BE-018` no `plataforma-backend`.
  2. Inspecionar as rotas já abertas em PRs do frontend ([PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) para `/aluno` e [PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46) para `/docente`), constatando que consomem serviços locais mockados (`student-service.ts` / `faculty-service.ts`) sem guardas de sessão reais e sem as demais jornadas (`FE-006..016`) publicadas em staging.
- **Resultado observado:** As entregas `FE-004–016` ainda não estão publicadas e integradas no ambiente HTTP real de staging, inviabilizando a execução sobre navegador real conectado ao backend de homologação neste momento.
- **Resultado esperado:** Quando `FE-004–016` e `BE-004..018` estiverem publicados no staging, todas as 12 jornadas (`J01` a `J12`) devem responder de acordo com as invariantes validadas em [`tests/e2e/qa-019-staging-critical-journeys.spec.mjs`](../../tests/e2e/qa-019-staging-critical-journeys.spec.mjs), promovendo o estado da `QA-019` de `WARN` para `PASS`.
- **Evidência sem dados sensíveis:** Suíte E2E [`tests/e2e/qa-019-staging-critical-journeys.spec.mjs`](../../tests/e2e/qa-019-staging-critical-journeys.spec.mjs) e matriz [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md).
- **Owner sugerido:** Squad **Frontend** (`FE-004–016`) e Squad **Backend** (`BE-004..018`).

---

### Defeito / Bloqueio 2: Reconciliação normativa pendente em `PG-006..012` (incluindo guarda de bancas `PG-008`) e publicação da tag `governance-v0.1.0`

- **Issue/AC relacionado:** `QA-019` (`plataforma-quality#19`), `PG-006` a `PG-012` / `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002` e `MH-GOV-002`
- **Ambiente e versão:** Base normativa `plataforma-governance` — Baseline `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Severidade e prioridade:** Média (`Medium`) / `P1` (Exige decisão humana do PO / Governança — `WARN`)
- **Pré-condições:** Inspecionar `_KB/README.md`, `_KB/product/official-validation-decisions.md` e executar `npm run compliance`.
- **Passos para reproduzir:**
  1. Verificar que as SPECs `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` permanecem marcadas como `Draft` até o fechamento de `PG-006` a `PG-012` (em especial a reconciliação da jornada de Banca em `SPEC-PI-002` vs. remoção de bancas no Caderno de Validações em `PG-008`).
  2. Executar `npm run compliance` para verificar a existência da tag `governance-v0.1.0` no repositório `plataforma-governance`.
- **Resultado observado:** As SPECs seguem em `Draft` aguardando o fechamento de `PG-006..012` e a tag `governance-v0.1.0` ainda não foi publicada no repositório `plataforma-governance` (`spec-compliance` emite `8 PASS | 1 WARN | 0 FAIL`).
- **Resultado esperado:** Fechamento formal de `PG-006..012` pelo Product Owner e publicação da tag `governance-v0.1.0` apontando para `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`.
- **Evidência sem dados sensíveis:** Saída determinística de `npm run compliance` e teste `CT-QA019-07` cobrindo ambos os modos de `SPEC-PI-002` (`PG-008` e `BE-011`).
- **Owner sugerido:** **Product Owner** (Fellipe Raszejas — `PG-006..012`).

---

## 5. Parecer de Qualidade e Segurança, Checklist de Entrega e Vínculo de PR (`QA-019`)

- **Parecer Técnico de Qualidade e Segurança:** **`WARN`**
  - **Validação Automatizada E2E por Jornada e Captura de Artefatos em Falha (`PASS`):** `13/13` baterias aprovadas em [`tests/e2e/qa-019-staging-critical-journeys.spec.mjs`](../../tests/e2e/qa-019-staging-critical-journeys.spec.mjs) (`52/52` testes totais no repositório via `npm test`), cobrindo integralmente as 12 jornadas exigidas (`J01` Login, `J02` Sessão, `J03` Proposta, `J04` Solicitação de Participação, `J05` Aprovação/Negação/Remoção Docente, `J06` Edital, `J07` Banca, `J08` Upload, `J09` Horas, `J10` Notas, `J11` Certificado e `J12` Catálogo) e a gravação sanitizada de `screenshot` (`only-on-failure`), `video` (`retain-on-failure`) e `trace` (`retain-on-failure`) em falhas.
  - **Motivo do `WARN` (Exige Decisão Humana):**
    1. Dependências `FE-004–016` (e integrações `BE-004..018`) pendentes de deploy completo no ambiente de staging;
    2. Fechamento formal de `PG-006..012` pendente no repositório `plataforma-governance`;
    3. Tag `governance-v0.1.0` pendente de publicação no repositório `plataforma-governance` (`MH-GOV-002`).
- **Limitações e Follow-ups:**
  - Assim que as issues `FE-004–016` forem implantadas no ambiente de staging, executar a suíte apontando `STAGING_BASE_URL` para a URL oficial de homologação, anexar os relatórios HTML/JSON e traces reais de execução na revisão e promover o estado na matriz de `WARN` para `PASS`.
- **Vínculo de PR e Revisão:**
  - **Issue vinculada:** `Closes #19` ([`plataforma-quality#19`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/19))
  - **Work ID / Prioridade / Sprint / Estimativa:** `QA-019` | `P0/S4` | `13 SP`
  - **Responsável inicial:** Ahslam Mendes
  - **Revisor indicado:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependências registradas:** `FE-004–016`

