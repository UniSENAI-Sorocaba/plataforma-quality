# Matriz critério de aceite → evidência

| Issue | SPEC/AC | Nível | Automação | Evidência | Estado |
| --- | --- | --- | --- | --- | --- |
| QA-003 | SPEC-AUTH-001..004, SPEC-PI-001..004, SPEC-EXT-001..003, SPEC-PORTAL-001..002 / ADR-008, MH-GOV-002, MH-QA-001..003 | Repositório / Gate CI | `scripts/spec-compliance.mjs` + `tests/repository/compliance.test.mjs` | `docs/evidences/qa-003-spec-compliance-report.md` ([PR #39](https://github.com/UniSENAI-Sorocaba/plataforma-quality/pull/39)) | Em revisão |
| AUTH-08-QA ([#31](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/31)) | SPEC-AUTH-001 (`AC-AUTH-001-01..05`), SPEC-AUTH-002, SPEC-AUTH-003 (`AC-AUTH-003-01..06`), SPEC-AUTH-004 (`AC-AUTH-004-02`), SPEC-PI-001 (`AC-PI-001-07, 13..15`), SPEC-PI-003 (`AC-PI-003-03..04`), SPEC-PI-004 (`AC-PI-004-01`), SPEC-EXT-002 (`AC-EXT-002-03..04`) | API / E2E | `tests/api/auth-08-rbac-navigation.test.mjs` + `tests/e2e/auth-08-profile-navigation.spec.mjs` | `docs/evidences/auth-08-qa-profile-navigation-matrix.md` | WARN (aguarda `AUTH-08-BE`, `AUTH-08-FE-01..03, 06..07` e `PG-006`) |

O GitHub Project mantém o estado operacional. Esta matriz documenta somente rastreabilidade e deve apontar para Issues reais quando forem criadas.
