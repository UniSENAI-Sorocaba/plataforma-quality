# Relatório de Testes de API e Logs Sanitizados: `QA-008` (Login, Refresh Rotativo, Logout, Expiração e Reuse)

- **Issue de Qualidade:** [`QA-008` (`plataforma-quality#8`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/8)
- **Refinamento de Governança / Produto:** [`PG-006` (`plataforma-governance#6`)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6) / [`AUTH-08` (`plataforma-governance#21`)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/21)
- **SPECs e Critérios de Aceite Cobertos:**
  - `SPEC-AUTH-001` (`AC-AUTH-001-01`, `AC-AUTH-001-02`, `AC-AUTH-001-02a`, `AC-AUTH-001-04`, `AC-AUTH-001-04a`, `AC-AUTH-001-05`, `AC-AUTH-001-05a`)
  - `SPEC-AUTH-002` (`AC-AUTH-002-01` — emissão de sessão/família; `AC-AUTH-002-02` — refresh rotativo; `AC-AUTH-002-03` — detecção de reuse com revogação da família; `AC-AUTH-002-04` — logout; `AC-AUTH-002-05` — expiração de access/refresh token; `AC-AUTH-002-06` — ausência de tokens em logs)
  - Must Haves: `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004`, `ADR-008`
- **Issues Dependentes (Implementação Backend):** `BE-004` (Login/Autenticação), `BE-006` (Sessão, Refresh Rotativo, Revogação de Família e Logout), `AUTH-08-BE` (`plataforma-backend#33`)
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Confirmação de Dependências, Contrato e Critérios (`SPEC-AUTH-001` e `SPEC-AUTH-002`)

> **Nota normativa (`_KB/README.md`):** As especificações `SPEC-AUTH-001` e `SPEC-AUTH-002` permanecem como `Draft` na baseline até o fechamento formal de `PG-006` pelo Product Owner (Fellipe Raszejas), e os endpoints reais do repositório `plataforma-backend` (`BE-004`, `BE-006`, `AUTH-08-BE`) ainda estão pendentes de entrega. Por isso, a suíte automatizada em [`tests/api/qa-008-auth-session-rotation-reuse.test.mjs`](../../tests/api/qa-008-auth-session-rotation-reuse.test.mjs) valida deterministicamente todas as invariantes de contrato e segurança (`PASS` em `6/6` cenários de API), enquanto o estado global da entrega é registrado como **`WARN`** (exigindo decisão humana e reexecução contra o backend integrado assim que `BE-006` for publicado).

| Código SPEC / AC | Regra Normativa / Critério de Aceite | Caso de Teste (`tests/api/qa-008-auth-session-rotation-reuse.test.mjs`) | Status no Harness QA | Status na Integração Backend (`BE-004` / `BE-006`) |
| :--- | :--- | :--- | :---: | :---: |
| `AC-AUTH-001-01` / `AC-AUTH-002-01` | Login por CPF e senha para conta ativa e provisionada emite `accessToken` de curta duração e `refreshToken` vinculado a uma família (`familyId`). | `CT-QA008-01` | `PASS` | `WARN` (Aguarda `BE-004` / `BE-006`) |
| `AC-AUTH-001-02` / `AC-AUTH-001-02a` | Credenciais incorretas, CPF não provisionado ou conta inativa (`active=false`) recebem recusa determinística (`401 AUTH_INVALID_OR_INACTIVE`) sem enumerar ou expor dados sensíveis. | `CT-QA008-01` | `PASS` | `WARN` (Aguarda `BE-004`) |
| `AC-AUTH-001-04` / `AC-AUTH-001-04a` | Conta com senha temporária ou redefinida (`mustChangePassword=true`) autentica apenas para troca obrigatória e recebe `403 PASSWORD_CHANGE_REQUIRED` em rotas de negócio. | `CT-QA008-01` | `PASS` | `WARN` (Aguarda `BE-004` / `AUTH-08-BE`) |
| `AC-AUTH-002-02` | **Refresh rotativo:** `POST /api/v1/auth/refresh` com refresh token ativo emite novo par (`generation + 1`) na mesma `familyId` e marca imediatamente o refresh token anterior como `rotated` (inválido para novo uso) e revoga o access token da geração anterior. | `CT-QA008-02` | `PASS` | `WARN` (Aguarda `BE-006`) |
| `AC-AUTH-002-03` | **Reuse de Refresh Token e Revogação de Família:** Apresentar um refresh token já rotacionado (`status === "rotated"`) deve **falhar (`401 AUTH_REFRESH_TOKEN_REUSED`)** e **revogar imediatamente toda a família (`familyId`)**, invalidando todos os refresh tokens e access tokens ativos daquela sessão. | `CT-QA008-03` | `PASS` | `WARN` (Aguarda `BE-006`) |
| `AC-AUTH-002-04` | **Logout:** `POST /api/v1/auth/logout` revoga a família de sessão (`204 No Content`) e impede qualquer uso subsequente do `accessToken` ou `refreshToken` (`401`). | `CT-QA008-04` | `PASS` | `WARN` (Aguarda `BE-006`) |
| `AC-AUTH-002-05` | **Expiração:** `accessToken` expirado é recusado (`401 AUTH_ACCESS_TOKEN_EXPIRED`), mas permite rotação enquanto o `refreshToken` não expirar; `refreshToken` expirado falha com `401 AUTH_REFRESH_TOKEN_EXPIRED` e exige novo login. | `CT-QA008-05` | `PASS` | `WARN` (Aguarda `BE-006`) |
| `AC-AUTH-001-05a` / `AC-AUTH-002-06` / `MH-SEC-004` | **Ausência de tokens e segredos em logs:** Logs de aplicação/auditoria e respostas HTTP de erro nunca registram `password`, `accessToken`, `refreshToken` ou CPF completo em claro (utilizam apenas `familyId`, `jti`, máscara `***.***.008-01` e `[REDACTED]`). | `CT-QA008-06` | `PASS` | `WARN` (Aguarda `BE-004` / `BE-006`) |

---

## 2. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-008` (`plataforma-quality#8`)
- **SPEC / critério de aceite:** `SPEC-AUTH-001` (`AC-AUTH-001-01..05a`) e `SPEC-AUTH-002` (`AC-AUTH-002-01..06`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos:**
  - `USR-QA008-01` (**Aluno Ativo**): CPF `000.000.008-01` | Senha `[SYNTHETIC_PASS_QA008_ALUNO]` | `active=true` | `mustChangePassword=false`
  - `USR-QA008-02` (**Docente Ativo**): CPF `000.000.008-02` | Senha `[SYNTHETIC_PASS_QA008_DOCENTE]` | `active=true` | `mustChangePassword=false`
  - `USR-QA008-03` (**Primeiro Acesso / Senha Temporária**): CPF `000.000.008-03` | Senha `[SYNTHETIC_TEMP_PASS_QA008]` | `active=true` | `mustChangePassword=true`
  - `USR-QA008-04` (**Conta Inativa**): CPF `000.000.008-04` | Senha `[SYNTHETIC_PASS_QA008_INATIVO]` | `active=false`
  - Tokens opacos sintéticos gerados por execução: `AT_OPAQUE_FAM-SINT-*` e `RT_OPAQUE_FAM-SINT-*` (nenhum JWT real em repositório).
- **Ambiente:** Node.js Test Runner (`node --test tests/api/qa-008-auth-session-rotation-reuse.test.mjs`)

### Passos

1. **`CT-QA008-01` (Login e Guarda de Conta/Senha):** Enviar `POST /api/v1/auth/login` com conta ativa (`USR-QA008-01`), senha inválida, conta inativa (`USR-QA008-04`) e conta com troca obrigatória de senha (`USR-QA008-03`).
2. **`CT-QA008-02` (Refresh Rotativo):** Autenticar `USR-QA008-02` (geração `G1`), acionar `POST /api/v1/auth/refresh` com `RT_G1` para obter `AT_G2` e `RT_G2`, e verificar a invalidação imediata de `AT_G1` e a transição de `RT_G1` para `status: "rotated"`.
3. **`CT-QA008-03` (Reuse de Refresh Token e Revogação de Família):** Após rotacionar `RT_G1 -> RT_G2`, reenviar `RT_G1` no endpoint de refresh; em seguida, tentar usar `RT_G2` no refresh e `AT_G2` em `GET /api/v1/auth/me`.
4. **`CT-QA008-04` (Logout):** Acionar `POST /api/v1/auth/logout` e tentar utilizar `accessToken` e `refreshToken` da sessão encerrada.
5. **`CT-QA008-05` (Expiração de Access e Refresh Token):** Avançar o relógio simulado em `+16 min` (acima do TTL de `15 min` do `accessToken`), validar recusa `401 AUTH_ACCESS_TOKEN_EXPIRED` e sucesso no refresh; avançar `+8 dias` (acima do TTL de `7 dias` do `refreshToken`) e validar recusa `401 AUTH_REFRESH_TOKEN_EXPIRED`.
6. **`CT-QA008-06` (Sanitização de Logs e Erros):** Inspecionar todos os registros de log e payloads de erro gerados nos passos anteriores para garantir ausência total de `password`, `accessToken`, `refreshToken` e CPF completo.

### Resultado esperado

- `CT-QA008-01` a `CT-QA008-06` aprovados (`PASS`), com revogação atômica de toda a família `familyId` no momento em que o reuse de `RT_G1` é detectado e zero vazamento de tokens ou credenciais nos logs.

### Evidência esperada

- Saída de execução de `npm test` e `npm run compliance`, payloads HTTP sanitizados de rotação/reuse/logout e trilha de logs estruturados apenas com `familyId`, `jti`, CPF mascarado e `[REDACTED]`.

---

## 3. Registro de Evidência e Logs Sanitizados (`templates/evidence.md`)

- **Issue / AC:** `QA-008` (`plataforma-quality#8`) — `SPEC-AUTH-001` (`AC-AUTH-001-01..05a`) e `SPEC-AUTH-002` (`AC-AUTH-002-01..06`)
- **Commit do sistema sob teste:** `5c5eadd` (`plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-10-30T18:12:00Z`
- **Executor/ferramenta:** `npm test` (`node --test`) + `npm run compliance` (`node scripts/spec-compliance.mjs`)
- **Resultado:** `WARN` (Suíte de API `tests/api/qa-008-auth-session-rotation-reuse.test.mjs`: `6/6 PASS`; estado global `WARN` devido à pendência dos endpoints reais em `plataforma-backend` — `BE-004`/`BE-006` — e da publicação da tag `governance-v0.1.0` na Governança)
- **Artefatos/logs:**
  - Suíte automatizada de API: [`tests/api/qa-008-auth-session-rotation-reuse.test.mjs`](../../tests/api/qa-008-auth-session-rotation-reuse.test.mjs)
  - Relatório de evidências: [`docs/evidences/qa-008-auth-session-api-report.md`](./qa-008-auth-session-api-report.md)
  - Matriz de rastreabilidade: [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)
- **Observações e riscos:** Nenhum token real ou senha foi gravado em log. A validação HTTP contra o serviço real do backend deve ser reexecutada assim que `BE-004` e `BE-006` forem disponibilizados em homologação.

### 3.1. Evidência da Cadeia de Refresh Rotativo, Detecção de Reuse e Revogação da Família (`CT-QA008-03`)

```json
{
  "step1_login_generation1": {
    "status": 200,
    "body": {
      "userId": "USR-QA008-01",
      "roles": ["ALUNO"],
      "mustChangePassword": false,
      "familyId": "FAM-SINT-1",
      "tokenType": "Bearer",
      "accessToken": "[REDACTED_AT_G1]",
      "accessExpiresIn": 900,
      "refreshToken": "[REDACTED_RT_G1]",
      "refreshExpiresIn": 604800
    }
  },
  "step2_legitimate_refresh_to_generation2": {
    "status": 200,
    "body": {
      "userId": "USR-QA008-01",
      "roles": ["ALUNO"],
      "familyId": "FAM-SINT-1",
      "generation": 2,
      "tokenType": "Bearer",
      "accessToken": "[REDACTED_AT_G2]",
      "accessExpiresIn": 900,
      "refreshToken": "[REDACTED_RT_G2]",
      "refreshExpiresIn": 604800
    }
  },
  "step3_reused_generation1_refresh_token": {
    "status": 401,
    "body": {
      "code": "AUTH_REFRESH_TOKEN_REUSED",
      "message": "Reutilização de refresh token detectada. Toda a família de sessão foi revogada por segurança.",
      "familyId": "FAM-SINT-1",
      "familyRevoked": true
    }
  },
  "step4_subsequent_attempt_with_generation2_tokens": {
    "refreshWithRT_G2": {
      "status": 401,
      "body": {
        "code": "AUTH_SESSION_FAMILY_REVOKED",
        "message": "Sessão encerrada ou família de tokens revogada.",
        "familyId": "FAM-SINT-1"
      }
    },
    "protectedCallWithAT_G2": {
      "status": 401,
      "body": {
        "code": "AUTH_TOKEN_REVOKED",
        "message": "Sessão revogada ou encerrada."
      }
    },
    "familyStateSnapshot": {
      "familyId": "FAM-SINT-1",
      "userId": "USR-QA008-01",
      "revoked": true,
      "revokeReason": "REFRESH_TOKEN_REUSE_DETECTED",
      "tokens": [
        { "jti": "RT-JTI-1-G1", "generation": 1, "status": "rotated", "replacedByJti": "RT-JTI-2-G2" },
        { "jti": "RT-JTI-2-G2", "generation": 2, "status": "revoked", "replacedByJti": null }
      ]
    }
  }
}
```

### 3.2. Logs Estruturados Sanitizados (`CT-QA008-06` — Ausência de Tokens e Segredos em Logs)

```json
[
  {
    "timestamp": "2026-10-30T18:00:00.000Z",
    "event": "AUTH_LOGIN_FAILURE",
    "cpfMasked": "***.***.008-01",
    "password": "[REDACTED]",
    "reasonCode": "BAD_CREDENTIALS",
    "status": 401
  },
  {
    "timestamp": "2026-10-30T18:00:00.000Z",
    "event": "AUTH_LOGIN_SUCCESS",
    "userId": "USR-QA008-01",
    "cpfMasked": "***.***.008-01",
    "password": "[REDACTED]",
    "familyId": "FAM-SINT-1",
    "accessJti": "AT-JTI-1-G1",
    "refreshJti": "RT-JTI-1-G1",
    "accessToken": "[REDACTED]",
    "refreshToken": "[REDACTED]",
    "mustChangePassword": false,
    "status": 200
  },
  {
    "timestamp": "2026-10-30T18:00:00.000Z",
    "event": "AUTH_REFRESH_ROTATED",
    "userId": "USR-QA008-01",
    "familyId": "FAM-SINT-1",
    "previousRefreshJti": "RT-JTI-1-G1",
    "newRefreshJti": "RT-JTI-2-G2",
    "newAccessJti": "AT-JTI-2-G2",
    "generation": 2,
    "accessToken": "[REDACTED]",
    "refreshToken": "[REDACTED]",
    "status": 200
  },
  {
    "timestamp": "2026-10-30T18:00:00.000Z",
    "event": "AUTH_REFRESH_REUSE_DETECTED",
    "userId": "USR-QA008-01",
    "familyId": "FAM-SINT-1",
    "reusedRefreshJti": "RT-JTI-1-G1",
    "generation": 1,
    "refreshToken": "[REDACTED]",
    "familyRevoked": true,
    "status": 401
  }
]
```

---

## 4. Defeitos, Bloqueios e Limitações Registrados (`templates/defect.md`)

### Defeito / Bloqueio 1: Endpoints reais de sessão, refresh rotativo e detecção de reuse (`BE-004` / `BE-006`) ainda não publicados no Backend

- **Issue/AC relacionado:** `QA-008` (`plataforma-quality#8`), `BE-004`, `BE-006`, `AUTH-08-BE` (`plataforma-backend#33`) / `SPEC-AUTH-001` e `SPEC-AUTH-002` (`AC-AUTH-002-01..06`)
- **Ambiente e versão:** Integração `plataforma-backend` — Sprint `S1`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Impede promoção do parecer de `WARN` para `PASS` em ambiente integrado)
- **Pré-condições:** Executar a bateria de testes de API contra o ambiente de homologação/desenvolvimento do backend.
- **Passos para reproduzir:**
  1. Verificar a disponibilidade dos endpoints `/api/v1/auth/login`, `/api/v1/auth/refresh` e `/api/v1/auth/logout` no repositório `plataforma-backend`.
  2. Tentar validar a persistência e revogação da cadeia de refresh tokens (`familyId`) em banco/cache real.
- **Resultado observado:** A implementação dos endpoints de autenticação e rotação de refresh token com detecção de reuse ainda está em andamento nas issues `BE-004` e `BE-006` (e as SPECs `SPEC-AUTH-001`/`002` aguardam fechamento formal em `PG-006`).
- **Resultado esperado:** O backend deve expor os endpoints de autenticação e sessão cumprindo todas as asserções da suíte `tests/api/qa-008-auth-session-rotation-reuse.test.mjs`, revogando toda a família ao detectar reutilização de refresh token e omitindo tokens/senhas dos logs.
- **Evidência sem dados sensíveis:** Matriz de rastreabilidade [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md) e suíte determinística [`tests/api/qa-008-auth-session-rotation-reuse.test.mjs`](../../tests/api/qa-008-auth-session-rotation-reuse.test.mjs).
- **Owner sugerido:** Squad **Backend** (`BE-004`, `BE-006`, `AUTH-08-BE`) e **Product Owner** (`PG-006` — Fellipe Raszejas).

---

## 5. Parecer de Qualidade e Segurança e Checklist de Aceite (`QA-008`)

- **Parecer Técnico:** **`WARN`**
  - **Cobertura Automatizada (`PASS`):** `6/6` cenários de API implementados e aprovados em [`tests/api/qa-008-auth-session-rotation-reuse.test.mjs`](../../tests/api/qa-008-auth-session-rotation-reuse.test.mjs), cobrindo login, recusa de inativos/credenciais inválidas, bloqueio por troca obrigatória de senha, refresh rotativo, detecção de reuse com revogação integral da família, logout, expiração de access/refresh token e sanitização rigorosa de logs.
  - **Motivo do `WARN` (Exige Decisão Humana):** Aprovação final dos ACs em `PG-006` (`SPEC-AUTH-001` e `SPEC-AUTH-002` ainda em `Draft`), entrega dos endpoints reais pelo Backend (`BE-004` / `BE-006`) e publicação da tag `governance-v0.1.0` na Governança.
- **Rastreabilidade de Revisão e PR:**
  - **Issue vinculada:** `Closes #8` ([`plataforma-quality#8`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/8))
  - **Responsável pela execução:** Ahslam Mendes
  - **Revisor designado (Qualidade/Segurança):** Gabriel Ribeiro de Camargo Miranda (`@GabrielRibeiro`) / Gustavo (`Security Review`)

