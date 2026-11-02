# Evidência: Validação de Inscrição em Atividade de Extensão (EXT-05)

- **Issue / AC:** [EXT-05 (Issue #25)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/25)
- **Commit do sistema sob teste:** `<aguardando deploy de EXT-05-BE / EXT-05-FE>`
- **Baseline de governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Ambiente e data/hora UTC:** Staging / `<data_hora_utc>`
- **Executor/ferramenta:** Vitor Fazano (`vfazano`) / Postman + Playwright
- **Resultado:** PENDENTE DE EXECUÇÃO (Bloqueado por dependências)
- **Artefatos/logs:** `<vincular requests/responses sanitizados>`
- **Observações e riscos:** Dependências `EXT-05-BE`, `EXT-05-FE` e `EXT-05-DB` em desenvolvimento. Casos de teste já modelados em `docs/test-cases/EXT-05-validacao-inscricao.md`.

---

## Registro de Execução por Cenário

### TC-EXT-05-01: Inscrição Válida
- **Status:** A executar
- **Request (Sanitizado):**
```http
POST /api/v1/extensao/atividades/ACT-OPEN-01/inscricoes
Authorization: Bearer <TOKEN_SINTETICO_USR_01>
Content-Type: application/json

{
  "usuarioId": "USR-ELEGIVEL-01",
  "termoAceite": true
}
```
- **Response (Sanitizado):**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "INS-9901",
  "status": "SOLICITADA",
  "criadoEm": "2026-11-02T17:00:00Z"
}
```
- **Evidência UI:** `<screenshot_sanitizada.png>`

---

### TC-EXT-05-02: Inscrição Antes do Prazo
- **Status:** A executar
- **Request (Sanitizado):**
```http
POST /api/v1/extensao/atividades/ACT-BEFORE-02/inscricoes
```
- **Response Esperado:** `422 Unprocessable Entity` ("Período de inscrições não iniciado")

---

### TC-EXT-05-03: Inscrição Depois do Prazo
- **Status:** A executar
- **Request (Sanitizado):**
```http
POST /api/v1/extensao/atividades/ACT-AFTER-03/inscricoes
```
- **Response Esperado:** `422 Unprocessable Entity` ("Período de inscrições encerrado")

---

### TC-EXT-05-04: Pessoa Inelegível
- **Status:** A executar
- **Request (Sanitizado):**
```http
POST /api/v1/extensao/atividades/ACT-OPEN-01/inscricoes
Authorization: Bearer <TOKEN_SINTETICO_USR_02_INELEGIVEL>
```
- **Response Esperado:** `403 Forbidden` ou `422 Unprocessable Entity`

---

### TC-EXT-05-05: Inscrição Repetida / Duplicada
- **Status:** A executar
- **Request (Sanitizado):**
```http
POST /api/v1/extensao/atividades/ACT-OPEN-01/inscricoes
Authorization: Bearer <TOKEN_SINTETICO_USR_03_DUPLICADO>
```
- **Response Esperado:** `409 Conflict` ("Usuário já inscrito nesta atividade")

---

### TC-EXT-05-06: Transição de Estado Proibida
- **Status:** A executar
- **Request (Sanitizado):**
```http
PATCH /api/v1/extensao/inscricoes/INS-CANCELADA/status
Content-Type: application/json

{
  "status": "CONCLUIDA"
}
```
- **Response Esperado:** `422 Unprocessable Entity` ("Transição de estado inválida")

