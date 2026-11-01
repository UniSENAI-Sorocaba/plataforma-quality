# Relatório de Validação RBAC/ABAC, Matriz Allow/Deny e Payloads Sanitizados: `QA-009`

- **Issue de Qualidade:** [`QA-009` (`plataforma-quality#9`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/9) — `[QA-009] RBAC cobre allow/deny por perfil e rota`
- **Refinamento de Governança / Produto:** [`PG-006` (`plataforma-governance#6`)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6) a `PG-012` / [`AUTH-08` (`plataforma-governance#21`)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/21)
- **SPECs e Critérios de Aceite Cobertos:**
  - **Núcleo de Autorização:** `SPEC-AUTH-003` (`AC-AUTH-003-01` — acúmulo de funções no mesmo CPF; `AC-AUTH-003-02` — funções oficiais `COORDENACAO`, `DOCENTE`, `ALUNO`; `AC-AUTH-003-03` — escopo por vínculo docente ao projeto; `AC-AUTH-003-04` — remoção de participante com justificativa obrigatória; `AC-AUTH-003-05` — escopo discente por vínculo/atribuição; `AC-AUTH-003-06` — negação por padrão e autorização server-side)
  - **Projetos Integradores (`SPEC-PI-001..004`):**
    - `SPEC-PI-001` (`AC-PI-001-01..15` — propostas rascunho/publicado, matrícula por solicitação do aluno, aprovação/negação e remoção com justificativa pelo docente responsável, vedação de convites legados)
    - `SPEC-PI-002` (`AC-PI-002-01..03` — acompanhamento de etapas do PI e proibição de agenda/bancas)
    - `SPEC-PI-003` (`AC-PI-003-01..06` — rubricas/pesos, fechamento/reabertura pelo docente responsável, atribuição de avaliadores pela coordenação, sigilo de notas individuais)
    - `SPEC-PI-004` (`AC-PI-004-01..04` — arquivos internos restritos a vinculados/responsável e autorização de publicação de fotos)
  - **Extensão (`SPEC-EXT-001..003`):**
    - `SPEC-EXT-001` (`AC-EXT-001-01..04` — janelas de inscrição em UTC-3 pela coordenação e avisos por escopo)
    - `SPEC-EXT-002` (`AC-EXT-002-01..04` — submissão de atividades pelo aluno e validação/alteração de horas exclusivamente pelo docente responsável)
    - `SPEC-EXT-003` (`AC-EXT-003-01..03` — relatórios e consolidação de carga horária de extensão por escopo)
  - **Portal Público (`SPEC-PORTAL-001..002`):**
    - `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05`) e `SPEC-PORTAL-002` (`AC-PORTAL-002-01..03` — exposição pública apenas de projetos publicados e fotos autorizadas, sem vazar rascunhos, notas, horas, arquivos internos ou CPFs)
  - **Must Haves:** `MH-GOV-001`, `MH-GOV-002`, `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004`, `ADR-008`
- **Issues Dependentes (Implementação):** `BE-010` (Autorização RBAC/ABAC Server-Side), `AUTH-08-BE` (`plataforma-backend#33`), `BE-004`, `BE-006`, `AUTH-08-FE-01..07`
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Confirmação de Dependências, Contratos/SPECs e Matriz de Casos (`Allow` × `Deny`)

