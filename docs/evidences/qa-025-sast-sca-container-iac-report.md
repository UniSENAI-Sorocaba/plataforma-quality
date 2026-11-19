# Relatório Consolidado SAST, SCA, Container e IaC: `QA-025`

- **Issue de Qualidade:** [`QA-025` (`plataforma-quality#25`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/25)
- **Prioridade / Sprint / Estimativa:** `P0` / `Sprint S5` / `8 SP`
- **SPECs e Critérios de Aceite Cobertos:** Todas as SPECs implementadas e seus contratos/artefatos associados (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`)
- **Dependências:** `INF-003` (Pipeline CI base / checks de PR) e `INF-006` (Scanners de container e IaC na esteira)
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Responsável:** Gustavo Henrique (`@GustavooGomess`)
- **Revisor Designado:** Gabriel Ribeiro (`@gabrrkl7`)

---

## 1. Política das Quatro Frentes de Segurança ([`tests/security/scanners/qa-025-scanners-policy.json`](../../tests/security/scanners/qa-025-scanners-policy.json))

| Frente | Ferramenta / Versão | Escopo Avaliado | Critério de Bloqueio |
| :--- | :--- | :--- | :--- |
| **SAST** | CodeQL / Semgrep (`2.x`) | `plataforma-backend`, `plataforma-frontend`, `plataforma-quality` | Qualquer `High` ou `Critical` sem correção ou aceite formal vigente resulta em **`FAIL`**. |
| **SCA** | GitHub Dependency Review / `npm audit` (`10.x`) | `package-lock.json`, `pnpm-lock.yaml` | Dependências vulneráveis `High`/`Critical` sem patch ou exceção formal bloqueiam o PR. |
| **CONTAINER** | Trivy (`0.56.x`) | `Dockerfile`, `ghcr.io/unisenai-sorocaba/*` | Vulnerabilidades `High`/`Critical` de OS/imagem sem correção ou exceção formal bloqueiam release. |
| **IAC** | Checkov / Trivy Config (`3.x`) | `infra/`, `.github/workflows/`, `docker-compose*.yml` | Misconfigurações `High`/`Critical` sem mitigação formal bloqueiam release. |

---

## 2. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-025` (`plataforma-quality#25`)
- **Ambiente:** `node --test tests/security/qa-025-sast-sca-container-iac-gate.test.mjs`

| Caso | Descrição da Validação | Resultado Esperado | Status Harness QA | Status Pipeline (`INF-003` / `INF-006`) |
| :--- | :--- | :--- | :---: | :---: |
| **CT-QA025-01** | Validação da política declarativa das 4 frentes (`SAST`, `SCA`, `CONTAINER`, `IAC`) com ferramenta, versão e escopo | 4 frentes configuradas e severidades bloqueantes `HIGH`/`CRITICAL` | `PASS` | `PASS` |
| **CT-QA025-02** | Bloqueio (`FAIL`) quando alguma das 4 frentes obrigatórias estiver ausente ou sem versão avaliada | Retorna `FAIL` (`MISSING_REQUIRED_SCAN_FRONTS`) | `PASS` | `WARN` (Aguarda `INF-003` / `INF-006`) |
| **CT-QA025-03** | Bloqueio (`FAIL`) quando houver achado `High` ou `Critical` sem correção e sem aceite formal de risco | Retorna `FAIL` (`UNRESOLVED_HIGH_OR_CRITICAL_FINDINGS`) | `PASS` | `PASS` |
| **CT-QA025-04** | Bloqueio (`FAIL`) quando exceção formal estiver com prazo vencido (`expiresAt`) ou sem `owner`/`mitigation`/`defectIssue` | Retorna `FAIL` (`EXCEPTION_EXPIRED_OR_MISSING_REQUIRED_FIELDS`) | `PASS` | `PASS` |
| **CT-QA025-05** | Classificação como `WARN` com aceite formal vigente e `PASS` quando `0` `High`/`Critical` pendentes | Retorna `WARN` (com exceção vigente) e `PASS` (4 frentes limpas) | `PASS` | `WARN` (Aguarda `INF-003` / `INF-006`) |
| **CT-QA025-06** | Sanitização automática de tokens, senhas e chaves eventualmente capturados nos logs dos scanners | Substitui credenciais por `[REDACTED]` | `PASS` | `PASS` |

---

## 3. Registro de Evidência (`templates/evidence.md`)

- **Issue / AC:** `QA-025` (`plataforma-quality#25`)
- **Commit do sistema sob teste:** `4538763` (`origin/develop` em `plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-11-19T20:29:00Z`
- **Executor/ferramenta:** `npm run test:security` (`node --test tests/security/*.test.mjs`)
- **Resultado:** `WARN` (`PASS` em `6/6` cenários automatizados de política e gate; `WARN` para execução integrada nos pipelines dos repositórios de aplicação aguardando conclusão de `INF-003` e `INF-006`)
- **Artefatos/logs:**
  - Política das 4 frentes: [`tests/security/scanners/qa-025-scanners-policy.json`](../../tests/security/scanners/qa-025-scanners-policy.json)
  - Suíte automatizada de gate: [`tests/security/qa-025-sast-sca-container-iac-gate.test.mjs`](../../tests/security/qa-025-sast-sca-container-iac-gate.test.mjs)
- **Observações e riscos:** Nenhum segredo real ou credencial foi utilizada nos testes.

---

## 4. Defeitos / Bloqueios Registrados (`templates/defect.md`)

### Bloqueio 1: Dependências de pipeline (`INF-003` e `INF-006`) pendentes para execução contínua nos repositórios de aplicação

- **Issue/AC relacionado:** `QA-025` (`plataforma-quality#25`), `INF-003`, `INF-006`
- **Ambiente e versão:** Esteira CI/CD GitHub Actions — Sprint `S5`
- **Severidade e prioridade:** Alta (`High`) / `P0`
- **Pré-condições:** Política e motor de gate `QA-025` versionados em `plataforma-quality`.
- **Passos para reproduzir:** Verificar a publicação dos workflows de SAST/SCA/Container/IaC (`INF-003` e `INF-006`) nos repositórios `plataforma-backend` e `plataforma-frontend`.
- **Resultado observado:** As esteiras integradas de container e IaC ainda dependem da entrega final de `INF-003` e `INF-006`.
- **Resultado esperado:** Ao concluir `INF-003` e `INF-006`, conectar os relatórios SARIF/JSON gerados ao gate `evaluateStaticSecurityGate` para promoção de `WARN` para `PASS`.
- **Evidência sem dados sensíveis:** [`tests/security/scanners/qa-025-scanners-policy.json`](../../tests/security/scanners/qa-025-scanners-policy.json).
- **Owner sugerido:** Squad **DevOps/Cloud** (`INF-003`, `INF-006`).
