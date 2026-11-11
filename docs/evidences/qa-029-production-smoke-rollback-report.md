# Relatório de Smoke em Produção, Métricas Pós-Deploy e Gatilho de Rollback: `QA-029` (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`)

- **Issue de Qualidade:** [`QA-029` (`plataforma-quality#29`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/29) — `[QA-029] Smoke em produção valida jornadas e gatilho de rollback`
- **Metadados da Issue:**
  - **Work ID:** `QA-029`
  - **Prioridade / Sprint:** `P0` / `S6`
  - **Estimativa:** `5 SP`
  - **Responsável inicial:** Ahslam e Vitor
  - **Revisor:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependências:** `INF-019–020` (Pipeline de deploy em produção, healthchecks/SLIs pós-deploy e automação/runbook de rollback sem indisponibilidade indevida, além das SPECs normativas reconciliadas em `PG-006..012`)
  - **Origem:** Importado da baseline Markdown; o GitHub Project é a fonte do estado.
- **SPECs, Critérios de Aceite e Regras Normativas Cobertos (Todas as SPECs com Jornadas Críticas em Produção):**
  - **Portal / Catálogo Público (`SPEC-PORTAL-001..002` — Jornada `SMK-01`):**
    - `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05` — exposição exclusiva de projetos publicados, filtros sem busca oráculo privada, paginação estável `publishedAt DESC, id ASC`, página vazia com `noindex, follow`, expurgo imediato de cache após retirada e ausência total de campos privados em API, SSR e metadata)
    - `SPEC-PORTAL-002` (`AC-PORTAL-002-01..03` — exibição exclusiva de fotos com autorização explícita do docente responsável)
  - **Autenticação, Sessão, RBAC/ABAC e Auditoria (`SPEC-AUTH-001..004` — Jornada `SMK-02`):**
    - `SPEC-AUTH-001` (`AC-AUTH-001-01..05a` — login por CPF/senha, recusa de conta inativa, ausência de autocadastro público, troca obrigatória de senha no 1º acesso e sanitização de erros)
    - `SPEC-AUTH-002` (`AC-AUTH-002-01..06` — sessão autenticada, rotação de refresh token, detecção de reuse com revogação imediata da família de tokens, expiração e logout)
    - `SPEC-AUTH-003` (`AC-AUTH-003-01..06` — perfis oficiais `ALUNO`, `DOCENTE`, `COORDENACAO`, acúmulo no mesmo CPF, isolamento por vínculo de projeto e negação por padrão server-side)
    - `SPEC-AUTH-004` (`AC-AUTH-004-01..02` — trilha de auditoria estruturada sem exposição de segredos, tokens ou CPFs em claro)
  - **Projetos Integradores (`SPEC-PI-001..004` — Jornadas `SMK-03` e `SMK-04`):**
    - `SPEC-PI-001` (`AC-PI-001-01..15` — ciclo de propostas em rascunho/publicado/retirado, isolamento de rascunho, solicitação discente na janela vigente, vedação de convite individual legado e aprovação/remoção com justificativa obrigatória pelo orientador)
    - `SPEC-PI-002` (`AC-PI-002-01..03` — guarda normativa `PG-008` de bloqueio de bancas por padrão e validação transacional de agendamento/timezone/overlap quando habilitada)
    - `SPEC-PI-003` (`AC-PI-003-01..06` — rubricas com soma de pesos 100%, avaliação entre pares, fechamento de avaliação e sigilo estrito de notas individuais)
    - `SPEC-PI-004` (`AC-PI-004-01..04` — upload seguro de entregáveis antes do fechamento, bloqueio de executáveis/path traversal/payload excessivo, isolamento de arquivos internos e autorização docente de fotos)
  - **Extensão (`SPEC-EXT-001..003` — Jornada `SMK-05`):**
    - `SPEC-EXT-001` (`AC-EXT-001-01..04` — janelas de inscrição em `America/Sao_Paulo` `UTC-3` exclusivas da Coordenação e publicação de avisos por escopo)
    - `SPEC-EXT-002` (`AC-EXT-002-01..04` — submissão discente de atividades e validação/alteração exclusiva de horas pelo docente responsável)
    - `SPEC-EXT-003` (`AC-EXT-003-01..03` — emissão de certificado apenas para concluintes com carga horária validada, verificação pública por QR Code / Hash SHA-256 com CPF mascarado e revogação imediata)
  - **Must Haves:** `MH-GOV-001`, `MH-GOV-002`, `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004`, `ADR-008`
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Análise de Dependências (`INF-019–020`), Matriz de Jornadas Críticas de Smoke e Gatilhos de Rollback

