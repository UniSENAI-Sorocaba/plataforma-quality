# Evidência e Relatório de Conformidade: QA-003 (Spec-Compliance Gate)

## 1. Metadados de Evidência (`templates/evidence.md`)

- **Issue / AC:** `QA-003` — Spec-compliance produz `PASS`/`WARN`/`FAIL` e bloqueia `FAIL`
- **SPECs cobertas:** `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`
- **Regras normativas verificadas:** `ADR-008`, `MH-GOV-001`, `MH-GOV-002`, `POL-QA-002`, `MH-QA-001`, `MH-QA-002`, `QA-004`, `MH-SEC-003`, `MH-SEC-004`
- **Commit base do sistema sob teste:** `8d27496b60b025222ac8f794a2dd74a3f353f39f` (`plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5` (`https://github.com/UniSENAI-Sorocaba/plataforma-governance`)
- **Diferença registrada na baseline:**
  - Esperado em `.governance-baseline`: `tag=governance-v0.1.0`, `commit=379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
  - Encontrado em `plataforma-governance`: `commit=379131e3fa7c0411d5055b14b6bb30dd0853a3b5` (confirmado em `main`), `refs/tags/governance-v0.1.0` = **ausente** (não publicada no remoto)
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js v20+)` — `2026-10-28T17:45:00Z`
- **Executor/ferramenta:** `npm test` (`node --test`) + `npm run compliance` (`node scripts/spec-compliance.mjs`)
- **Resultado atual do repositório:** `WARN` (não declara `PASS` enquanto a tag `governance-v0.1.0` não for publicada na Governança; `FAIL` retorna exit code `1` e bloqueia o check)
- **Artefatos/logs:**
  - Automação: [`scripts/spec-compliance.mjs`](../../scripts/spec-compliance.mjs)
  - Testes automatizados (`PASS`/`WARN`/`FAIL`): [`tests/repository/compliance.test.mjs`](../../tests/repository/compliance.test.mjs)
  - Exemplos sanitizados: [`docs/spec-compliance-examples.md`](../spec-compliance-examples.md)
- **Responsável pela entrega:** Ahslam Mendes
- **Revisor designado (Governança):** Gabriel Ribeiro de Camargo Miranda (`@GabrielRibeiro` / conforme `backlogs/quality-security.md`)

---

## 2. Compliance Report (`_KB/agents/templates/compliance-report.md`)

- **Task/PR:** `QA-003` — [PR #39 (`feat/qa-003-spec-compliance`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/pull/39)
- **Baseline tag/SHA:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **SPEC/AC/MH/ADR/Contracts:**
  - SPECs: `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`
  - ADRs: `ADR-008` (Distribuição da baseline imutável por tag e SHA)
  - Must Haves: `MH-GOV-001`, `MH-GOV-002`, `MH-QA-001`, `MH-QA-002`, `MH-QA-003`, `MH-SEC-003`, `MH-SEC-004`
- **Deterministic checks:**
  - `npm test`: `5/5 PASS` (`structure.test.mjs` + `compliance.test.mjs`, validando cenários `PASS`, `WARN` e `FAIL` com exit code `1`)
  - `npm run compliance`: `8 PASS | 1 WARN | 0 FAIL` (exit code `0`)
- **Evidence:** Este relatório (`docs/evidences/qa-003-spec-compliance-report.md`) e [`docs/spec-compliance-examples.md`](../spec-compliance-examples.md)
- **Warnings/justifications:**
  - `[WARN] MH-GOV-002`: O commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5` existe em `plataforma-governance`, porém a tag `governance-v0.1.0` ainda não foi publicada remotamente. Sem a tag publicada, o comando emite `WARN` e não declara `PASS`.
  - Pendência externa de Cloud/DevOps (`INF-003` / `PG-004`): Vinculação do comando `npm run compliance` ao workflow de PR (`.github/workflows/`) e configuração de *branch protection rule* pelo squad Cloud/DevOps.
- **Result:** `WARN`

---

## 3. Log Sanitizado de Execução Real (`npm test` e `npm run compliance`)

### 3.1. Execução da Suíte de Testes (`npm test`)

```text
> plataforma-quality@0.1.0 test
> node --test tests/repository/*.test.mjs

✔ emite WARN quando o commit existe na Governança mas a tag ainda não foi publicada
✔ emite PASS quando a tag existe na Governança e resolve para o SHA da baseline
✔ emite FAIL e termina com código diferente de zero quando regra obrigatória é violada
✔ mantém os documentos e templates mínimos
✔ fixa tag e SHA da governança
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
```

### 3.2. Execução do Comando `npm run compliance` (Repositório Atual -> `WARN`)

```text
========================================================================================
RELATÓRIO DE VERIFICAÇÃO DE CONFORMIDADE (SPEC-COMPLIANCE)
Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5
Repositório normativo:  https://github.com/UniSENAI-Sorocaba/plataforma-governance
Diferença de baseline:  esperado refs/tags/governance-v0.1.0->379131e3fa7c0411d5055b14b6bb30dd0853a3b5 | remoto: refs/tags/governance-v0.1.0=ausente (refs/heads/main=38688538360664d18fc40ad376394b37a31f2096)
Escopo de SPECs:        SPEC-AUTH-001..004, SPEC-PI-001..004, SPEC-EXT-001..003, SPEC-PORTAL-001..002
Arquivos no diff:       7 item(ns)
========================================================================================

[PASS] Regra: ADR-008
       Arquivo: .governance-baseline
       Motivo: Repositório (https://github.com/UniSENAI-Sorocaba/plataforma-governance), tag (governance-v0.1.0) e SHA (379131e3fa7c0411d5055b14b6bb30dd0853a3b5) seguem o padrão normativo.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[WARN] Regra: MH-GOV-002
       Arquivo: .governance-baseline
       Motivo: Tag governance-v0.1.0 ainda não foi publicada em https://github.com/UniSENAI-Sorocaba/plataforma-governance (diferença registrada: refs/tags/governance-v0.1.0 ausente no remoto; main em 38688538360664d18fc40ad376394b37a31f2096); sem ela, não declare PASS.
       Resultado: WARN
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: MH-GOV-001
       Arquivo: AGENTS.md
       Motivo: Autoridade normativa (_KB/README.md e .governance-baseline) e regras de bloqueio FAIL/WARN estão declaradas.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: POL-QA-002 / MH-QA-001
       Arquivo: docs/test-strategy.md
       Motivo: Camadas da pirâmide de testes e regras determinísticas de resultado (PASS/WARN/FAIL) presentes.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: MH-QA-002
       Arquivo: docs/ac-evidence-matrix.md
       Motivo: Estrutura da matriz AC→evidência íntegra para rastreabilidade de SPEC-AUTH-001..004, SPEC-PI-001..004, SPEC-EXT-001..003, SPEC-PORTAL-001..002.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: QA-004 / MH-QA-002
       Arquivo: templates/test-case.md
       Motivo: Template templates/test-case.md contém todos os campos obrigatórios de rastreabilidade e evidência.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: QA-004 / MH-QA-002
       Arquivo: templates/evidence.md
       Motivo: Template templates/evidence.md contém todos os campos obrigatórios de rastreabilidade e evidência.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: QA-004 / MH-QA-002
       Arquivo: templates/defect.md
       Motivo: Template templates/defect.md contém todos os campos obrigatórios de rastreabilidade e evidência.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: MH-SEC-003 / MH-SEC-004
       Arquivo: docs/*, templates/*, tests/*
       Motivo: Nenhum segredo, chave privada ou token sensível detectado nos artefatos e documentos do repositório.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

----------------------------------------------------------------------------------------
RESUMO: 8 PASS | 1 WARN | 0 FAIL
RESULTADO FINAL: WARN | Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5
AÇÃO: Exige justificativa e decisão humana antes de aprovar/concluir.
========================================================================================
```

---

## 4. Rastreabilidade de PR e Revisão Humana

- **Repositório:** `https://github.com/UniSENAI-Sorocaba/plataforma-quality`
- **Pull Request:** [#39 — `feat(qa-003): implementa spec-compliance gate, testes e evidencias`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/pull/39)
- **Branch da entrega:** `feat/qa-003-spec-compliance`
- **Revisor obrigatório (`backlogs/quality-security.md`):** Gabriel Ribeiro de Camargo Miranda ([revisão no PR #39](https://github.com/UniSENAI-Sorocaba/plataforma-quality/pull/39#partial-pull-merging))
- **Status da Revisão:** Aguardando parecer humano de Gabriel Ribeiro no [PR #39](https://github.com/UniSENAI-Sorocaba/plataforma-quality/pull/39) (conforme `_KB/agents/workflows/implement-task.md`: *"5. Abrir PR com evidências e riscos; aguardar revisão humana"* e `_KB/agents/policies/authority.md`: *"Agente não aprova a própria alteração nem marca Done"*).
