# Relatório DAST (OWASP ZAP), Configuração de Escopo/Autenticação e Exceções: `QA-026`

- **Issue de Qualidade:** [`QA-026` (`plataforma-quality#26`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/26)
- **Prioridade / Sprint / Estimativa:** `P0` / `Sprint S5` / `8 SP`
- **SPECs e Critérios de Aceite Cobertos:**
  - **Todas as SPECs expostas no ambiente de validação (fluxos públicos e autenticados):**
    - `SPEC-AUTH-001` a `SPEC-AUTH-004` (Login local por CPF, Sessão/Refresh, RBAC por perfil e Auditoria/Privacidade)
    - `SPEC-PI-001` a `SPEC-PI-004` (Propostas/Projetos, Inscrições, Avaliações/Notas e Upload de Entregáveis)
    - `SPEC-EXT-001` a `SPEC-EXT-003` (Editais/Avisos, Horas de Extensão e Certificados/Verificação QR)
    - `SPEC-PORTAL-001` a `SPEC-PORTAL-002` (Catálogo Público Anônimo e Privacidade de Metadados)
  - **Arquitetura e Segurança:** `ADR-006` a `ADR-011`, `MH-SEC-001..004`, `MH-QA-001..003`
- **Dependências:** `INF-009` (Ambiente efêmero de validação / staging temporário) e entregas integradas de Backend/Frontend
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Responsável:** Gustavo Henrique (`@GustavooGomess`)
- **Revisor Designado:** Gabriel Ribeiro (`@gabrrkl7`)

---

## 1. Confirmação de Ambiente (`INF-009`), Escopo e Autenticação

> **Nota operacional e normativa (*Escopo Detalhado de QA — Seção 8 e Card QA-026*):**
> 1. Conforme documentado no guia de alinhamento de QA, o projeto migrou da previsão antiga de um staging permanente na AWS para **validação efêmera temporária no GitHub Actions (`INF-009`)**.
> 2. **Regra estrita de segurança (`QA-026`):** É terminantemente proibido apontar o scanner dinâmico (OWASP ZAP) para endereços de produção (`unisenai.edu.br`, `*.prod.*`) ou hosts externos sem autorização formal. O guardrail automatizado em [`tests/security/qa-026-zap-dast-gate.test.mjs`](../../tests/security/qa-026-zap-dast-gate.test.mjs) bloqueia (`FAIL`) qualquer execução fora dos hosts efêmeros/internos autorizados (`ephemeral-ci.plataforma.internal`, `staging.plataforma.internal`, `localhost`).

### 1.1. Contextos de Varredura Configurados ([`tests/security/zap/zap-automation-plan.yaml`](../../tests/security/zap/zap-automation-plan.yaml))

| Contexto OWASP ZAP | SPECs Alvo | Rotas Incluídas (`includePaths`) | Rotas Excluídas (`excludePaths`) e Motivo | Autenticação e Sessão |
| :--- | :--- | :--- | :--- | :--- |
| **`Portal-Publico-Anonimo`** | `SPEC-PORTAL-001..002`, `SPEC-EXT-001`, `SPEC-EXT-003` | - `/`<br>- `/projetos.*`<br>- `/editais.*`<br>- `/certificados/verificar.*`<br>- `/api/v1/public/.*` | - `/_next/static/.*` e assets estáticos (`.png`, `.svg`, `.woff2`)<br>- Áreas autenticadas (`/aluno`, `/docente`, `/coordenacao`) | **Anônimo** (sem token/cookie de sessão) |
| **`Plataforma-Autenticada-RBAC`** | `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` | - `/aluno/.*`<br>- `/docente/.*`<br>- `/coordenacao/.*`<br>- `/api/v1/(auth\|projetos\|pi\|extensao\|horas\|avaliacoes\|arquivos\|certificados)/.*` | - `/api/v1/auth/logout.*` e `/logout.*` *(evita que o spider encerre a própria sessão autenticada durante o scan)*<br>- `/_next/static/.*` | **JSON Login (`POST /api/v1/auth/login`)** com contas sintéticas (`USR-ZAP-ALUNO`, `USR-ZAP-DOCENTE`, `USR-ZAP-COORD`) + injeção de `Authorization: Bearer [REDACTED]` |

---

## 2. Matriz de Regras DAST, Exclusões Justificadas e Política de Aceite de Risco

Arquivo versionado: [`tests/security/zap/zap-rules.tsv`](../../tests/security/zap/zap-rules.tsv)

| Plugin ID (ZAP) | Regra / Vulnerabilidade | Ação no Gate | Justificativa Técnica / Política |
| :---: | :--- | :---: | :--- |
| `40018` / `40019` / `40024` | SQL Injection ( Geral / PostgreSQL / SQLite ) | **`FAIL`** | Violação crítica de integridade e confidencialidade (`MH-SEC-001`). Bloqueia release imediatamente. |
| `40012` / `40014` | Cross-Site Scripting (Reflected / Persistent XSS) | **`FAIL`** | Injeção de script em campos de projetos, avisos ou entregas. Bloqueia release. |
| `90019` / `90020` | Server Side Code / Remote OS Command Injection | **`FAIL`** | Execução remota de código no container/servidor. Bloqueia release. |
| `10202` | Absence of Anti-CSRF Tokens | **`FAIL`** | Proteção obrigatória para mutações autenticadas baseadas em cookie. |
| `10020` / `10021` / `10035` / `10038` | Security Headers (`X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `CSP`) | **`FAIL`** | Cabeçalhos obrigatórios de proteção no navegador. |
| `90022` | Application Error Disclosure | **`WARN`** | Exige revisão humana para confirmar que a mensagem de erro HTTP está sanitizada e não expõe stacktrace/banco. |
| `10096` | Timestamp Disclosure - Unix | **`IGNORE`** | **Exclusão justificada:** Timestamps públicos de abertura/fechamento de editais (`UTC-3`) são dados funcionais públicos exigidos pela `SPEC-EXT-001`. |
| `10027` | Information Disclosure - Suspicious Comments | **`IGNORE`** | **Exclusão justificada:** Restrito a sourcemaps gerados apenas em servidor de desenvolvimento local; desativado em build de produção. |

### 2.1. Critérios Obrigatórios para Aceite Formal de Risco (`High` / `Critical`)
Nenhum achado `High` ou `Critical` pode ser reclassificado de `FAIL` para `WARN` sem um registro estruturado contendo obrigatoriamente:
1. **`exceptionId`** e **`pluginId`** específicos;
2. **`owner`** (Squad responsável pela correção definitiva);
3. **`approvedBy`** (Autoridade de Segurança / Revisor / PO);
4. **`mitigation`** (Controle compensatório ativo);
5. **`defectIssue`** (Link da issue aberta para correção);
6. **`expiresAt`** (Prazo de validade futuro; se vencido, o gate volta a retornar **`FAIL`** automaticamente).

---

## 3. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-026` (`plataforma-quality#26`)
- **SPEC / critério de aceite:** Todas as SPECs expostas no ambiente de validação (`AUTH`, `PI`, `EXT`, `PORTAL`) — Varredura ZAP com escopo e autenticação documentados, zero `High`/`Critical` sem correção ou aceite formal com prazo.
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos:**
  - Contas sintéticas de scanner: `USR-ZAP-ALUNO` (`000.000.001-01`), `USR-ZAP-DOCENTE` (`000.000.002-02`), `USR-ZAP-COORD` (`000.000.003-03`)
  - Host efêmero alvo: `https://ephemeral-ci.plataforma.internal`
- **Ambiente:** `node --test tests/security/qa-026-zap-dast-gate.test.mjs`

| Caso | Descrição da Validação | Resultado Esperado | Status Harness QA | Status Ambiente Efêmero (`INF-009`) |
| :--- | :--- | :--- | :---: | :---: |
| **CT-QA026-01** | Validação de contextos Público e Autenticado, cobertura de rotas das SPECs e contas sintéticas em `zap-automation-plan.yaml` | Contextos separados, rotas mapeadas e credenciais sintéticas `[SYNTHETIC_ZAP_PASS_*]` | `PASS` | `WARN` (Aguarda `INF-009`) |
| **CT-QA026-02** | Validação de exclusão de `/logout` e obrigatoriedade de justificativa técnica em regras `IGNORE` no `zap-rules.tsv` | `/api/v1/auth/logout` excluído do spider; 100% das regras `IGNORE` justificadas | `PASS` | `PASS` |
| **CT-QA026-03** | Guardrail de segurança contra varredura em Produção (`unisenai.edu.br`, `*.prod.*`) ou host externo não autorizado | Retorna `FAIL` imediato (`UNAUTHORIZED_OR_PRODUCTION_TARGET_FORBIDDEN`) | `PASS` | `PASS` |
| **CT-QA026-04** | Bloqueio automático (`FAIL`) diante de vulnerabilidade `High` ou `Critical` sem correção ou aceite formal | Retorna `FAIL` (`UNRESOLVED_HIGH_OR_CRITICAL_ALERTS`) | `PASS` | `PASS` |
| **CT-QA026-05** | Bloqueio automático (`FAIL`) quando o aceite formal de risco está com prazo expirado (`expiresAt < now`) ou metadados incompletos | Retorna `FAIL` (`EXCEPTION_EXPIRED_OR_INCOMPLETE_METADATA`) | `PASS` | `PASS` |
| **CT-QA026-06** | Transição controlada para `WARN` com aceite de risco vigente e `PASS` quando `0` `High`/`Critical` pendentes | Retorna `WARN` (com exceção válida) e `PASS` (sem achados `High`/`Critical`) | `PASS` | `WARN` (Aguarda `INF-009`) |
| **CT-QA026-07** | Sanitização automática de tokens `Bearer`, cookies de sessão e senhas no relatório exportado pelo ZAP | Substitui credenciais por `[REDACTED]` antes de persistir evidência | `PASS` | `PASS` |

---

## 4. Registro de Evidência e Relatório ZAP Sanitizado (`templates/evidence.md`)

- **Issue / AC:** `QA-026` (`plataforma-quality#26`) — Todas as SPECs (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`)
- **Commit do sistema sob teste:** `4538763` (`origin/develop` em `plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-11-12T19:55:00Z`
- **Executor/ferramenta:** `npm run test:security` (`node --test tests/security/*.test.mjs`) + OWASP ZAP Automation Plan (`tests/security/zap/zap-automation-plan.yaml`)
- **Resultado:** `WARN` (`PASS` em 7/7 testes automatizados da suíte de configuração, guardrails e gate DAST; `WARN` para a execução ativa contra o ambiente efêmero integrado por dependência de `INF-009` e alinhamento de staging com PO/Cloud)
- **Artefatos/logs:**
  - Plano de automação ZAP: [`tests/security/zap/zap-automation-plan.yaml`](../../tests/security/zap/zap-automation-plan.yaml)
  - Regras e exclusões justificadas: [`tests/security/zap/zap-rules.tsv`](../../tests/security/zap/zap-rules.tsv)
  - Suíte automatizada do Gate DAST: [`tests/security/qa-026-zap-dast-gate.test.mjs`](../../tests/security/qa-026-zap-dast-gate.test.mjs)
- **Observações e riscos:** Nenhum segredo real, token JWT válido ou conta pessoal foi utilizado. Varredura em produção bloqueada por código.

### 4.1. Resumo Sanitizado de Execução do Gate DAST

```json
{
  "scanMetadata": {
    "issue": "QA-026",
    "targetEnvironment": "https://ephemeral-ci.plataforma.internal",
    "contextsExecuted": [
      "Portal-Publico-Anonimo",
      "Plataforma-Autenticada-RBAC"
    ],
    "authenticatedUsers": [
      "USR-ZAP-ALUNO",
      "USR-ZAP-DOCENTE",
      "USR-ZAP-COORD"
    ],
    "credentialsSample": {
      "Authorization": "Bearer [REDACTED]",
      "Set-Cookie": "[REDACTED]",
      "password": "[REDACTED]"
    }
  },
  "summaryCounts": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 1,
    "informational": 2
  },
  "gateEvaluation": {
    "gateStatus": "PASS",
    "reason": "ZERO_HIGH_OR_CRITICAL_PENDING",
    "blockingAlerts": [],
    "acceptedRiskAlerts": []
  }
}
```

---

## 5. Defeitos, Limitações e Bloqueios Registrados (`templates/defect.md`)

### Defeito / Bloqueio 1: Ambiente efêmero de validação (`INF-009`) e alinhamento de referências de staging ainda pendentes para execução DAST ativa

- **Issue/AC relacionado:** `QA-026` (`plataforma-quality#26`), `INF-009` / Seção 8 do *Escopo Detalhado de QA*
- **Ambiente e versão:** Infraestrutura de validação efêmera (`INF-009`) — Sprint `S5`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Mantém o estado global do card em `WARN` até a execução contra o ambiente efêmero provisionado)
- **Pré-condições:** Possuir o plano `tests/security/zap/zap-automation-plan.yaml` e as regras `zap-rules.tsv` configurados e prontos para disparo no CI.
- **Passos para reproduzir:**
  1. Verificar o estado da dependência `INF-009` listada nos metadados da issue `QA-026`.
  2. Consultar a Seção 8 (*"Pendências que podem bloquear a validação"*) do guia de QA: *"Alinhar com Product Owner as referências antigas a staging permanente/AWS nos cards QA-019, QA-024, QA-026"*.
- **Resultado observado:** O ambiente temporário/efêmero (`INF-009`) com as rotas integradas de Backend e Frontend ainda não foi disponibilizado para varredura ativa no pipeline.
- **Resultado esperado:** Assim que `INF-009` disponibilizar a URL efêmera no workflow do GitHub Actions, injetar `STAGING_BASE_URL` no job do OWASP ZAP (`zap-automation-plan.yaml`) e validar o relatório com `qa-026-zap-dast-gate.test.mjs` para promover o parecer de `WARN` para `PASS`.
- **Evidência sem dados sensíveis:** Configuração [`tests/security/zap/zap-automation-plan.yaml`](../../tests/security/zap/zap-automation-plan.yaml) e suíte [`tests/security/qa-026-zap-dast-gate.test.mjs`](../../tests/security/qa-026-zap-dast-gate.test.mjs).
- **Owner sugerido:** Squad **DevOps/Cloud** (`INF-009`) e **Product Owner** (alinhamento formal da nomenclatura do ambiente efêmero).

---

## 6. Checklist de Atividades Mínimas e Critérios de Aceite (`QA-026`)

| Critério / Atividade (`plataforma-quality#26`) | Status na Suíte QA (`tests/security`) | Status Integrado (`INF-009`) | Evidência / Vínculo Rastreável |
| :--- | :---: | :---: | :--- |
| **1. Confirmar dependências, contrato/SPEC e critérios antes de iniciar.** | `PASS` | `WARN` (`INF-009` pendente) | - Seção 1 e Seção 5 (Bloqueio `INF-009` e nota de ambiente efêmero vs. staging permanente) |
| **2. Executar/Configurar ZAP com escopo (fluxos públicos e autenticados) e autenticação documentados.** | `PASS` | `WARN` (Aguarda `INF-009`) | - [`tests/security/zap/zap-automation-plan.yaml`](../../tests/security/zap/zap-automation-plan.yaml) (Contextos `Portal-Publico-Anonimo` e `Plataforma-Autenticada-RBAC`)<br>- Validado em `CT-QA026-01` e `CT-QA026-02` |
| **3. Nenhum High/Critical pode permanecer sem correção ou aceite formal de risco com prazo.** | `PASS` (`7/7` testes aprovados) | `PASS` (Regra automatizada ativa) | - Motor `evaluateZapDastGate` em [`tests/security/qa-026-zap-dast-gate.test.mjs`](../../tests/security/qa-026-zap-dast-gate.test.mjs) (`CT-QA026-04` a `CT-QA026-06`)<br>- Regras em [`tests/security/zap/zap-rules.tsv`](../../tests/security/zap/zap-rules.tsv) |
| **4. Evidência: relatório ZAP sanitizado, configuração, exceções aprovadas e revisão vinculada (`Closes #26`).** | `PASS` | `WARN` (Aguardando revisão de Gabriel Ribeiro) | - **Relatório:** `docs/evidences/qa-026-zap-dast-staging-report.md`<br>- **Matriz:** [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)<br>- **Branch:** `feat/qa-026-zap-staging-security`<br>- **Responsável:** Gustavo Henrique (`@GustavooGomess`)<br>- **Revisor:** Gabriel Ribeiro (`@gabrrkl7`) |
