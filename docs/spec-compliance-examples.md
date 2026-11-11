# Exemplos de Saída do Spec-Compliance e Status do Check de PR

- **Issue relacionada:** `QA-003`
- **Baseline de referência:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Comando:** `npm run compliance` (`node scripts/spec-compliance.mjs`)

## 1. Status da Integração com Check Obrigatório de PR (Cloud/DevOps)

- **Situação atual:** **Pendente (Não vinculado pelo squad Cloud/DevOps).**
- **Evidência verificada nas branches remotas (`origin`):**
  - `origin/main`: não possui diretório `.github/workflows/`.
  - `origin/develop`: possui apenas `.github/workflows/qa-006-detecta-segredo.yml` (GitLeaks da task `QA-006`).
  - O workflow de CI (`INF-003` / `PG-004`) para executar `npm test` e `npm run compliance` em `pull_request` e configurá-lo como *required status check* na proteção de branch ainda não foi entregue pelo squad Cloud/DevOps.

---

## 2. Exemplo de Saída — `PASS` (Exit Code `0`)

Cenário em que a tag `governance-v0.1.0` está publicada na Governança resolvendo para o SHA `379131e3fa7c0411d5055b14b6bb30dd0853a3b5` e todos os documentos, templates e verificações de segurança estão íntegros.

```text
========================================================================================
RELATÓRIO DE VERIFICAÇÃO DE CONFORMIDADE (SPEC-COMPLIANCE)
Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5
Repositório normativo:  https://github.com/UniSENAI-Sorocaba/plataforma-governance
========================================================================================

[PASS] Regra: ADR-008
       Arquivo: .governance-baseline
       Motivo: Repositório (https://github.com/UniSENAI-Sorocaba/plataforma-governance), tag (governance-v0.1.0) e SHA (379131e3fa7c0411d5055b14b6bb30dd0853a3b5) seguem o padrão normativo.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: MH-GOV-002
       Arquivo: .governance-baseline
       Motivo: Tag governance-v0.1.0 e commit 379131e3fa7c0411d5055b14b6bb30dd0853a3b5 confirmados e íntegros na Governança.
       Resultado: PASS
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
       Motivo: Estrutura da matriz AC→evidência íntegra com colunas de rastreabilidade (Issue, SPEC/AC, Evidência).
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
RESUMO: 9 PASS | 0 WARN | 0 FAIL
RESULTADO FINAL: PASS | Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5
AÇÃO: Conformidade verificada com sucesso.
========================================================================================
```

---

## 3. Exemplo de Saída — `WARN` (Exit Code `0`)

Cenário atual do repositório: o SHA `379131e3fa7c0411d5055b14b6bb30dd0853a3b5` existe na Governança, mas a tag `governance-v0.1.0` ainda aguarda publicação oficial; não declara `PASS` e exige decisão humana.

```text
========================================================================================
RELATÓRIO DE VERIFICAÇÃO DE CONFORMIDADE (SPEC-COMPLIANCE)
Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5
Repositório normativo:  https://github.com/UniSENAI-Sorocaba/plataforma-governance
========================================================================================

[PASS] Regra: ADR-008
       Arquivo: .governance-baseline
       Motivo: Repositório (https://github.com/UniSENAI-Sorocaba/plataforma-governance), tag (governance-v0.1.0) e SHA (379131e3fa7c0411d5055b14b6bb30dd0853a3b5) seguem o padrão normativo.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[WARN] Regra: MH-GOV-002
       Arquivo: .governance-baseline
       Motivo: Commit 379131e3fa7c0411d5055b14b6bb30dd0853a3b5 existe na Governança, mas a tag governance-v0.1.0 ainda não foi publicada; exige decisão humana (sem ela, não declare PASS).
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
       Motivo: Estrutura da matriz AC→evidência íntegra com colunas de rastreabilidade (Issue, SPEC/AC, Evidência).
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

## 4. Exemplo de Saída — `FAIL` (Exit Code `1` — Bloqueia Merge)

Cenário em que `templates/evidence.md` perde seus campos obrigatórios de rastreabilidade (`QA-004 / MH-QA-002`), encerrando o processo com código de saída `1`.

```text
========================================================================================
RELATÓRIO DE VERIFICAÇÃO DE CONFORMIDADE (SPEC-COMPLIANCE)
Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5
Repositório normativo:  https://github.com/UniSENAI-Sorocaba/plataforma-governance
========================================================================================

[PASS] Regra: ADR-008
       Arquivo: .governance-baseline
       Motivo: Repositório (https://github.com/UniSENAI-Sorocaba/plataforma-governance), tag (governance-v0.1.0) e SHA (379131e3fa7c0411d5055b14b6bb30dd0853a3b5) seguem o padrão normativo.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: MH-GOV-002
       Arquivo: .governance-baseline
       Motivo: Tag governance-v0.1.0 e commit 379131e3fa7c0411d5055b14b6bb30dd0853a3b5 confirmados e íntegros na Governança.
       Resultado: PASS
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
       Motivo: Estrutura da matriz AC→evidência íntegra com colunas de rastreabilidade (Issue, SPEC/AC, Evidência).
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[PASS] Regra: QA-004 / MH-QA-002
       Arquivo: templates/test-case.md
       Motivo: Template templates/test-case.md contém todos os campos obrigatórios de rastreabilidade e evidência.
       Resultado: PASS
       Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5

[FAIL] Regra: QA-004 / MH-QA-002
       Arquivo: templates/evidence.md
       Motivo: Campos obrigatórios ausentes em templates/evidence.md: Issue / AC:, Commit do sistema sob teste:, Baseline de governança:, Resultado: PASS | WARN | FAIL, Artefatos/logs:.
       Resultado: FAIL
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
RESUMO: 8 PASS | 0 WARN | 1 FAIL
RESULTADO FINAL: FAIL | Referência da baseline: governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5
AÇÃO: Bloqueio de merge (exit code != 0). Corrija as violações apontadas como FAIL.
========================================================================================
```