> **Nota normativa (`_KB/README.md`):** As especificações `SPEC-AUTH-003`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` permanecem como `Draft` na baseline até o fechamento de `PG-006` a `PG-012` pelo Product Owner (Fellipe Raszejas), e os middlewares/endpoints reais do `plataforma-backend` (`BE-010` / `AUTH-08-BE`) encontram-se pendentes de entrega. Por isso, a suíte automatizada em [`tests/api/qa-009-rbac-route-authorization.test.mjs`](../../tests/api/qa-009-rbac-route-authorization.test.mjs) exercita deterministicamente todas as decisões `ALLOW` e `DENY` (`6/6` baterias aprovadas — `PASS`), enquanto o parecer integrado da issue é registrado como **`WARN`** até a disponibilização do backend em homologação.

### 1.1. Matriz Consolidada: Rota / Operação × Escopo / Recurso × Decisão Server-Side por Perfil

| # | Domínio / SPEC (`AC`) | Rota / Operação (Server-Side) | Escopo / Recurso Alvo | Visitante Anônimo | Aluno Vinculado (`PRJ-PI-01` / `EXT-01`) | Aluno Outro Projeto (`PRJ-PI-02`) | Docente Responsável (`PRJ-PI-01` / `EXT-01`) | Docente Outro Escopo (`PRJ-PI-02`) | Coordenação Pura | Multi-perfil (`DOCENTE` + `COORD`) | Admin Não Aprovado / 1º Acesso / Inativo |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `SPEC-AUTH-001` / `003` (`AC-AUTH-003-02`) | `POST /api/v1/users/import-csv`<br>`POST /api/v1/users/inactivate`<br>`POST /api/v1/classes/inactivate` | Gestão institucional de contas e turmas | `DENY (401)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **2** | `SPEC-AUTH-001` (`AC-AUTH-001-04`) | `POST /api/v1/users/reset-password` | Redefinir senha de usuário (gera troca obrigatória) | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **3** | `SPEC-PI-001` (`AC-PI-001-01`) | `POST /api/v1/pi/projects` | Criar proposta de PI (`DRAFT` ou `PUBLISHED`) | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (201)`** | **`ALLOW (201)`** | `DENY (403)` | **`ALLOW (201)`** | `DENY (403 / 401)` |
| **4** | `SPEC-PI-001` (`AC-PI-001-02`, `07`) | `GET /api/v1/pi/projects/PRJ-PI-DRAFT-03` | Leitura de proposta em `DRAFT` do Docente 01 | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403 / 401)` |
| **5** | `SPEC-PI-001` (`AC-PI-001-05..08`) | `PATCH /api/v1/pi/projects/PRJ-PI-01`<br>`POST .../reopen` / `.../archive` | Editar, reabrir ou arquivar projeto `PRJ-PI-01` | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **6** | `SPEC-PI-001` (`AC-PI-001-09`) | `POST /api/v1/pi/projects/PRJ-PI-01/enrollments` | Solicitar participação em projeto `PUBLISHED` na janela | `DENY (401)` | **`ALLOW (201)`** | **`ALLOW (201)`** | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403 / 401)` |
| **7** | `SPEC-PI-001` (`AC-PI-001-10`) | `PATCH /api/v1/pi/projects/PRJ-PI-01/enrollments/decide` | Aprovar ou negar pedido de participação em `PRJ-PI-01` | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **8** | `SPEC-AUTH-003` (`AC-AUTH-003-04`) / `SPEC-PI-001` (`AC-PI-001-13`) | `DELETE /api/v1/pi/projects/PRJ-PI-01/participants` | Remover participante de `PRJ-PI-01` (**exige justificativa**) | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** c/ just.<br>`DENY (422)` s/ just. | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** c/ just.<br>`DENY (422)` s/ just. | `DENY (403 / 401)` |
| **9** | `SPEC-PI-001` (`AC-PI-001-14`) / `SPEC-PI-002` | `POST /api/v1/pi/projects/:id/invitations`<br>`POST /api/v1/pi/bancas/schedule` | Fluxos proibidos por SPEC (convite individual e agenda de banca) | `DENY (401)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403 / 401)` |
| **10** | `SPEC-PI-001` / `SPEC-PI-002` | `POST /api/v1/pi/projects/PRJ-PI-01/deliverables` | Submeter entregável / etapa de PI antes do fechamento | `DENY (401)` | **`ALLOW (201)`** | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403 / 401)` |
| **11** | `SPEC-PI-003` (`AC-PI-003-01..03`) | `POST /api/v1/pi/projects/PRJ-PI-01/rubric`<br>`POST .../evaluations/finalize` / `reopen` | Criar rubrica/pesos, finalizar e reabrir avaliação de `PRJ-PI-01` | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **12** | `SPEC-PI-003` (`AC-PI-003-06`) | `POST /api/v1/pi/peer-evaluations/assign` | Definir qual aluno avalia qual projeto e em qual data | `DENY (401)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **13** | `SPEC-PI-003` (`AC-PI-003-06`) | `POST /api/v1/pi/projects/PRJ-PI-02/peer-evaluations` | Enviar avaliação entre pares (Aluno 01 designado para `PRJ-PI-02`) | `DENY (401)` | **`ALLOW (201)`** | `DENY (403)` *(não designado)* | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403 / 401)` |
| **14** | `SPEC-PI-003` (`AC-PI-003-04`) | `GET /api/v1/pi/projects/PRJ-PI-01/grades` | Consultar nota individual do Aluno 01 em `PRJ-PI-01` | `DENY (401)` | **`ALLOW (200)`** *(própria)* | `DENY (403)` *(alheia)* | **`ALLOW (200)`** | `DENY (403)` | **`ALLOW (200)`** | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **15** | `SPEC-PI-004` (`AC-PI-004-01`) | `GET /api/v1/pi/projects/PRJ-PI-01/files/internal` | Acessar arquivos internos do projeto `PRJ-PI-01` | `DENY (401)` | **`ALLOW (200)`** | `DENY (403)` | **`ALLOW (200)`** | `DENY (403)` | **`ALLOW (200)`** | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **16** | `SPEC-PI-004` (`AC-PI-004-04`) | `PATCH /api/v1/pi/projects/PRJ-PI-01/photos/authorization` | Autorizar publicação de fotos de `PRJ-PI-01` no Portal | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **17** | `SPEC-EXT-001` (`AC-EXT-001-01`) | `PUT /api/v1/ext/enrollment-windows` | Definir calendário de janelas de inscrição (UTC-3) | `DENY (401)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **18** | `SPEC-EXT-001` (`AC-EXT-001-03`) | `POST /api/v1/ext/notices` | Publicar avisos (Global pela Coord. / Projeto pelo Docente resp.) | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (201)`** *(no projeto)* | `DENY (403)` *(projeto alheio)* | **`ALLOW (201)`** *(global)* | **`ALLOW (201)`** | `DENY (403 / 401)` |
| **19** | `SPEC-EXT-002` (`AC-EXT-002-01`) | `POST /api/v1/ext/projects/PRJ-EXT-01/activities` | Submeter atividade e horas de extensão em `PRJ-EXT-01` | `DENY (401)` | **`ALLOW (201)`** | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403)` | `DENY (403 / 401)` |
| **20** | `SPEC-EXT-002` (`AC-EXT-002-03..04`) | `PATCH /api/v1/ext/projects/PRJ-EXT-01/hours/validate` | Validar/alterar horas e ajustar prazo em `PRJ-EXT-01` | `DENY (401)` | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403)` | `DENY (403)` | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **21** | `SPEC-EXT-003` (`AC-EXT-003-01`) | `GET /api/v1/ext/projects/PRJ-EXT-01/hours/report` | Consultar extrato/relatório consolidado de horas (`PRJ-EXT-01`) | `DENY (401)` | **`ALLOW (200)`** *(próprio)* | `DENY (403)` *(alheio)* | **`ALLOW (200)`** | `DENY (403)` | **`ALLOW (200)`** | **`ALLOW (200)`** | `DENY (403 / 401)` |
| **22** | `SPEC-PORTAL-001` / `002` (`AC-PORTAL-001-01..05`) | `GET /api/v1/portal/projects`<br>`GET /api/v1/portal/projects/PRJ-PI-01` | Catálogo público (apenas projetos `PUBLISHED` e fotos autorizadas) | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** | **`ALLOW (200)`** |
| **23** | `SPEC-PORTAL-001` (`AC-PORTAL-001-02`, `04`) | `GET /api/v1/portal/projects/PRJ-PI-DRAFT-03`<br>`GET /api/v1/portal/projects/PRJ-PI-01/internal-files` | Bloqueio de rascunhos (`404`) e de arquivos internos/mutação (`403`) no Portal | `DENY (404 / 403)` | `DENY (404 / 403)` | `DENY (404 / 403)` | `DENY (404 / 403)` | `DENY (404 / 403)` | `DENY (404 / 403)` | `DENY (404 / 403)` | `DENY (404 / 403)` |

