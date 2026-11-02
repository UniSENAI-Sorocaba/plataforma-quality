# Evidência: Execução e Validação do Quality Gate de Cobertura (QA-007)

- **Issue / AC:** QA-007 — Validação e Bloqueio de Gates de Cobertura (Backend lines >= 80%, branches >= 70%; Domínios Críticos lines >= 90%, branches >= 80%; Frontend testável >= 70%)
- **Commit do sistema sob teste:** `HEAD` (`feat/qa-007-coverage-gates`)
- **Baseline de governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Ambiente e data/hora UTC:** Local / CI Node.js Environment — 2026-11-02T20:30:00Z
- **Executor/ferramenta:** Vitor Fazano (`vfazano`) / `scripts/coverage-gate.mjs` + `node --test tests/repository/coverage-gate.test.mjs`
- **Resultado:** PASS (Gate implementado com confirmação de bloqueio determinístico abaixo dos limites)
- **Artefatos/logs:** `tests/repository/coverage-gate.test.mjs`, `scripts/coverage-gate.mjs`, `docs/coverage-gate-matrix.md`
- **Observações e riscos:** A extração contínua nos pipelines de build dos repositórios backend e frontend depende da integração de CI sob a issue `INF-003`. O gate lógico e os testes de bloqueio estão 100% validados.

---

## 1. Demonstração de Execução: Cenário de Aprovação (PASS)

Quando todas as métricas satisfazem os limiares mínimos:

```text
========================================================================================
QUALITY GATE DE COBERTURA DE CÓDIGO (QA-007)
Avaliado em:      2026-11-02T20:30:00.000Z
Resultado Geral:  PASS (Exit Code: 0)
========================================================================================

VERIFICAÇÕES DE GATE POR ESCOPO E MÉTRICA:
----------------------------------------------------------------------------------------
✅ [PASS] Backend Geral                  | Métrica: lines    | Obtido:  83.5% | Mínimo:  80.0%
         Motivo: Cobertura de linhas atende ao mínimo (83.5% >= 80%)

✅ [PASS] Backend Geral                  | Métrica: branches | Obtido:  74.2% | Mínimo:  70.0%
         Motivo: Cobertura de branches atende ao mínimo (74.2% >= 70%)

✅ [PASS] Domínio Crítico [auth]         | Métrica: lines    | Obtido:  92.4% | Mínimo:  90.0%
         Motivo: Cobertura de linhas em domínio crítico atende ao mínimo (92.4% >= 90%)

✅ [PASS] Domínio Crítico [auth]         | Métrica: branches | Obtido:  85.0% | Mínimo:  80.0%
         Motivo: Cobertura de branches em domínio crítico atende ao mínimo (85.0% >= 80%)

✅ [PASS] Frontend Testável              | Métrica: lines    | Obtido:  75.8% | Mínimo:  70.0%
         Motivo: Cobertura de frontend testável atende ao mínimo (75.8% >= 70%)

----------------------------------------------------------------------------------------
RESUMO: 5 Verificações Aprovadas | 0 Violações Bloqueantes
STATUS DO MERGE: ✅ APROVADO (Exit Code 0). Todos os quality gates de cobertura foram satisfeitos.
========================================================================================
```

---

## 2. Demonstração de Execução: Confirmação de Bloqueio (FAIL)

Conforme exigido no critério de aceite (*"confirmar bloqueio abaixo do limite"*), a suíte testa e confirma a falha imediata e interrupção do pipeline (`exit code 1`):

### Caso A: Linhas do Backend abaixo do limite (79.9% < 80%)
```text
❌ [FAIL] Backend Geral                  | Métrica: lines    | Obtido:  79.9% | Mínimo:  80.0%
         Motivo: BLOQUEIO: Cobertura de linhas insuficiente no backend (79.9% < 80%)

STATUS DO MERGE: ❌ BLOQUEADO (Exit Code 1). Um ou mais limites não foram atingidos.
```

### Caso B: Ramificações (Branches) do Backend abaixo do limite (69.5% < 70%)
```text
❌ [FAIL] Backend Geral                  | Métrica: branches | Obtido:  69.5% | Mínimo:  70.0%
         Motivo: BLOQUEIO: Cobertura de branches insuficiente no backend (69.5% < 70%)

STATUS DO MERGE: ❌ BLOQUEADO (Exit Code 1). Um ou mais limites não foram atingidos.
```

### Caso C: Domínio Crítico (Auth) com Linhas abaixo do limite (89.9% < 90%)
```text
❌ [FAIL] Domínio Crítico [auth]         | Métrica: lines    | Obtido:  89.9% | Mínimo:  90.0%
         Motivo: BLOQUEIO: Linhas insuficientes no domínio crítico auth (89.9% < 90%)

STATUS DO MERGE: ❌ BLOQUEADO (Exit Code 1). Um ou mais limites não foram atingidos.
```

### Caso D: Frontend Testável abaixo do limite (68.5% < 70%)
```text
❌ [FAIL] Frontend Testável              | Métrica: lines    | Obtido:  68.5% | Mínimo:  70.0%
         Motivo: BLOQUEIO: Cobertura de frontend testável insuficiente (68.5% < 70%)

STATUS DO MERGE: ❌ BLOQUEADO (Exit Code 1). Um ou mais limites não foram atingidos.
```

---

## 3. Parecer de Qualidade

O gate implementado cumpre com precisão as especificações normativas de Governança e QA do projeto UniSENAI. Nenhuma métrica abaixo dos limites é tolerada sem gerar código de saída `1` (bloqueio mandatário do merge de PR).

