# Evidência: Relatório Consolidado de Regressão (QA-023 / QA-019–022)

- **Issue / AC:** QA-023 — Regressão Consolidada dos Testes QA-019 (Performance), QA-020 (Acessibilidade), QA-021 (Contratos) e QA-022 (Segurança & LGPD)
- **Commit do sistema sob teste:** `HEAD` (`feat/qa-023-regressao-consolidada-qa019-022`)
- **Baseline de governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Ambiente e data/hora UTC:** Staging / CI Environment — 2026-11-02T21:02:00Z
- **Executor/ferramenta:** Vitor Fazano (`vfazano`) / `scripts/regression-suite.mjs`
- **Resultado:** WARN (Execução da regressão concluída; 4 defeitos documentados com todos os campos obrigatórios e direcionados para as squads responsáveis)
- **Artefatos/logs:** `docs/defects/DEF-QA-023-regressao-consolidada.md`, `scripts/regression-suite.mjs`, `tests/repository/regression-suite.test.mjs`
- **Observações e riscos:** Nenhum bloqueio de severidade *Crítica* (P0) que impeça testes em staging foi detectado. Os defeitos de performance e contrato foram catalogados como P2 (Médios) e o de acessibilidade como P1 (Alto).

---

## 1. Dashboard Consolidado por Suíte de Regressão

| ID da Suíte | Nome / Escopo | SPECs Cobertas | Status na Regressão | Defeitos Identificados |
|---|---|---|:---:|:---:|
| **QA-019** | Performance & Carga (k6) | `SPEC-AUTH-001`, `SPEC-PI-001`, `SPEC-EXT-001`, `SPEC-PORTAL-001` | **WARN** | 1 defeito (p95 de 680ms > 500ms no Portal) |
| **QA-020** | Acessibilidade Digital (WCAG 2.1 AA) | `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002` | **WARN** | 2 defeitos (Aria-label e contraste em badge) |
| **QA-021** | Contratos de API (OpenAPI 3.1) | `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` | **WARN** | 1 defeito (Tipagem de `expiresIn` no Login) |
| **QA-022** | Segurança, Auditoria e LGPD | `SPEC-AUTH-004`, `SPEC-EXT-003`, `SPEC-PORTAL-002` | **PASS** | 0 defeitos (Segredos zerados e LGPD compliant) |

---

## 2. Resumo das Falhas com os Campos Obrigatórios

Conforme exigido pelo critério de aceite da issue **QA-023**, cada falha reportada contém os 5 campos estritos:

| ID Defeito | Título Observável | Severidade | Passos de Reprodução | Owner Sugerido | Issue Vinculada | Status |
|---|---|:---:|---|---|:---:|:---:|
| **DEF-1** | Latência p95 de 680ms no Portal | Média (P2) | k6 run a 200 RPS no `/api/v1/portal/projetos` | Squad Portal / Backend | `SPEC-PORTAL-001` / `QA-019` | Aberto |
| **DEF-2** | Botão fechar modal sem `aria-label` | Alta (P1) | Abrir modal de entregável e ler com NVDA | Squad Frontend (`FE-017`) | `SPEC-PI-004` / `QA-020` | Aberto |
| **DEF-3** | Contraste insuficiente no badge (1.85:1) | Média (P2) | Inspecionar badge "Em breve" em `/extensao/atividades` | Squad Frontend (`FE-017`) | `SPEC-EXT-001` / `QA-020` | Aberto |
| **DEF-4** | Tipo de dado divergente no OpenAPI (`expiresIn`) | Média (P2) | Enviar `POST /login` e comparar com contrato OpenAPI 3.1 | Squad Backend (`BE-006`) | `SPEC-AUTH-001` / `QA-021` | Em correção |

*O detalhamento técnico e trechos de código para reprodução de cada falha encontram-se em [`docs/defects/DEF-QA-023-regressao-consolidada.md`](../defects/DEF-QA-023-regressao-consolidada.md).*

---

## 3. Parecer de Qualidade e Próximos Passos

A suíte consolidada de regressão comprova a maturidade dos testes independentes na Sprint S5. A esteira de Segurança (`QA-022`) encontra-se 100% aprovada (`PASS`), enquanto os defeitos apontados em Performance, Acessibilidade e Contratos estão devidamente rastreados e prontos para correção pelas respectivas squads antes da release final.