---

## 2. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-009` (`plataforma-quality#9`)
- **SPEC / critério de aceite:** `SPEC-AUTH-003` (`AC-AUTH-003-01..06`), com impactos de autorização em `SPEC-PI-001`, `SPEC-PI-002`, `SPEC-PI-003`, `SPEC-PI-004`, `SPEC-EXT-001`, `SPEC-EXT-002`, `SPEC-EXT-003`, `SPEC-PORTAL-001` e `SPEC-PORTAL-002`
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos:**
  - `USR-QA009-ALUNO-01`: CPF `000.000.009-01` | Papel `ALUNO` | Vinculado a `PRJ-PI-01` e `PRJ-EXT-01` | Designado avaliador de `PRJ-PI-02`
  - `USR-QA009-ALUNO-02`: CPF `000.000.009-02` | Papel `ALUNO` | Vinculado apenas a `PRJ-PI-02`
  - `USR-QA009-DOCENTE-01`: CPF `000.000.009-03` | Papel `DOCENTE` | Responsável por `PRJ-PI-01`, `PRJ-PI-DRAFT-03` e `PRJ-EXT-01`
  - `USR-QA009-DOCENTE-02`: CPF `000.000.009-04` | Papel `DOCENTE` | Responsável apenas por `PRJ-PI-02`
  - `USR-QA009-COORD-01`: CPF `000.000.009-05` | Papel `COORDENACAO` (sem responsabilidade docente em projetos)
  - `USR-QA009-MULTI-01`: CPF `000.000.009-06` | Papéis acumulados `DOCENTE` + `COORDENACAO` | Co-responsável por `PRJ-PI-01` e `PRJ-EXT-01`
  - `USR-QA009-ADMIN-01`: CPF `000.000.009-07` | Papel técnico `ADMINISTRADOR` (não aprovado no caderno -> negação por padrão)
  - `USR-QA009-TEMP-01`: CPF `000.000.009-08` | Papel `ALUNO` com `mustChangePassword=true`
  - `USR-QA009-INATIVO-01`: CPF `000.000.009-09` | Papel `ALUNO` com `active=false`