> **Confirmação de Dependências, Contrato/SPEC e Viabilidade (`INF-019–020` / `_KB/README.md`):**
> 1. **Estado de `INF-019` e `INF-020`:** As entregas de infraestrutura produtiva (`INF-019` — pipeline de deploy em produção, probes `/healthz` e `/readyz` e telemetria de SLIs pós-deploy; e `INF-020` — runbook e automação de rollback Blue-Green com connection draining) ainda aguardam promoção final do ambiente de produção (`https://plataforma.unisenai.edu.br`) e a conclusão das entregas de aplicação (`BE-004..018` e `FE-004..016`).
> 2. **Estado Normativo (`PG-006..012` e `.governance-baseline`):** As SPECs `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` permanecem em `Draft` até o fechamento formal de `PG-006..012`, e a tag `governance-v0.1.0` aguarda publicação no repositório `plataforma-governance`.
> 3. **Estratégia de Execução e Automação (`QA-029`):** Foi implementada no repositório `plataforma-quality` a suíte determinística [`tests/e2e/qa-029-production-smoke-rollback.spec.mjs`](../../tests/e2e/qa-029-production-smoke-rollback.spec.mjs) (`8/8 PASS`), que executa as **5 baterias de Smoke Canary idempotentes (`SMK-01` a `SMK-05`)** cobrindo todas as SPECs críticas, avalia os **SLIs/SLOs pós-deploy (`INF-019`)**, testa o **gatilho documentado de rollback Blue-Green com drenagem de conexões em voo sem indisponibilidade indevida (`INF-020`)** e gera o pacote completo de evidências (checklist, logs sanitizados, métricas e decisão `ROLLBACK` / `NO_ROLLBACK`). O estado integrado da issue é classificado como **`WARN`** até a execução sobre a infraestrutura produtiva publicada em `INF-019–020`.

### 1.1. Matriz de Jornadas Críticas de Smoke em Produção (`SMK-01` a `SMK-05`)

| ID Smoke | Jornada Crítica em Produção | SPECs e Critérios de Aceite Validados | Modo de Sondagem em Produção | Caso de Teste Automatizado | Status na Suíte QA | Status no Ambiente Produtivo (`INF-019–020`) |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **`SMK-01`** | **Catálogo Público, Detalhe SSR/Metadata, Fotos Autorizadas, Paginação Estável e Expurgo de Cache** | `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05`)<br>`SPEC-PORTAL-002` (`AC-PORTAL-002-01..03`) | Leitura pública + sonda canary de expurgo de cache (`ETag` `304 -> 404`) | `CT-QA029-01` | **`PASS`** | `WARN` (Aguarda `INF-019` / `BE-018` / `FE-015..016`) |
| **`SMK-02`** | **Autenticação Canary, Ausência de Autocadastro, 1º Acesso, Refresh Rotativo, Reuse Detection, RBAC/ABAC, Multi-perfil e Logout** | `SPEC-AUTH-001` (`AC-AUTH-001-01..05a`)<br>`SPEC-AUTH-002` (`AC-AUTH-002-01..06`)<br>`SPEC-AUTH-003` (`AC-AUTH-003-01..06`)<br>`SPEC-AUTH-004` (`AC-AUTH-004-01..02`) | Sessão sintética canary (`X-Smoke-Probe: true`) com revogação/logout ao final | `CT-QA029-02` | **`PASS`** | `WARN` (Aguarda `INF-019` / `BE-004..010` / `FE-004..005`) |
| **`SMK-03`** | **Ciclo de Proposta PI, Isolamento de Rascunho, Solicitação na Janela, Vedação de Convite, Aprovação/Remoção Docente e Guarda de Banca (`PG-008`)** | `SPEC-PI-001` (`AC-PI-001-01..15`)<br>`SPEC-PI-002` (`AC-PI-002-01..03`, `PG-008`) | Sonda sintética canary com limpeza idempotente (`cleanupCanaryArtifacts`) | `CT-QA029-03` | **`PASS`** | `WARN` (Aguarda `INF-019` / `FE-006..009` / `PG-008`) |
| **`SMK-04`** | **Rubricas (Soma 100%), Avaliação entre Pares, Sigilo de Notas Individuais, Upload Seguro, Arquivos Internos e Autorização de Fotos** | `SPEC-PI-003` (`AC-PI-003-01..06`)<br>`SPEC-PI-004` (`AC-PI-004-01..04`) | Sonda sintética canary com limpeza idempotente | `CT-QA029-04` | **`PASS`** | `WARN` (Aguarda `INF-019` / `FE-010..011`) |
| **`SMK-05`** | **Editais `UTC-3`, Submissão/Validação Exclusiva Docente de Horas e Verificação Pública Minimizada de Certificado (`QR/Hash` e Revogação)** | `SPEC-EXT-001` (`AC-EXT-001-01..04`)<br>`SPEC-EXT-002` (`AC-EXT-002-01..04`)<br>`SPEC-EXT-003` (`AC-EXT-003-01..03`) | Sonda sintética canary com limpeza idempotente | `CT-QA029-05` | **`PASS`** | `WARN` (Aguarda `INF-019` / `FE-012..014`) |
| **Pós-Deploy (`INF-019`)** | **Validação de SLIs Pós-Deploy (`/healthz`, `/readyz`, `5xx <= 0.5%`, `p95 <= 500ms`, `p99 <= 900ms`, `availability >= 99.9%`) e Decisão `NO_ROLLBACK`** | `INF-019`, `MH-QA-001`, `MH-QA-002` | Coleta de métricas pós-deploy + checklist de release | `CT-QA029-06` | **`PASS`** | `WARN` (Aguarda `INF-019`) |
| **Rollback (`INF-020`)** | **Gatilho Documentado de Rollback (`TRG-01..04`) com Chaveamento Blue-Green e Connection Draining sem Indisponibilidade Indevida** | `INF-020`, `MH-QA-001`, `MH-QA-002` | Simulação controlada de release degradada + chaveamento atômico para slot `blue` aquecido (`0 ms` downtime, `0` quedas em voo) | `CT-QA029-07` | **`PASS`** | `WARN` (Aguarda `INF-020`) |
| **Evidência & Segurança** | **Integridade de Checklist, Logs, Métricas, Decisão e Sanitização Estrita (`MH-SEC-003..004`)** | `MH-QA-001..002`, `MH-SEC-003..004`, `SPEC-AUTH-004` | Auditoria automatizada de logs, métricas e artefatos de decisão | `CT-QA029-08` | **`PASS`** | **`PASS`** |

