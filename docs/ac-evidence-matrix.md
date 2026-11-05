# Matriz critério de aceite → evidência

| Issue | SPEC/AC | Nível | Automação | Evidência | Estado |
| --- | --- | --- | --- | --- | --- |
| QA-016 | SPEC-PI-003 / contrato `evaluations`: precisão e arredondamento da entrada (PRE-01..05, PRE-02, PRE-07) | API | `tests/api/notas.qa016.test.mjs` | `docs/evidence/QA-016-2026-11-04.md` | Escrito, não executado na API real (ambiente indisponível) |
| QA-016 | SPEC-PI-003 / AC-PI-003-02: cálculo determinístico e arredondamento do `finalGrade` (DET-01..03, PRE-06) | API | `tests/api/notas.qa016.test.mjs` | `docs/evidence/QA-016-2026-11-04.md` | BLOQUEADO: BE-015 e fórmula/arredondamento (Q1, Q2) |
| QA-016 | Contrato `evaluations`: nota fora do limite (LIM-01..06) | API | `tests/api/notas.qa016.test.mjs` | `docs/evidence/QA-016-2026-11-04.md` | Escrito, não executado na API real |
| QA-016 | SPEC-PI-003 / AC-PI-003-06: avaliador não vinculado (VIN-01..07) | API | `tests/api/notas.qa016.test.mjs` | `docs/evidence/QA-016-2026-11-04.md` | Escrito, não executado; VIN-05/06 serão WARN até Q3/Q4 |
| QA-016 | SPEC-PI-003 / AC-PI-003-03 e 04: permissão e privacidade (PER-01..05) | API | `tests/api/notas.qa016.test.mjs` (skip) | `docs/evidence/QA-016-2026-11-04.md` | BLOQUEADO: BE-004/BE-010 |
| QA-016 | SPEC-PI-003 / AC-PI-003-05: versão anterior (VER-01..04 em falha de PUT; VER-05 histórico) | API | `tests/api/notas.qa016.test.mjs` | `docs/evidence/QA-016-2026-11-04.md` | VER-01..04 escritos, não executados; VER-05 BLOQUEADO (Q5) |

O GitHub Project mantém o estado operacional. Esta matriz documenta somente rastreabilidade e deve apontar para Issues reais quando forem criadas. Os AC-PI-003-01..06 vêm da `main` da governança (`cca216f`), mais nova que a baseline fixada (ver Q9 em `docs/questions/QA-016-perguntas.md`).