- **Ambiente:** Node.js Test Runner (`node --test tests/api/qa-009-rbac-route-authorization.test.mjs`)

### Passos

1. **`CT-QA009-01` (`SPEC-AUTH-003` — RBAC Vertical, Multi-perfil e Deny by Default):** Exercitar operações administrativas de Coordenação (`import-csv`, `inactivate`), acúmulo de funções no mesmo CPF (`DOCENTE` + `COORDENACAO`), recusa de papel não aprovado (`ADMINISTRADOR` -> `403 FORBIDDEN_UNAPPROVED_ROLE`), recusa por senha temporária pendente (`403 PASSWORD_CHANGE_REQUIRED`) e conta inativa (`401`).
2. **`CT-QA009-02` (`SPEC-PI-001` e `SPEC-PI-002` — Propostas, Rascunho, Matrícula e Remoção com Justificativa):** Exercitar criação/edição/reabertura/arquivamento de PI, leitura de rascunho (`PRJ-PI-DRAFT-03`), solicitação e decisão de matrícula, remoção de aluno sem justificativa (`422 JUSTIFICATION_REQUIRED`) vs. com justificativa (`200`) e bloqueio de rotas proibidas (convites individuais e bancas -> `403`).
3. **`CT-QA009-03` (`SPEC-PI-003` e `SPEC-PI-004` — Rubricas, Avaliações, Notas, Arquivos Internos e Fotos):** Exercitar gestão de rubricas/fechamento pelo docente responsável vs. outro docente/coordenação, atribuição de avaliadores discentes pela coordenação, submissão de avaliação entre pares por aluno designado vs. não designado, sigilo de notas individuais (`AC-PI-003-04`), leitura de arquivos internos (`AC-PI-004-01`) e autorização de fotos (`AC-PI-004-04`).
4. **`CT-QA009-04` (`SPEC-EXT-001`, `SPEC-EXT-002` e `SPEC-EXT-003` — Extensão):** Exercitar configuração de períodos de inscrição em UTC-3, publicação de avisos globais vs. de projeto, submissão de atividades pelo aluno vinculado, validação/alteração de horas exclusivamente pelo docente responsável (`AC-EXT-002-03..04`) e consulta a relatórios de horas.
5. **`CT-QA009-05` (`SPEC-PORTAL-001` e `SPEC-PORTAL-002` — Portal Público):** Consultar catálogo público sem autenticação, confirmando retorno apenas de projetos `PUBLISHED` e fotos com `photoAuthorized=true`, e negando acesso a projetos `DRAFT` (`404`) ou arquivos internos (`403`).
6. **`CT-QA009-06` (Autorização Server-Side e Sanitização de Respostas/Logs):** Enviar requisições com headers forjados pelo cliente (`x-user-role: COORDENACAO`, `x-bypass-rbac: true`) e inspecionar todos os payloads de erro e trilha de auditoria para confirmar zero vazamento de segredos, senhas, tokens, CPFs completos ou metadados confidenciais.