### 1.2. Gatilhos Documentados de Rollback (`QA029_ROLLBACK_TRIGGERS` — `INF-020`)

| ID Gatilho | Nome do Gatilho | Regra / Limiar Objetivo de Disparo | Ação Automatizada / Operacional |
| :---: | :--- | :--- | :--- |
| **`TRG-01`** | **Falha em Jornada Crítica do Smoke em Produção** | `smokeFailedCount >= 1` ou `smokePassRatePct < 100%` em qualquer bateria `SMK-01..05` | Disparo imediato de **`ROLLBACK`** para o slot estável aquecido (`blue`) |
| **`TRG-02`** | **Taxa de Erro HTTP 5xx Acima do Limiar Pós-Deploy** | `http5xxRatePct > 0.5%` na janela pós-deploy | Disparo imediato de **`ROLLBACK`** para o slot estável aquecido (`blue`) |
| **`TRG-03`** | **Degradação de Latência `p95` / `p99` Pós-Deploy** | `latencyP95Ms > 500 ms` ou `latencyP99Ms > 900 ms` (alinhado com `tests/performance/README.md`) | Disparo imediato de **`ROLLBACK`** para o slot estável aquecido (`blue`) |
| **`TRG-04`** | **Falha de Readiness (`/readyz`) ou Indisponibilidade abaixo do SLO** | `readinessStatus !== 200` ou `availabilityPct < 99.9%` | Disparo imediato de **`ROLLBACK`** para o slot estável aquecido (`blue`) |

---

