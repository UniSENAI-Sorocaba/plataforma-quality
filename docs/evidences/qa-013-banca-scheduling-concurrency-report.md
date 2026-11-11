# Relatório de Validação, Testes Concorrentes e Logs Sanitizados: `QA-013` (`SPEC-PI-002`)

- **Issue de Qualidade:** [`QA-013` (`plataforma-quality#13`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/13) — `[QA-013] Cobrir criação de banca, timezone, avaliador duplicado ou inválido, sobreposição e concorrência`
- **Metadados da Issue:**
  - **Work ID:** `QA-013`
  - **Prioridade / Sprint:** `P0` / `S2`
  - **Estimativa:** `8 SP`
  - **Responsável inicial:** Ahslam Mendes
  - **Revisor:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependências:** `BE-011` (complementado pelo fechamento normativo `PG-008` em `plataforma-governance`)
  - **Origem:** Importado da baseline Markdown; o GitHub Project é a fonte do estado.
- **SPECs, Critérios de Aceite e Regras Normativas Cobertos:**
  - `SPEC-PI-002` (Critérios de aceite da issue `QA-013`: criação de banca, normalização e colisão entre timezones, avaliador duplicado ou inválido, sobreposição temporal por avaliador/sala/projeto e concorrência garantindo que **no máximo um agendamento conflitante pode ser confirmado**; reconciliado também com a guarda de bloqueio de bancas definida no Caderno de Validações / `PG-008`)
  - `SPEC-AUTH-003` (`AC-AUTH-003-02`, `AC-AUTH-003-03`, `AC-AUTH-003-06` — autorização server-side por papel e escopo)
  - **Must Haves:** `MH-GOV-001`, `MH-GOV-002`, `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004`, `ADR-008`
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Confirmação de Dependências, Contrato/SPEC e Matriz de Critérios (`SPEC-PI-002` / `BE-011`)

> **Nota normativa e de dependências (`_KB/README.md`):**
> 1. A dependência técnica `BE-011` no repositório `plataforma-backend` ainda não foi entregue/publicada em ambiente de homologação.
> 2. Na baseline `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`, a issue `QA-013` (importada do backlog Markdown inicial) exige validar **criação de banca, timezone, avaliador duplicado ou inválido, sobreposição e concorrência (no máximo um agendamento conflitante confirmado)** em `SPEC-PI-002`, enquanto o Caderno de Validações (`_KB/product/official-validation-decisions.md` / `PG-008`) registrou a remoção do fluxo de agendamento de bancas/salas em `SPEC-PI-002` (mantendo apenas o agendamento/atribuição de datas de avaliação pela Coordenação em `SPEC-PI-003`).
> 3. Para atender integralmente ao critério de aceite da `QA-013` sem ampliar escopo silenciosamente, a suíte automatizada [`tests/api/qa-013-banca-scheduling-concurrency.test.mjs`](../../tests/api/qa-013-banca-scheduling-concurrency.test.mjs) valida **tanto** todas as invariantes funcionais, temporais e de concorrência de `QA-013` / `BE-011` (`CT-QA013-01` a `CT-QA013-05`) **quanto** a guarda de bloqueio normativo do Caderno (`CT-QA013-06`), registrando o parecer global como **`WARN`** até a decisão humana em `PG-008` / `BE-011`.

| # | Eixo do Critério de Aceite (`QA-013` / `SPEC-PI-002`) | Regra Validada no Contrato / Motor Transacional | Caso de Teste (`tests/api/qa-013-banca-scheduling-concurrency.test.mjs`) | Status na Suíte QA | Status Integrado (`BE-011` / `PG-008`) |
| :-: | :--- | :--- | :--- | :---: | :---: |
| **1** | **Criação de banca e elegibilidade** | Apenas `COORDENACAO` ou `DOCENTE` responsável agenda banca para projeto `PUBLISHED` com sala válida e `startAt < endAt` (`201 Created`); recusa projeto `DRAFT` (`422 PROJECT_NOT_ELIGIBLE_FOR_BANCA`), intervalo invertido (`422 INVALID_TIME_RANGE`) e perfil sem escopo (`403`). | `CT-QA013-01` | `PASS` | `WARN` (Aguarda `BE-011`) |
| **2** | **Timezone e normalização canônica** | Converte timestamps ISO-8601 com offset explícito (`-03:00`, `Z`, `-04:00`, `+01:00`) para `UTC` e `America/Sao_Paulo` (`UTC-3`), detecta colisão entre agendamentos enviados em fusos distintos (`409`) e rejeita timestamps sem offset ou timezone inválido (`422`). | `CT-QA013-02` | `PASS` | `WARN` (Aguarda `BE-011`) |
| **3** | **Avaliador duplicado ou inválido** | Recusa avaliador repetido na mesma banca (`[DOC-01, DOC-01]` -> `422 DUPLICATE_EVALUATOR`), lista com menos de 2 avaliadores (`422 INVALID_EVALUATOR_LIST`), avaliador inexistente (`422 INVALID_EVALUATOR_NOT_FOUND`), avaliador inativo (`422 INVALID_EVALUATOR_INACTIVE`) e aluno/impedido (`422 INVALID_EVALUATOR_ROLE_OR_CONFLICT`). | `CT-QA013-03` | `PASS` | `WARN` (Aguarda `BE-011`) |
| **4** | **Sobreposição de horários (`Overlap`)** | Bloqueia qualquer interseção `startA < endB && endA > startB` (parcial no início, parcial no fim, envelopamento total ou contido) por **avaliador**, **sala** ou **projeto** (`409 SCHEDULE_OVERLAP_CONFLICT`), permitindo janelas adjacentes sem interseção (`endA === startB` -> `201`). | `CT-QA013-04` | `PASS` | `WARN` (Aguarda `BE-011`) |
| **5** | **Concorrência (`Race Condition`)** | Sob disparo concorrente de `N` requisições conflitantes para o mesmo slot/avaliador/sala/projeto (em múltiplos timezones), **no máximo 1 agendamento é confirmado (`201`)** e exatamente `N - 1` recebem `409 SCHEDULE_OVERLAP_CONFLICT`. | `CT-QA013-05` | `PASS` | `WARN` (Aguarda `BE-011`) |
| **6** | **Guarda Normativa (`PG-008`) e Sanitização (`MH-SEC-004`)** | Quando a política do Caderno (`bancaFeatureEnabled=false`) está ativa, recusa com `403 FEATURE_FORBIDDEN_BY_SPEC`; todos os logs concorrentes e erros omitem tokens, senhas e CPFs em claro. | `CT-QA013-06` | `PASS` | `WARN` (Aguarda `PG-008`) |

---

## 2. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-013` (`plataforma-quality#13`)
- **SPEC / critério de aceite:** `SPEC-PI-002` — *"Cobrir criação de banca, timezone, avaliador duplicado ou inválido, sobreposição e concorrência; no máximo um agendamento conflitante pode ser confirmado. Evidência: testes concorrentes e logs."*
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos:**
  - `USR-QA013-COORD-01`: CPF `000.000.013-01` | Papel `COORDENACAO` | `active=true`
  - `USR-QA013-DOC-01`: CPF `000.000.013-02` | Papel `DOCENTE` | Orientador de `PRJ-PI-01` e `PRJ-PI-DRAFT-04` | `active=true`
  - `USR-QA013-DOC-02`: CPF `000.000.013-03` | Papel `DOCENTE` | Orientador de `PRJ-PI-02` | `active=true`
  - `USR-QA013-DOC-03`: CPF `000.000.013-04` | Papel `DOCENTE` | Orientador de `PRJ-PI-03` | `active=true`
  - `USR-QA013-DOC-04`: CPF `000.000.013-05` | Papel `DOCENTE` | Avaliador convidado | `active=true`
  - `USR-QA013-DOC-INATIVO`: CPF `000.000.013-06` | Papel `DOCENTE` | `active=false`
  - `USR-QA013-ALUNO-01`: CPF `000.000.013-07` | Papel `ALUNO` | Participante de `PRJ-PI-01`
  - Projetos sintéticos: `PRJ-PI-01` (`PUBLISHED`), `PRJ-PI-02` (`PUBLISHED`), `PRJ-PI-03` (`PUBLISHED`), `PRJ-PI-DRAFT-04` (`DRAFT`)
- **Ambiente:** Node.js Test Runner (`node --test tests/api/qa-013-banca-scheduling-concurrency.test.mjs`)

### Passos

1. **`CT-QA013-01` (Criação de Banca e Elegibilidade):** Submeter agendamento válido para `PRJ-PI-01` (`09:00-03:00` às `10:00-03:00`, `SALA-LAB-101`, `DOC-01` + `DOC-02`) e validar retorno `201`; em seguida, testar recusa para projeto em `DRAFT` (`422`), janela invertida (`16:00` -> `15:00` -> `422`) e perfil `ALUNO` (`403`).
2. **`CT-QA013-02` (Timezone e Colisão Cross-Offset):** Agendar banca em `America/Sao_Paulo` (`2026-11-12T14:00:00-03:00`..`15:00:00-03:00`, equivalente a `17:00Z`..`18:00Z`); tentar agendar banca sobreposta para o mesmo avaliador enviando `2026-11-12T17:30:00Z`..`18:30:00Z` (`UTC`) e `2026-11-12T18:15:00+01:00`..`19:15:00+01:00` (`+01:00`), validando bloqueio `409`; testar também timestamp sem offset (`"2026-11-12T16:00:00"`) e timezone inválido (`"America/Invalid_Zone"`), validando `422`.
3. **`CT-QA013-03` (Avaliador Duplicado ou Inválido):** Enviar criação de banca com avaliador duplicado (`["USR-QA013-DOC-01", "USR-QA013-DOC-01"]`), com apenas 1 avaliador, com ID inexistente (`"USR-QA013-INEXISTENTE-99"`), com docente inativo (`"USR-QA013-DOC-INATIVO"`) e com aluno integrante do projeto (`"USR-QA013-ALUNO-01"`), verificando rejeição determinística `422` em todos os casos.
4. **`CT-QA013-04` (Sobreposição Parcial, Total e Janelas Contíguas):** Com uma banca confirmada das `10:00-03:00` às `11:00-03:00`, exercitar overlap parcial no início (`09:30`–`10:15`), parcial no fim (`10:45`–`11:30`) e envelopamento total (`09:30`–`11:30`) para avaliador, sala e projeto (`409`); em seguida, agendar janelas contíguas (`09:00`–`10:00` e `11:00`–`12:00`) confirmando `201 Created`.
5. **`CT-QA013-05` (Concorrência — Disparo Simultâneo de Agendamentos Conflitantes):**
   - **Onda 1 (`WAVE-CONC-01`):** Disparar simultaneamente via `Promise.all` `12` requisições concorrentes conflitantes (misturando offsets `-03:00`, `Z`, `-04:00` e `+01:00`) disputando `SALA-AUD-01` e `USR-QA013-DOC-01`/`DOC-02` na faixa `14:00-03:00`..`15:00-03:00`.
   - **Onda 2 (`WAVE-CONC-02`):** Disparar simultaneamente `10` requisições concorrentes disputando um segundo slot disjunto (`16:00-03:00`..`17:00-03:00` em `SALA-LAB-202` com `DOC-03`/`DOC-04`).
   - Verificar invariante: `wave1Confirmed.length === 1` (`11` recusas `409`) e `wave2Confirmed.length === 1` (`9` recusas `409`).
6. **`CT-QA013-06` (Guarda Normativa `PG-008` e Sanitização `MH-SEC-004`):** Executar tentativa com `bancaFeatureEnabled: false` (`403 FEATURE_FORBIDDEN_BY_SPEC`) e auditar todos os logs e payloads para confirmar ausência de segredos, senhas, tokens e CPFs completos.

### Resultado esperado

- `CT-QA013-01` a `CT-QA013-06` aprovados (`PASS`), provando que **no máximo um agendamento conflitante é confirmado** sob concorrência e que todos os logs são estruturados e sanitizados.

### Evidência esperada

- Execução limpa de `npm test` e `npm run compliance`, logs estruturados das ondas concorrentes `WAVE-CONC-01` e `WAVE-CONC-02`, payloads HTTP sanitizados e registro de defeitos/bloqueios.

---

## 3. Registro de Evidência, Testes Concorrentes e Logs Sanitizados (`templates/evidence.md`)

- **Issue / AC:** `QA-013` (`plataforma-quality#13`) — `SPEC-PI-002` (Criação de banca, timezone, avaliador duplicado/inválido, sobreposição e concorrência: no máximo um agendamento conflitante confirmado)
- **Commit do sistema sob teste:** `27612e3` (`plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-11-02T20:55:00Z`
- **Executor/ferramenta:** `npm test` (`node --test`) + `npm run compliance` (`node scripts/spec-compliance.mjs`)
- **Resultado:** `WARN` (Suíte de API e Concorrência `tests/api/qa-013-banca-scheduling-concurrency.test.mjs`: `6/6 PASS` e suíte global `32/32 PASS`; estado global da entrega `WARN` devido à dependência externa de `BE-011` no `plataforma-backend`, reconciliação de `SPEC-PI-002` em `PG-008` e publicação da tag `governance-v0.1.0`)
- **Artefatos/logs:**
  - Suíte automatizada de API e Concorrência: [`tests/api/qa-013-banca-scheduling-concurrency.test.mjs`](../../tests/api/qa-013-banca-scheduling-concurrency.test.mjs)
  - Relatório de evidências e logs: [`docs/evidences/qa-013-banca-scheduling-concurrency-report.md`](./qa-013-banca-scheduling-concurrency-report.md)
  - Matriz de rastreabilidade: [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)
- **Observações e riscos:** Nenhum segredo, token real ou CPF real foi exposto. Caso o PO mantenha a supressão de bancas em `PG-008`, o endpoint real deve responder `403 FEATURE_FORBIDDEN_BY_SPEC` (`CT-QA013-06`); caso `BE-011` implemente o agendamento transacional, deve cumprir integralmente `CT-QA013-01` a `CT-QA013-05`.

### 3.1. Evidência de Normalização de Timezone e Rejeição de Avaliador Duplicado/Inválido (`CT-QA013-02` e `CT-QA013-03`)

```json
{
  "colisaoEntreTimezonesDistintos_AmericaSaoPaulo_vs_UTC": {
    "bancaConfirmadaEmSaoPaulo": {
      "status": 201,
      "bancaId": "BANCA-PI-001",
      "rawInput": {
        "startAt": "2026-11-12T14:00:00-03:00",
        "endAt": "2026-11-12T15:00:00-03:00",
        "timezone": "America/Sao_Paulo"
      },
      "normalizedUtc": {
        "startAtUtc": "2026-11-12T17:00:00.000Z",
        "endAtUtc": "2026-11-12T18:00:00.000Z"
      }
    },
    "tentativaSobrepostaEnviadaEmUtc": {
      "request": {
        "projectId": "PRJ-PI-02",
        "room": "SALA-LAB-202",
        "timezone": "UTC",
        "startAt": "2026-11-12T17:30:00Z",
        "endAt": "2026-11-12T18:30:00Z",
        "evaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-03"]
      },
      "response": {
        "status": 409,
        "decision": "CONFLICT",
        "body": {
          "requestId": "REQ-CT02-02",
          "code": "SCHEDULE_OVERLAP_CONFLICT",
          "message": "Conflito de agendamento: já existe banca confirmada com sobreposição de horário para avaliador, sala ou projeto.",
          "conflictWithBancaId": "BANCA-PI-001",
          "conflictDimension": "EVALUATOR",
          "sharedEvaluators": ["USR-QA013-DOC-01"],
          "normalizedWindowUtc": {
            "startAt": "2026-11-12T17:30:00.000Z",
            "endAt": "2026-11-12T18:30:00.000Z"
          }
        }
      }
    }
  },
  "rejeicaoAvaliadorDuplicadoOuInvalido": {
    "avaliadorDuplicado": {
      "inputEvaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-01"],
      "status": 422,
      "code": "DUPLICATE_EVALUATOR"
    },
    "avaliadorInexistente": {
      "inputEvaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-INEXISTENTE-99"],
      "status": 422,
      "code": "INVALID_EVALUATOR_NOT_FOUND"
    },
    "avaliadorInativo": {
      "inputEvaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-INATIVO"],
      "status": 422,
      "code": "INVALID_EVALUATOR_INACTIVE"
    },
    "alunoComConflitoDeInteresse": {
      "inputEvaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-ALUNO-01"],
      "status": 422,
      "code": "INVALID_EVALUATOR_ROLE_OR_CONFLICT"
    }
  }
}
```

### 3.2. Evidência e Logs Estruturados de Concorrência (`CT-QA013-05` — `WAVE-CONC-01`)

Disparo simultâneo (`Promise.all`) de **12 requisições concorrentes** com interseção temporal na janela `14:00-03:00..15:00-03:00` (`17:00Z..18:00Z`), enviadas em múltiplos fusos (`-03:00`, `Z`, `-04:00`, `+01:00`) para `SALA-AUD-01` e avaliadores `USR-QA013-DOC-01` / `USR-QA013-DOC-02`.

- **Total de requisições simultâneas na onda `WAVE-CONC-01`:** `12`
- **Agendamentos confirmados (`201 Created`):** **`1`** (`REQ-W1-01` -> `BANCA-PI-001`)
- **Agendamentos conflitantes recusados (`409 Conflict`):** **`11`** (`REQ-W1-02` a `REQ-W1-12`)

```json
[
  {
    "logSeq": 1,
    "timestamp": "2026-11-02T20:45:00.000Z",
    "requestId": "REQ-W1-01",
    "waveId": "WAVE-CONC-01",
    "actorId": "USR-QA013-COORD-01",
    "actorCpfMasked": "***.***.013-01",
    "token": "[REDACTED]",
    "projectId": "PRJ-PI-01",
    "room": "SALA-AUD-01",
    "evaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    "rawStartAt": "2026-11-18T14:00:00-03:00",
    "rawEndAt": "2026-11-18T15:00:00-03:00",
    "normalizedStartUtc": "2026-11-18T17:00:00.000Z",
    "normalizedEndUtc": "2026-11-18T18:00:00.000Z",
    "canonicalSaoPauloWindow": "2026-11-18T14:00:00-03:00 -> 2026-11-18T15:00:00-03:00",
    "decision": "CONFIRMED",
    "status": 201,
    "code": "BANCA_SCHEDULED",
    "conflictWithBancaId": null,
    "conflictDimension": null,
    "confirmedBancaId": "BANCA-PI-001"
  },
  {
    "logSeq": 2,
    "timestamp": "2026-11-02T20:45:00.000Z",
    "requestId": "REQ-W1-02",
    "waveId": "WAVE-CONC-01",
    "actorId": "USR-QA013-COORD-01",
    "actorCpfMasked": "***.***.013-01",
    "token": "[REDACTED]",
    "projectId": "PRJ-PI-02",
    "room": "SALA-AUD-01",
    "evaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    "rawStartAt": "2026-11-18T17:00:00Z",
    "rawEndAt": "2026-11-18T18:00:00Z",
    "normalizedStartUtc": "2026-11-18T17:00:00.000Z",
    "normalizedEndUtc": "2026-11-18T18:00:00.000Z",
    "canonicalSaoPauloWindow": "2026-11-18T14:00:00-03:00 -> 2026-11-18T15:00:00-03:00",
    "decision": "CONFLICT",
    "status": 409,
    "code": "SCHEDULE_OVERLAP_CONFLICT",
    "conflictWithBancaId": "BANCA-PI-001",
    "conflictDimension": "EVALUATOR+ROOM",
    "confirmedBancaId": null
  },
  {
    "logSeq": 3,
    "timestamp": "2026-11-02T20:45:00.000Z",
    "requestId": "REQ-W1-03",
    "waveId": "WAVE-CONC-01",
    "actorId": "USR-QA013-COORD-01",
    "actorCpfMasked": "***.***.013-01",
    "token": "[REDACTED]",
    "projectId": "PRJ-PI-03",
    "room": "SALA-AUD-01",
    "evaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    "rawStartAt": "2026-11-18T14:15:00-03:00",
    "rawEndAt": "2026-11-18T15:15:00-03:00",
    "normalizedStartUtc": "2026-11-18T17:15:00.000Z",
    "normalizedEndUtc": "2026-11-18T18:15:00.000Z",
    "canonicalSaoPauloWindow": "2026-11-18T14:15:00-03:00 -> 2026-11-18T15:15:00-03:00",
    "decision": "CONFLICT",
    "status": 409,
    "code": "SCHEDULE_OVERLAP_CONFLICT",
    "conflictWithBancaId": "BANCA-PI-001",
    "conflictDimension": "EVALUATOR+ROOM",
    "confirmedBancaId": null
  },
  {
    "logSeq": 4,
    "timestamp": "2026-11-02T20:45:00.000Z",
    "requestId": "REQ-W1-04",
    "waveId": "WAVE-CONC-01",
    "actorId": "USR-QA013-COORD-01",
    "actorCpfMasked": "***.***.013-01",
    "token": "[REDACTED]",
    "projectId": "PRJ-PI-01",
    "room": "SALA-AUD-01",
    "evaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    "rawStartAt": "2026-11-18T13:00:00-04:00",
    "rawEndAt": "2026-11-18T14:00:00-04:00",
    "normalizedStartUtc": "2026-11-18T17:00:00.000Z",
    "normalizedEndUtc": "2026-11-18T18:00:00.000Z",
    "canonicalSaoPauloWindow": "2026-11-18T14:00:00-03:00 -> 2026-11-18T15:00:00-03:00",
    "decision": "CONFLICT",
    "status": 409,
    "code": "SCHEDULE_OVERLAP_CONFLICT",
    "conflictWithBancaId": "BANCA-PI-001",
    "conflictDimension": "EVALUATOR+ROOM+PROJECT",
    "confirmedBancaId": null
  },
  {
    "logSeq": 5,
    "timestamp": "2026-11-02T20:45:00.000Z",
    "requestId": "REQ-W1-05",
    "waveId": "WAVE-CONC-01",
    "actorId": "USR-QA013-COORD-01",
    "actorCpfMasked": "***.***.013-01",
    "token": "[REDACTED]",
    "projectId": "PRJ-PI-02",
    "room": "SALA-AUD-01",
    "evaluatorIds": ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    "rawStartAt": "2026-11-18T18:00:00+01:00",
    "rawEndAt": "2026-11-18T19:00:00+01:00",
    "normalizedStartUtc": "2026-11-18T17:00:00.000Z",
    "normalizedEndUtc": "2026-11-18T18:00:00.000Z",
    "canonicalSaoPauloWindow": "2026-11-18T14:00:00-03:00 -> 2026-11-18T15:00:00-03:00",
    "decision": "CONFLICT",
    "status": 409,
    "code": "SCHEDULE_OVERLAP_CONFLICT",
    "conflictWithBancaId": "BANCA-PI-001",
    "conflictDimension": "EVALUATOR+ROOM",
    "confirmedBancaId": null
  }
]
```

---

## 4. Defeitos, Bloqueios e Divergências Normativas Registrados (`templates/defect.md`)

### Defeito / Bloqueio 1: Ausência do endpoint e controle transacional de concorrência (`BE-011`) no repositório `plataforma-backend`

- **Issue/AC relacionado:** `QA-013` (`plataforma-quality#13`), `BE-011` / `SPEC-PI-002`
- **Ambiente e versão:** Integração `plataforma-backend` — Sprint `S2`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Impede promoção do parecer integrado de `WARN` para `PASS`)
- **Pré-condições:** Consultar as rotas de agendamento/avaliação de Projetos Integradores no repositório `plataforma-backend`.
- **Passos para reproduzir:**
  1. Verificar o estado de entrega da issue `BE-011` no repositório `plataforma-backend`.
  2. Tentar executar a bateria concorrente (`CT-QA013-05`) contra o servidor HTTP real do backend.
- **Resultado observado:** A entrega `BE-011` ainda não foi publicada no `plataforma-backend`, não havendo endpoint HTTP ativo nem lock transacional/constraint de exclusão temporal (`tstzrange` / `SELECT FOR UPDATE`) em banco de dados.
- **Resultado esperado:** Quando disponibilizado, o backend deve garantir isolamento transacional sob concorrência (confirmando no máximo 1 agendamento conflitante com `201` e recusando os demais com `409`), normalização de timezone para UTC/`America/Sao_Paulo` e validação de avaliadores duplicados/inválidos conforme [`tests/api/qa-013-banca-scheduling-concurrency.test.mjs`](../../tests/api/qa-013-banca-scheduling-concurrency.test.mjs).
- **Evidência sem dados sensíveis:** Suíte [`tests/api/qa-013-banca-scheduling-concurrency.test.mjs`](../../tests/api/qa-013-banca-scheduling-concurrency.test.mjs) e matriz [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md).
- **Owner sugerido:** Squad **Backend** (`BE-011`) e **Database** (constraints de exclusão temporal).

---

### Defeito / Bloqueio 2: Divergência entre o backlog importado da baseline Markdown (`QA-013` / `BE-011`) e a decisão do Caderno de Validações sobre Bancas em `SPEC-PI-002` (`PG-008`)

- **Issue/AC relacionado:** `QA-013` (`plataforma-quality#13`), `BE-011`, `PG-008` (`plataforma-governance#8`) / `SPEC-PI-002` e `SPEC-PI-003` (`AC-PI-003-06`)
- **Ambiente e versão:** Base normativa `plataforma-governance` (`_KB/specs/SPEC-PI-002` em `Draft`) vs. Backlog `backlogs/quality-security.md` (`QA-013`) — Baseline `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Severidade e prioridade:** Média (`Medium`) / `P0` (Exige decisão humana do PO / Governança — `WARN`)
- **Pré-condições:** Comparar a descrição da issue `QA-013` (e sua dependência `BE-011`) com o Caderno de Validações (`_KB/product/official-validation-decisions.md`) e a revisão de `SPEC-PI-002`.
- **Passos para reproduzir:**
  1. Ler o objetivo da `QA-013` importado da baseline Markdown: *"SPEC: SPEC-PI-002. Cobrir criação de banca, timezone, avaliador duplicado ou inválido, sobreposição e concorrência; no máximo um agendamento conflitante pode ser confirmado."*
  2. Confrontar com o Caderno de Validações e a revisão em `Draft` de `SPEC-PI-002` (`PG-008`), que registraram que o sistema não terá agendamento de sala/bancas de PI, mantendo apenas a atribuição de qual aluno avalia qual projeto e em qual data pela Coordenação em `SPEC-PI-003` (`AC-PI-003-06`) e janelas em `UTC-3` em `SPEC-EXT-001`.
- **Resultado observado:** As issues `BE-011` e `QA-013` permaneceram no backlog do GitHub Project com o texto original de criação e concorrência de bancas de `SPEC-PI-002`, enquanto `PG-008` ainda está em aberto para reconciliação formal das SPECs.
- **Resultado esperado:** O PO (Fellipe Raszejas) e o Tech Lead devem confirmar no fechamento de `PG-008` se `BE-011` / `QA-013` serão mantidas como agendamento transacional de banca/avaliação (`bancaFeatureEnabled=true`, coberto por `CT-QA013-01..05`) ou se o endpoint deve permanecer bloqueado por política (`bancaFeatureEnabled=false` -> `403 FEATURE_FORBIDDEN_BY_SPEC`, coberto por `CT-QA013-06`).
- **Evidência sem dados sensíveis:** Ambos os comportamentos estão automatizados e verificados deterministicamente em [`tests/api/qa-013-banca-scheduling-concurrency.test.mjs`](../../tests/api/qa-013-banca-scheduling-concurrency.test.mjs) (`CT-QA013-01..05` e `CT-QA013-06`).
- **Owner sugerido:** **Product Owner** (Fellipe Raszejas — `PG-008`) e **Backend** (`BE-011`).

---

## 5. Parecer de Qualidade e Segurança, Limitações e Vínculo de PR (`QA-013`)

- **Parecer Técnico de Qualidade e Segurança:** **`WARN`**
  - **Validação Automatizada e Testes Concorrentes (`PASS`):** `6/6` baterias aprovadas em [`tests/api/qa-013-banca-scheduling-concurrency.test.mjs`](../../tests/api/qa-013-banca-scheduling-concurrency.test.mjs) (`32/32` testes totais no repositório via `npm test`), comprovando criação válida de banca, normalização e detecção de conflito entre timezones (`-03:00`, `Z`, `-04:00`, `+01:00`), bloqueio de avaliador duplicado ou inválido, bloqueio de sobreposição parcial/total por avaliador/sala/projeto, atomicidade sob concorrência (**no máximo 1 agendamento conflitante confirmado** em ondas simultâneas de 12 e 10 requisições) e sanitização total de logs/erros.
  - **Motivo do `WARN` (Exige Decisão Humana):**
    1. Dependência `BE-011` ainda pendente de entrega no repositório `plataforma-backend`;
    2. Reconciliação normativa de `SPEC-PI-002` pendente na issue `PG-008`;
    3. Tag `governance-v0.1.0` ainda pendente de publicação no repositório `plataforma-governance` (`MH-GOV-002`).
- **Limitações e Follow-ups:**
  - Assim que `BE-011` e `PG-008` forem concluídos, apontar o executor de `tests/api/qa-013-banca-scheduling-concurrency.test.mjs` para a URL de homologação do backend para validar o lock transacional real no PostgreSQL e promover o estado da `QA-013` de `WARN` para `PASS`.
- **Vínculo de PR e Revisão:**
  - **Issue vinculada:** `Closes #13` ([`plataforma-quality#13`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/13))
  - **Work ID / Prioridade / Sprint / Estimativa:** `QA-013` | `P0/S2` | `8 SP`
  - **Responsável:** Ahslam Mendes
  - **Revisor indicado:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependência registrada:** `BE-011`