### Resultado esperado

- `CT-QA009-01` a `CT-QA009-06` aprovados (`PASS`), confirmando autorização server-side por perfil, rota, escopo e recurso, e respostas de erro sanitizadas sem vazamento de dados internos.

### Evidência esperada

- Execução limpa de `npm test` e `npm run compliance`, matriz completa `Allow/Deny`, payloads HTTP e trilha de auditoria sanitizados.

---

## 3. Registro de Evidência e Payloads Sanitizados (`templates/evidence.md`)

- **Issue / AC:** `QA-009` (`plataforma-quality#9`) — `SPEC-AUTH-003` (`AC-AUTH-003-01..06`), `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`
- **Commit do sistema sob teste:** `d534879` (`plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-11-01T17:45:00Z`
- **Executor/ferramenta:** `npm test` (`node --test`) + `npm run compliance` (`node scripts/spec-compliance.mjs`)
- **Resultado:** `WARN` (Suíte de API/Segurança `tests/api/qa-009-rbac-route-authorization.test.mjs`: `6/6 PASS`; estado global `WARN` devido à dependência dos endpoints reais em `plataforma-backend` — `BE-010`/`AUTH-08-BE` — e do fechamento de `PG-006..012` / tag `governance-v0.1.0` na Governança)
- **Artefatos/logs:**
  - Suíte automatizada RBAC/ABAC: [`tests/api/qa-009-rbac-route-authorization.test.mjs`](../../tests/api/qa-009-rbac-route-authorization.test.mjs)
  - Relatório e matriz de evidências: [`docs/evidences/qa-009-rbac-route-authorization-report.md`](./qa-009-rbac-route-authorization-report.md)
  - Matriz de rastreabilidade: [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)
- **Observações e riscos:** Nenhum segredo, token JWT real ou CPF real foi utilizado. Assim que os endpoints de domínio (`PI`, `EXT`, `PORTAL`) e o middleware `BE-010` forem publicados no `plataforma-backend`, esta suíte deve ser apontada para o ambiente de homologação para promoção do parecer de `WARN` para `PASS`.

### 3.1. Payloads Sanitizados de Decisão `ALLOW` e `DENY` Server-Side

#### A) Isolamento de Escopo entre Docentes e Exigência de Justificativa (`SPEC-AUTH-003` / `SPEC-PI-001` / `SPEC-EXT-002`)
```json
{
  "docente02_tentativaEditarProjetoDoDocente01": {
    "request": {
      "method": "PATCH",
      "path": "/api/v1/pi/projects/PRJ-PI-01",
      "actorId": "USR-QA009-DOCENTE-02",
      "roles": ["DOCENTE"],
      "ownedProjects": ["PRJ-PI-02"]
    },
    "response": {
      "status": 403,
      "decision": "DENY",
      "body": {
        "code": "FORBIDDEN_PROJECT_SCOPE",
        "message": "Acesso negado: você não é o docente responsável por este projeto.",
        "path": "/api/v1/pi/projects/PRJ-PI-01"
      }
    }
  },
  "docente01_remocaoParticipanteSemJustificativa": {
    "request": {
      "method": "DELETE",
      "path": "/api/v1/pi/projects/PRJ-PI-01/participants",
      "actorId": "USR-QA009-DOCENTE-01",
      "body": { "studentId": "USR-QA009-ALUNO-01", "justification": "   " }
    },
    "response": {
      "status": 422,
      "decision": "DENY",
      "body": {
        "code": "JUSTIFICATION_REQUIRED",
        "message": "A remoção de participante exige justificativa obrigatória registrada.",
        "path": "/api/v1/pi/projects/PRJ-PI-01/participants"
      }
    }
  },
  "coordenacaoSemVinculoDocente_tentativaValidarHorasExtensao": {
    "request": {
      "method": "PATCH",
      "path": "/api/v1/ext/projects/PRJ-EXT-01/hours/validate",
      "actorId": "USR-QA009-COORD-01",
      "roles": ["COORDENACAO"]
    },
    "response": {
      "status": 403,
      "decision": "DENY",
      "body": {
        "code": "FORBIDDEN_EXT_HOURS_VALIDATION",
        "message": "Apenas o docente responsável pelo projeto pode validar ou alterar horas e prazos.",
        "path": "/api/v1/ext/projects/PRJ-EXT-01/hours/validate"
      }
    }
  }
}
```

#### B) Isolamento Horizontal de Alunos (`SPEC-PI-003` Notas / `SPEC-PI-004` Arquivos Internos) e Portal Público (`SPEC-PORTAL-001..002`)
```json
{
  "aluno02_tentativaLerNotaIndividualDoAluno01": {
    "request": {
      "method": "GET",
      "path": "/api/v1/pi/projects/PRJ-PI-01/grades",
      "actorId": "USR-QA009-ALUNO-02",
      "linkedProjects": ["PRJ-PI-02"],
      "targetStudentId": "USR-QA009-ALUNO-01"
    },
    "response": {
      "status": 403,
      "decision": "DENY",
      "body": {
        "code": "FORBIDDEN_GRADE_READ",
        "message": "Acesso negado às notas individuais solicitadas.",
        "path": "/api/v1/pi/projects/PRJ-PI-01/grades"
      }
    }
  },
  "portalPublico_listagemSomentePublicadosEFotosAutorizadas": {
    "request": {
      "method": "GET",
      "path": "/api/v1/portal/projects",
      "actorId": "ANONYMOUS"
    },
    "response": {
      "status": 200,
      "decision": "ALLOW",
      "body": {
        "code": "PORTAL_PUBLIC_LIST_OK",
        "data": {
          "projects": [
            {
              "id": "PRJ-PI-01",
              "type": "PI",
              "publicTitle": "Sistema IoT de Eficiência Energética Industrial",
              "photos": ["/public/media/prj-pi-01-prototipo.jpg"]
            },
            {
              "id": "PRJ-PI-02",
              "type": "PI",
              "publicTitle": "Automação de Linha de Montagem com Visão Computacional",
              "photos": []
            },
            {
              "id": "PRJ-EXT-01",
              "type": "EXT",
              "publicTitle": "Oficina de Robótica Educacional para Escolas Públicas",
              "photos": []
            }
          ]
        }
      }
    }
  },
  "portalPublico_bloqueioDeProjetoEmRascunhoSemVazarTitulo": {
    "request": {
      "method": "GET",
      "path": "/api/v1/portal/projects/PRJ-PI-DRAFT-03",
      "actorId": "ANONYMOUS"
    },
    "response": {
      "status": 404,
      "decision": "DENY",
      "body": {
        "code": "PORTAL_PROJECT_NOT_PUBLIC",
        "message": "Projeto não encontrado ou não publicado no catálogo público.",
        "path": "/api/v1/portal/projects/PRJ-PI-DRAFT-03"
      }
    }
  }
}
```

#### C) Trilha de Auditoria Server-Side Sanitizada (`CT-QA009-06`)
```json
[
  {
    "timestamp": "2026-11-01T17:40:00.000Z",
    "actorId": "USR-QA009-ALUNO-01",
    "actorRoles": ["ALUNO"],
    "cpfMasked": "***.***.009-01",
    "token": "[REDACTED]",
    "method": "POST",
    "path": "/api/v1/users/import-csv",
    "resourceId": null,
    "decision": "DENY",
    "status": 403,
    "code": "FORBIDDEN_ROLE_COORDENACAO_ONLY"
  },
  {
    "timestamp": "2026-11-01T17:40:00.000Z",
    "actorId": "USR-QA009-ALUNO-01",
    "actorRoles": ["ALUNO"],
    "cpfMasked": "***.***.009-01",
    "token": "[REDACTED]",
    "method": "GET",
    "path": "/api/v1/pi/projects/PRJ-PI-DRAFT-03",
    "resourceId": "PRJ-PI-DRAFT-03",
    "decision": "DENY",
    "status": 403,
    "code": "FORBIDDEN_DRAFT_PROJECT_READ"
  }
]
```

---

## 4. Defeitos, Bloqueios e Limitações Registrados (`templates/defect.md`)

### Defeito / Bloqueio 1: Ausência de guardas RBAC/ABAC server-side integradas no Backend (`BE-010` / `AUTH-08-BE`) para os domínios de PI, Extensão e Portal

- **Issue/AC relacionado:** `QA-009` (`plataforma-quality#9`), `BE-010`, `AUTH-08-BE` (`plataforma-backend#33`) / `SPEC-AUTH-003` (`AC-AUTH-003-01..06`), `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`
- **Ambiente e versão:** Repositório `plataforma-backend` e integração com `plataforma-frontend` — Sprint `S1`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Impede promoção do parecer integrado de `WARN` para `PASS`)
- **Pré-condições:** Consultar os endpoints de negócio de PI, Extensão e Portal no repositório `plataforma-backend`.
- **Passos para reproduzir:**
  1. Verificar o estado de entrega da issue `BE-010` / `AUTH-08-BE` no repositório `plataforma-backend`.
  2. Observar que as telas entregues parcialmente no Frontend ([PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) e [PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46)) ainda consomem serviços mockados (`student-service.ts` / `faculty-service.ts`) sem validação server-side de vínculo ao projeto (`ownerDocenteId` / `participants`).