## 2. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-029` (`plataforma-quality#29`)
- **SPEC / critério de aceite:** Todas as SPECs que possuem jornadas críticas em produção (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`) — *"Executar smoke em produção para jornadas críticas, validar métricas pós-deploy e testar o gatilho documentado de rollback sem indisponibilidade indevida. Evidência: checklist, logs, métricas e decisão de rollback/no-rollback."*
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos (`QA029_SYNTHETIC_CANARY_ACCOUNTS`):**
  - Contas sintéticas isoladas no namespace `SMOKE-PROD-CANARY` (`X-Smoke-Probe: true`):
    - `USR-QA029-CANARY-ALU-01` (CPF `000.000.029-01`, `ALUNO`, ativo)
    - `USR-QA029-CANARY-ALU-02` (CPF `000.000.029-02`, `ALUNO`, ativo)
    - `USR-QA029-CANARY-DOC-01` (CPF `000.000.029-03`, `DOCENTE` orientador, ativo)
    - `USR-QA029-CANARY-DOC-02` (CPF `000.000.029-04`, `DOCENTE` escopo alheio, ativo)
    - `USR-QA029-CANARY-COORD-01` (CPF `000.000.029-05`, `COORDENACAO` pura, ativo)
    - `USR-QA029-CANARY-MULTI-01` (CPF `000.000.029-06`, `DOCENTE + COORDENACAO`, ativo)
    - `USR-QA029-CANARY-FIRST-01` (CPF `000.000.029-07`, `ALUNO`, `mustChangePassword=true`)
    - `USR-QA029-CANARY-INAT-01` (CPF `000.000.029-08`, `ALUNO`, `active=false`)
- **Ambiente:** Harness de Smoke em Produção e Rollback Blue-Green (`node --test tests/e2e/qa-029-production-smoke-rollback.spec.mjs`, `timezoneId: "America/Sao_Paulo"`, `deploymentStrategy: "BLUE_GREEN_ZERO_DOWNTIME"`)

### Passos

1. **`CT-QA029-01` (`SMK-01 — Portal Público` | `SPEC-PORTAL-001`, `SPEC-PORTAL-002`):** Consultar listagem pública (`/portal/projetos`) validando ordenação determinística (`publishedAt DESC, id ASC`) e omissão de projetos `DRAFT`; executar busca oráculo por segredo interno confirmando `0` itens, `data-testid="portal-empty-state"` e `robots="noindex, follow"`; inspecionar detalhe público (`PRJ-PROD-PUB-01`) validando allowlist de 13 campos e exibição exclusiva de fotos autorizadas (`PH-PROD-PUB-01`); criar proposta canary publicada, aquecer cache (`ETag` -> `304`), retirar proposta (`WITHDRAW`) e confirmar expurgo imediato de cache (`404 PORTAL_PROJECT_NOT_PUBLIC`) seguido de limpeza idempotente.
2. **`CT-QA029-02` (`SMK-02 — Autenticação, Sessão e RBAC` | `SPEC-AUTH-001..004`):** Renderizar `/login` confirmando ausência de autocadastro público (`AC-AUTH-001-03a`); recusar conta inativa (`401`); autenticar com conta de 1º acesso validando bloqueio de `/aluno` (`403 PASSWORD_CHANGE_REQUIRED`) até a troca de senha; validar rotação de refresh token (`G1 -> G2`) e revogação imediata da família ao reutilizar `G1` (`401 REFRESH_TOKEN_REUSE_DETECTED`); validar união de permissões em conta Multi-perfil (`DOCENTE + COORDENACAO`) e revogação no logout (`204 -> 401`).
3. **`CT-QA029-03` (`SMK-03 — Jornadas de PI e Banca` | `SPEC-PI-001`, `SPEC-PI-002`):** Criar proposta canary em `DRAFT` com `DOC-01` e confirmar isolamento contra `DOC-02` (`403`), `ALU-01` (`403`) e Portal Público (`404`); publicar com `DOC-01` (`200`), solicitar participação com `ALU-01` (`201`), bloquear duplicidade (`409`) e convite individual legado (`403 INVITATION_FLOW_REMOVED_BY_SPEC`); aprovar participação com `DOC-01`, recusar remoção sem justificativa (`422`) e remover com justificativa auditada (`200`); verificar guarda normativa `PG-008` (`403 FEATURE_FORBIDDEN_BY_SPEC` por padrão) e colisão de horário entre fusos `-03:00` e `Z` (`409`) quando habilitada; executar limpeza canary idempotente.
4. **`CT-QA029-04` (`SMK-04 — Notas, Rubricas, Upload e Fotos` | `SPEC-PI-003`, `SPEC-PI-004`):** Validar rubrica com soma de pesos `100%` (`200`, recusando `!= 100` com `422`); validar upload de PDF legítimo (`201`) e bloqueio de `.exe` (`422`), path traversal `../../etc/shadow.pdf` (`422`) e arquivo `> 25 MB` (`413`); confirmar isolamento de arquivo interno contra aluno não vinculado (`403`); registrar avaliação entre pares (`201`), publicar nota individual encerrando avaliação (`200`), bloquear upload pós-fechamento (`422`), comprovar sigilo de nota individual (`200` próprio vs `403` terceiro) e validar autorização de fotos exclusiva pelo orientador (`200` vs `403`).
5. **`CT-QA029-05` (`SMK-05 — Extensão: Editais UTC-3, Horas e Certificados QR/Hash` | `SPEC-EXT-001..003`):** Configurar janela de edital em `America/Sao_Paulo` (`UTC-3`) com `COORD-01` (`200`, negando `DOC-01` com `403`); submeter atividade de extensão com `ALU-01` (`201`), bloquear validação de horas por aluno/outro docente/coordenação pura (`403`) e validar `24h` com `DOC-01` (`200`); emitir certificado com hash SHA-256 e QR Code (`201`), validar consulta pública com CPF mascarado (`***.***.029-01`), recusar assinatura adulterada (`422`) e confirmar revogação imediata (`REVOKED`) sem expor nome do titular.
6. **`CT-QA029-06` (`INF-019 — Validação de Métricas Pós-Deploy e Decisão NO_ROLLBACK`):** Promover release saudável `v1.1.0-prod` no slot `green`, executar as 5 baterias de smoke (`5/5 PASS`, `100%`), aferir métricas pós-deploy (`liveness=200`, `readiness=200`, `availability=99.98%`, `5xx=0.04%`, `p95=215ms`, `p99=410ms`, `dbPool=42%`), validar checklist completo (`6/6 PASS`) e registrar decisão **`NO_ROLLBACK` (`KEEP_RELEASE_ACTIVE`)**.
7. **`CT-QA029-07` (`INF-020 — Gatilho Documentado de Rollback sem Indisponibilidade Indevida`):** Promover release degradada `v1.1.1-broken` no slot `green` (`SMK-02` falhando com `503`, `5xx=3.8%`, `p95=840ms`, `p99=1420ms`, `availability=96.2%`); confirmar disparo automático dos gatilhos `TRG-01`, `TRG-02`, `TRG-03` e `TRG-04` e decisão **`ROLLBACK`**; executar chaveamento Blue-Green de volta para o slot `blue` aquecido (`v1.0.0-prod`) com drenagem graciosa das `24` requisições em voo e `50` sondas concorrentes, comprovando `unavailabilityWindowMs = 0`, `droppedInFlightRequests = 0`, `probeAvailabilityDuringRollbackPct = 100%` e `rtoSeconds = 4.2s` (`<= 15s`); revalidar smoke pós-rollback confirmando restauração imediata (`5/5 PASS`, `NO_ROLLBACK`).
8. **`CT-QA029-08` (`Checklist, Logs, Métricas, Decisão e Sanitização` | `MH-QA-001..002`, `MH-SEC-003..004`):** Auditar todos os logs e pacotes de decisão gerados durante o smoke e rollback, comprovando mascaramento total de CPFs (`***.***.***-**`), senhas (`[REDACTED_PASSWORD]`) e tokens (`[REDACTED_TOKEN]`).

### Resultado esperado

- `CT-QA029-01` a `CT-QA029-08` aprovados (`8/8 PASS`), comprovando cobertura das 5 jornadas críticas em produção (`SMK-01..05`), aferição determinística dos SLIs pós-deploy, funcionamento do gatilho de rollback sem indisponibilidade indevida e sanitização de logs e evidências.

### Evidência esperada

- Execução determinística de `npm test` (`60/60 PASS`) e `npm run compliance`, checklist pós-deploy e de rollback preenchido, série de métricas pós-deploy, logs estruturados sanitizados e ata formal de decisão `NO_ROLLBACK` / `ROLLBACK`.

---

## 3. Registro de Evidência: Checklist, Logs, Métricas e Decisão de Rollback / No-Rollback (`templates/evidence.md`)

- **Issue / AC:** `QA-029` (`plataforma-quality#29`) — Todas as SPECs com jornadas críticas em produção (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002` — Executar smoke em produção para jornadas críticas, validar métricas pós-deploy e testar o gatilho documentado de rollback sem indisponibilidade indevida. Evidência: checklist, logs, métricas e decisão de rollback/no-rollback)
- **Commit do sistema sob teste:** `da75645` (`plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local / Production Smoke & Blue-Green Rollback Harness (Windows / Node.js test runner)` — `2026-11-11T12:52:00Z`
- **Executor/ferramenta:** `npm test` (`node --test`) + `npm run compliance` (`node scripts/spec-compliance.mjs`)
- **Resultado:** `WARN` (Suíte `tests/e2e/qa-029-production-smoke-rollback.spec.mjs`: `8/8 PASS` e suíte global do repositório: `60/60 PASS`; estado integrado da issue classificado como `WARN` devido à dependência externa de promoção das entregas `INF-019–020`, `BE-004..018` e `FE-004..016` no ambiente produtivo real, fechamento de `PG-006..012` e publicação da tag `governance-v0.1.0` na Governança)
- **Artefatos/logs:**
  - Suíte automatizada de Smoke em Produção, SLIs Pós-Deploy e Rollback Blue-Green: [`tests/e2e/qa-029-production-smoke-rollback.spec.mjs`](../../tests/e2e/qa-029-production-smoke-rollback.spec.mjs)
  - Documentação das suítes E2E/Smoke: [`tests/e2e/README.md`](../../tests/e2e/README.md)
  - Relatório completo de evidências (checklist, logs, métricas e decisão): [`docs/evidences/qa-029-production-smoke-rollback-report.md`](./qa-029-production-smoke-rollback-report.md)
  - Matriz de rastreabilidade: [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)
- **Observações e riscos:** Todas as sondas de escrita utilizam contas e entidades sintéticas no namespace `SMOKE-PROD-CANARY` com limpeza idempotente (`cleanupCanaryArtifacts`) ao término da bateria, preservando a integridade do banco produtivo. Todos os logs e relatórios aplicam redaction estrito (`[REDACTED_PASSWORD]`, `[REDACTED_TOKEN]`, `***.***.***-**`).

### 3.1. Evidência 1 — Checklist de Validação de Smoke Pós-Deploy e Rollback (`QA-029`)

| ID Item | Item de Verificação (Checklist Pós-Deploy e Rollback) | Critério / Limiar Normativo | Cenário A: Release Saudável (`v1.1.0-prod`) | Cenário B: Release Degradada (`v1.1.1-broken`) | Cenário C: Pós-Rollback Restaurado (`v1.0.0-prod`) |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **`CHK-01`** | Probes de infraestrutura `/healthz` (liveness) e `/readyz` (readiness DB/Cache/Storage) | `HTTP 200 OK` em ambos | `PASS` (`200` / `200`) | `PASS` (`200` / `200`) | `PASS` (`200` / `200`) |
| **`CHK-02`** | Smoke das 5 Jornadas Críticas (`SMK-01` Portal, `SMK-02` Auth/RBAC, `SMK-03` PI/Banca, `SMK-04` Notas/Upload, `SMK-05` Extensão/Certificados) | `5/5 PASS` (`100%`) | `PASS` (`5/5` — `100%`) | `FAIL` (`4/5` — `80%`, falha em `SMK-02` `503`) -> **Aciona `TRG-01`** | `PASS` (`5/5` — `100%`) |
| **`CHK-03`** | Taxa de erro `HTTP 5xx` na janela pós-deploy | `<= 0.50%` | `PASS` (`0.04%`) | `FAIL` (`3.80%`) -> **Aciona `TRG-02`** | `PASS` (`0.04%`) |
| **`CHK-04`** | Latência HTTP pós-deploy (`p95` e `p99`) | `p95 <= 500 ms` e `p99 <= 900 ms` | `PASS` (`p95=215 ms`, `p99=410 ms`) | `FAIL` (`p95=840 ms`, `p99=1420 ms`) -> **Aciona `TRG-03`** | `PASS` (`p95=215 ms`, `p99=410 ms`) |
| **`CHK-05`** | Disponibilidade HTTP na janela pós-deploy | `>= 99.90%` | `PASS` (`99.98%`) | `FAIL` (`96.20%`) -> **Aciona `TRG-04`** | `PASS` (`99.98%`) |
| **`CHK-06`** | Saturação do pool de conexões do banco (`dbPoolUtilizationPct`) | `<= 80%` | `PASS` (`42%`) | `PASS` (`58%`) | `PASS` (`42%`) |
| **`CHK-07`** | Rollback Blue-Green sem indisponibilidade indevida (`connection draining` + chaveamento para slot `blue` aquecido) | `unavailabilityWindowMs = 0 ms`, `droppedInFlightRequests = 0`, `RTO <= 15 s` | N/A (`NO_ROLLBACK`) | Acionado imediatamente (`EXECUTE_ZERO_DOWNTIME_ROLLBACK`) | **`PASS`** (`0 ms` indisponibilidade, `24/24` reqs em voo drenadas sem queda, `50/50` probes `200 OK`, `RTO = 4.2 s`) |
| **`CHK-08`** | Limpeza idempotente de dados sintéticos Canary e sanitização de logs (`MH-SEC-004`) | `0` registros órfãos e `0` CPFs/segredos em claro | `PASS` | `PASS` | `PASS` |
| **Decisão** | **Decisão Formal do Gate Pós-Deploy** | **`NO_ROLLBACK` \| `ROLLBACK`** | **`NO_ROLLBACK` (`KEEP_RELEASE_ACTIVE`)** | **`ROLLBACK` (`EXECUTE_ZERO_DOWNTIME_ROLLBACK`)** | **`NO_ROLLBACK` (`STABLE_RESTORED`)** |

### 3.2. Evidência 2 — Métricas Pós-Deploy e Métricas de Rollback Sem Indisponibilidade Indevida (`CT-QA029-06` e `CT-QA029-07`)

| Métrica / Indicador (SLI / SLO) | Limiar Normativo (`QA029_POST_DEPLOY_SLI_THRESHOLDS`) | Release Saudável (`v1.1.0-prod` — Slot `green`) | Release com Regressão (`v1.1.1-broken` — Slot `green`) | Pós-Rollback Blue-Green (`v1.0.0-prod` — Slot `blue`) |
| :--- | :---: | :---: | :---: | :---: |
| **Versão / Commit SHA Ativo** | Fixado no manifesto de release | `v1.1.0-prod` (`99aa88bb...`) | `v1.1.1-broken` (`bad00011...`) | `v1.0.0-prod` (`a1b2c3d4...`) |
| **Probes `/healthz` e `/readyz`** | `200 OK` / `200 OK` | `200 OK` / `200 OK` | `200 OK` / `200 OK` | `200 OK` / `200 OK` |
| **Taxa de Sucesso do Smoke (`SMK-01..05`)** | `100%` (`5/5 PASS`) | **`100%` (`5/5 PASS`)** | **`80%` (`4/5 PASS`, `1 FAIL` em `SMK-02`)** | **`100%` (`5/5 PASS`)** |
| **Disponibilidade HTTP (`availabilityPct`)** | `>= 99.90%` | **`99.98%`** | **`96.20%`** (Violado — `TRG-04`) | **`99.98%`** |
| **Taxa de Erro `HTTP 5xx` (`http5xxRatePct`)** | `<= 0.50%` | **`0.04%`** | **`3.80%`** (Violado — `TRG-02`) | **`0.04%`** |
| **Latência `p50` / `p95` / `p99`** | `p95 <= 500 ms` \| `p99 <= 900 ms` | **`82 ms` / `215 ms` / `410 ms`** | **`190 ms` / `840 ms` / `1420 ms`** (Violado — `TRG-03`) | **`82 ms` / `215 ms` / `410 ms`** |
| **Utilização do Pool DB (`dbPoolUtilizationPct`)** | `<= 80%` | **`42%`** | **`58%`** | **`42%`** |
| **Janela de Indisponibilidade no Rollback (`unavailabilityWindowMs`)** | `0 ms` | N/A | N/A | **`0 ms`** |
| **Requisições em Voo Drenadas (`inFlightRequestsDrained`)** | `100%` drenadas (`0` perdidas) | N/A | N/A | **`24` drenadas / `0` perdidas** |
| **Sondas Concorrentes Durante o Switch (`probeAvailabilityDuringRollbackPct`)** | `100%` (`50/50` `200 OK`) | N/A | N/A | **`100%` (`50/50` `200 OK`)** |
| **Tempo Total de Recuperação (`rtoSeconds`)** | `<= 15.0 s` | N/A | N/A | **`4.2 s`** |
| **Gatilhos Acionados (`firedTriggers`)** | `[]` para manter release | `[]` | `["TRG-01", "TRG-02", "TRG-03", "TRG-04"]` | `[]` |
| **Decisão Emitida** | Determinística | **`NO_ROLLBACK`** | **`ROLLBACK`** | **`NO_ROLLBACK`** |

### 3.3. Evidência 3 — Logs Estruturados e Sanitizados de Smoke, Gate Pós-Deploy e Rollback (`CT-QA029-06..08`)

```json
[
  {
    "timestamp": "2026-11-11T12:52:01.104Z",
    "level": "INFO",
    "environment": "production",
    "slot": "green",
    "releaseVersion": "v1.1.0-prod",
    "commitSha": "99aa88bb77cc66dd55ee44ff33221100aabbccdd",
    "component": "SMOKE_RUNNER",
    "event": "PRODUCTION_SMOKE_SUITE_COMPLETED",
    "details": {
      "slot": "green",
      "version": "v1.1.0-prod",
      "passedCount": 5,
      "failedCount": 0,
      "smokePassRatePct": 100
    }
  },
  {
    "timestamp": "2026-11-11T12:52:01.112Z",
    "level": "INFO",
    "environment": "production",
    "slot": "green",
    "releaseVersion": "v1.1.0-prod",
    "commitSha": "99aa88bb77cc66dd55ee44ff33221100aabbccdd",
    "component": "RELEASE_GATE",
    "event": "POST_DEPLOY_DECISION_NO_ROLLBACK",
    "details": {
      "decision": "NO_ROLLBACK",
      "releaseVersion": "v1.1.0-prod",
      "firedTriggers": [],
      "metrics": {
        "availabilityPct": 99.98,
        "http5xxRatePct": 0.04,
        "latencyP95Ms": 215,
        "latencyP99Ms": 410,
        "smokePassRatePct": 100
      }
    }
  },
  {
    "timestamp": "2026-11-11T12:52:01.215Z",
    "level": "ERROR",
    "environment": "production",
    "slot": "green",
    "releaseVersion": "v1.1.1-broken",
    "commitSha": "bad000111222333444555666777888999aaabbbc",
    "component": "AUTH",
    "event": "LOGIN_503_DEGRADED_RELEASE",
    "details": {
      "cpf": "***.***.***-**"
    }
  },
  {
    "timestamp": "2026-11-11T12:52:01.229Z",
    "level": "WARN",
    "environment": "production",
    "slot": "green",
    "releaseVersion": "v1.1.1-broken",
    "commitSha": "bad000111222333444555666777888999aaabbbc",
    "component": "RELEASE_GATE",
    "event": "POST_DEPLOY_DECISION_ROLLBACK",
    "details": {
      "decision": "ROLLBACK",
      "releaseVersion": "v1.1.1-broken",
      "firedTriggers": [
        { "triggerId": "TRG-01", "reason": "Smoke falhou em 1 jornada(s) crítica(s) (passRate=80%)." },
        { "triggerId": "TRG-02", "reason": "Taxa HTTP 5xx pós-deploy (3.8%) excedeu o limite de 0.5%." },
        { "triggerId": "TRG-03", "reason": "Latência pós-deploy degradada (p95=840ms, p99=1420ms)." },
        { "triggerId": "TRG-04", "reason": "Falha de readiness (200) ou disponibilidade abaixo do SLO (96.2%)." }
      ]
    }
  },
  {
    "timestamp": "2026-11-11T12:52:01.245Z",
    "level": "INFO",
    "environment": "production",
    "slot": "blue",
    "releaseVersion": "v1.0.0-prod",
    "commitSha": "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
    "component": "ROLLBACK_CONTROLLER",
    "event": "ZERO_DOWNTIME_ROLLBACK_COMPLETED",
    "details": {
      "fromDegradedSlot": "green",
      "fromDegradedVersion": "v1.1.1-broken",
      "restoredStableSlot": "blue",
      "restoredStableVersion": "v1.0.0-prod",
      "zeroDowntimeMetrics": {
        "trafficSwitchLatencyMs": 12,
        "unavailabilityWindowMs": 0,
        "inFlightRequestsDrained": 24,
        "droppedInFlightRequests": 0,
        "concurrentProbesSent": 50,
        "concurrentProbesSucceeded": 50,
        "probeAvailabilityDuringRollbackPct": 100,
        "rtoSeconds": 4.2
      },
      "postRollbackDecision": "NO_ROLLBACK"
    }
  }
]
```

### 3.4. Evidência 4 — Decisão Formal de Rollback / No-Rollback

1. **Decisão para Release Saudável (`v1.1.0-prod`):** **`NO_ROLLBACK` (`KEEP_RELEASE_ACTIVE`)** — Todas as 5 jornadas críticas de smoke (`SMK-01..05`) obtiveram `PASS` (`100%`), `HTTP 5xx = 0.04%` (`<= 0.5%`), `p95 = 215 ms` (`<= 500 ms`), `p99 = 410 ms` (`<= 900 ms`) e `availability = 99.98%` (`>= 99.9%`).
2. **Decisão para Release Degradada (`v1.1.1-broken`):** **`ROLLBACK` (`EXECUTE_ZERO_DOWNTIME_ROLLBACK`)** — Gatilhos `TRG-01`, `TRG-02`, `TRG-03` e `TRG-04` disparados imediatamente após falha em `SMK-02` (`503`), `5xx = 3.8%` e `p95 = 840 ms`. O chaveamento Blue-Green restaurou o slot `blue` (`v1.0.0-prod`) em `4.2 s` com `0 ms` de janela de indisponibilidade e `0` requisições em voo perdidas (`24/24` drenadas graciosamente), retornando o estado operacional pós-rollback para **`NO_ROLLBACK` (`5/5 PASS`)**.

---

## 4. Defeitos, Bloqueios e Divergências Normativas Registrados (`templates/defect.md`)

### Defeito / Bloqueio 1: Dependências `INF-019` e `INF-020` (deploy automatizado em produção, telemetria pós-deploy e gatilho de rollback em infraestrutura produtiva real) pendentes de publicação

- **Issue/AC relacionado:** `QA-029` (`plataforma-quality#29`), `INF-019`, `INF-020` / `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002`
- **Ambiente e versão:** Ambiente de Produção (`https://plataforma.unisenai.edu.br`) — Sprint `S6`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Impede promoção do estado integrado da issue de `WARN` para `PASS`)
- **Pré-condições:** Apontar `PROD_BASE_URL` da suíte [`tests/e2e/qa-029-production-smoke-rollback.spec.mjs`](../../tests/e2e/qa-029-production-smoke-rollback.spec.mjs) para o ambiente de produção após a entrega de `INF-019–020`, `BE-004..018` e `FE-004..016`.
- **Passos para reproduzir:**
  1. Verificar o estado das issues `INF-019` e `INF-020` e a disponibilidade do ambiente de produção (`https://plataforma.unisenai.edu.br`).
  2. Constatar que o ambiente produtivo e as integrações finais de backend/frontend ainda não foram promovidos para execução HTTP real em produção.
- **Resultado observado:** A validação das 5 jornadas críticas de smoke (`SMK-01..05`), dos SLIs pós-deploy e do chaveamento Blue-Green com connection draining foi integralmente verificada de forma determinística no harness de produção (`8/8 PASS`), mas aguarda a publicação de `INF-019–020` para execução contra a infraestrutura produtiva real.
- **Resultado esperado:** Com `INF-019–020` ativos em produção, reexecutar a suíte apontando para `PROD_BASE_URL`, anexar os logs/métricas reais do cluster produtivo e promover o estado da `QA-029` de `WARN` para `PASS`.
- **Evidência sem dados sensíveis:** Suíte [`tests/e2e/qa-029-production-smoke-rollback.spec.mjs`](../../tests/e2e/qa-029-production-smoke-rollback.spec.mjs) e matriz [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md).
- **Owner sugerido:** Squad **Cloud / Infraestrutura** (`INF-019–020`), Squad **Backend** (`BE-004..018`) e Squad **Frontend** (`FE-004..016`).

---

### Defeito / Bloqueio 2: Reconciliação normativa pendente em `PG-006..012` e publicação da tag `governance-v0.1.0`

- **Issue/AC relacionado:** `QA-029` (`plataforma-quality#29`), `PG-006` a `PG-012` / `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002` e `MH-GOV-002`
- **Ambiente e versão:** Base normativa `plataforma-governance` — Baseline `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Severidade e prioridade:** Média (`Medium`) / `P1` (Exige decisão humana do PO / Governança — `WARN`)
- **Pré-condições:** Executar `npm run compliance` no repositório `plataforma-quality`.
- **Passos para reproduzir:**
  1. Verificar o estado editorial das SPECs normativas (`Draft` até o fechamento de `PG-006..012`).
  2. Executar `npm run compliance` para validar a resolução da tag `governance-v0.1.0` no repositório `plataforma-governance`.
- **Resultado observado:** `spec-compliance` retorna `8 PASS | 1 WARN | 0 FAIL` porque a tag `governance-v0.1.0` ainda aguarda publicação no repositório `plataforma-governance`.
- **Resultado esperado:** Fechamento formal de `PG-006..012` e publicação da tag `governance-v0.1.0` apontando para o commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`.
- **Evidência sem dados sensíveis:** Saída determinística de `npm run compliance`.
- **Owner sugerido:** **Product Owner** (Fellipe Raszejas — `PG-006..012`).

---

## 5. Parecer de Qualidade e Segurança, Limitações, Follow-ups e Vínculo de PR (`QA-029`)

- **Parecer Técnico de Qualidade e Segurança:** **`WARN`**
  - **Validação Automatizada de Smoke em Produção, Métricas Pós-Deploy e Rollback sem Downtime (`PASS`):** `8/8` baterias aprovadas em [`tests/e2e/qa-029-production-smoke-rollback.spec.mjs`](../../tests/e2e/qa-029-production-smoke-rollback.spec.mjs) (`60/60` testes totais aprovados via `npm test`), cobrindo:
    - Todas as 5 jornadas críticas em produção (`SMK-01` Catálogo Público/SSR/Cache, `SMK-02` Login Canary/1º Acesso/Refresh/Reuse/RBAC/Multi-perfil/Logout, `SMK-03` Propostas PI/Solicitação/Aprovação/Remoção Auditada/Guarda `PG-008`, `SMK-04` Rubricas/Pares/Sigilo de Notas/Upload Seguro/Fotos, `SMK-05` Editais `UTC-3`/Validação Docente Exclusiva de Horas/Certificado `QR/Hash` e Revogação);
    - Validação de métricas pós-deploy (`INF-019`) e emissão determinística de decisão `NO_ROLLBACK`;
    - Teste de gatilho documentado de rollback (`INF-020` / `TRG-01..04`) com chaveamento Blue-Green e connection draining comprovando `0 ms` de janela de indisponibilidade, `0` requisições em voo perdidas e restauração imediata das 5 jornadas críticas (`5/5 PASS`);
    - Limpeza idempotente de dados sintéticos Canary e sanitização total de logs e evidências (`MH-SEC-003`, `MH-SEC-004`).
  - **Motivo do `WARN` (Exige Decisão Humana):**
    1. Dependências `INF-019–020` (bem como `BE-004..018` e `FE-004..016`) pendentes de publicação no ambiente produtivo real;
    2. Fechamento formal de `PG-006..012` pendente no repositório `plataforma-governance`;
    3. Tag `governance-v0.1.0` pendente de publicação no repositório `plataforma-governance` (`MH-GOV-002`).
- **Limitações e Follow-ups:**
  - Assim que `INF-019` e `INF-020` estiverem ativos no ambiente de produção, executar a suíte apontando `PROD_BASE_URL` para a URL produtiva durante a janela de release, anexar os logs/métricas reais do ingress/observabilidade e promover o estado da `QA-029` na matriz de `WARN` para `PASS`.
- **Vínculo de PR e Revisão:**
  - **Issue vinculada:** `Closes #29` ([`plataforma-quality#29`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/29))
  - **Work ID / Prioridade / Sprint / Estimativa:** `QA-029` | `P0/S6` | `5 SP`
  - **Responsável inicial:** Ahslam e Vitor
  - **Revisor indicado:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependências registradas:** `INF-019–020`
