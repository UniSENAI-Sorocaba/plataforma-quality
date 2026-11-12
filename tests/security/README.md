# Segurança

Configurações e evidências de SAST, SCA, scan de container/IaC e DAST. High/Critical sem tratamento bloqueia release.

## Artefatos e Suítes DAST (`QA-026`)

- `zap/zap-automation-plan.yaml`: plano do OWASP ZAP Automation Framework separando contexto público (`Portal-Publico-Anonimo`) e autenticado (`Plataforma-Autenticada-RBAC`) com contas sintéticas e exclusão de rota de `logout`.
- `zap/zap-rules.tsv`: matriz de regras do scanner DAST (`FAIL`, `WARN`, `IGNORE`) com justificativas técnicas obrigatórias para exclusões.
- `qa-026-zap-dast-gate.test.mjs`: suíte automatizada (`npm run test:security`) que valida o escopo das SPECs, bloqueio de varredura contra produção, política de aceite formal de risco com prazo/responsável e sanitização de relatórios.