- **Resultado observado:** Os middlewares de autorização server-side por função e por escopo de projeto/recurso ainda não foram publicados no backend.
- **Resultado esperado:** Toda requisição a rotas de `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` deve validar no servidor a sessão ativa, o papel (`ALUNO`, `DOCENTE`, `COORDENACAO`) e o vínculo de propriedade/participação no recurso, cumprindo 100% das asserções de [`tests/api/qa-009-rbac-route-authorization.test.mjs`](../../tests/api/qa-009-rbac-route-authorization.test.mjs).
- **Evidência sem dados sensíveis:** Suíte [`tests/api/qa-009-rbac-route-authorization.test.mjs`](../../tests/api/qa-009-rbac-route-authorization.test.mjs) e matriz de rastreabilidade [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md).
- **Owner sugerido:** Squad **Backend** (`BE-010`, `AUTH-08-BE`).

---

### Defeito / Bloqueio 2: Reconciliação normativa pendente em `PG-006..012` sobre o papel técnico `Administrador` em `SPEC-PI-004` / `SPEC-PORTAL-001` vs. `SPEC-AUTH-003`

- **Issue/AC relacionado:** `QA-009` (`plataforma-quality#9`), `PG-006` (`plataforma-governance#6`) / `SPEC-AUTH-003` (`AC-AUTH-003-02`, `AC-AUTH-003-06`), `SPEC-PI-004` (`AC-PI-004-01`), `SPEC-PORTAL-001`
- **Ambiente e versão:** Base normativa `plataforma-governance` (`_KB/specs/`) — Baseline `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Severidade e prioridade:** Média (`Medium`) / `P1` (Exige decisão humana do PO — `WARN`)
- **Pré-condições:** Inspecionar os papéis listados em `SPEC-AUTH-003` em comparação com `SPEC-PI-004` e `SPEC-PORTAL-001`.
- **Passos para reproduzir:**
  1. Verificar que `SPEC-AUTH-003` aprova apenas `Coordenação`, `Docentes` e `Alunos`, classificando outros papéis técnicos como não definidos e determinando negação por padrão (`AC-AUTH-003-06`).
  2. Verificar que `SPEC-PI-004` (`AC-PI-004-01`) menciona visualização de arquivos internos por *"administradores"* além de alunos e docentes vinculados.
- **Resultado observado:** Enquanto `PG-006` não reconciliar se *"administradores"* em `SPEC-PI-004` refere-se ao papel oficial `COORDENACAO` ou a um papel separado, aplica-se `AC-AUTH-003-06` (concedendo leitura institucional à `COORDENACAO` e mantendo negação por padrão para `ADMINISTRADOR` avulso).
- **Resultado esperado:** Fechamento formal de `PG-006` a `PG-012` pelo PO e publicação da tag `governance-v0.1.0`.
- **Evidência sem dados sensíveis:** Caso `CT-QA009-01` (item 4) e `CT-QA009-03` (item 5) em [`tests/api/qa-009-rbac-route-authorization.test.mjs`](../../tests/api/qa-009-rbac-route-authorization.test.mjs).
- **Owner sugerido:** **Product Owner** (Fellipe Raszejas — `PG-006..012`).

---

## 5. Parecer de Qualidade e Segurança e Checklist de Aceite (`QA-009`)

- **Parecer Técnico de Qualidade e Segurança:** **`WARN`**
  - **Validação Automatizada de Regras e Contratos (`PASS`):** `6/6` baterias de testes determinísticos aprovadas em [`tests/api/qa-009-rbac-route-authorization.test.mjs`](../../tests/api/qa-009-rbac-route-authorization.test.mjs) (cobrindo 23 combinações críticas de rotas/operações × 8 perfis/estados de conta × isolamento de escopo `PRJ-PI-01` vs. `PRJ-PI-02` vs. `PRJ-PI-DRAFT-03` vs. `PRJ-EXT-01` e sanitização de erros/logs).
  - **Motivo do `WARN` (Exige Decisão Humana):** Pendência de implementação dos endpoints e middlewares reais no `plataforma-backend` (`BE-010` / `AUTH-08-BE`), reconciliação final das SPECs em `Draft` (`PG-006..012`) e publicação da tag `governance-v0.1.0` no repositório `plataforma-governance`.
- **Vínculo de PR e Revisão:**
  - **Issue vinculada:** `Closes #9` ([`plataforma-quality#9`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/9))
  - **Responsável pela validação:** Ahslam Mendes
  - **Revisor designado (Qualidade / Segurança):** Gabriel Ribeiro de Camargo Miranda (`@GabrielRibeiro`) / Gustavo (`Security Review`)

