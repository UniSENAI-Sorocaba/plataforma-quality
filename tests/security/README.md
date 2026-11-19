# Segurança

Configurações e evidências de SAST, SCA, scan de container/IaC e DAST. High/Critical sem tratamento bloqueia release.

## Artefatos e Suítes (`QA-025`)

- `scanners/qa-025-scanners-policy.json`: política declarativa das 4 frentes (`SAST`, `SCA`, `CONTAINER`, `IAC`), ferramentas aprovadas, escopo de repositórios e campos obrigatórios de aceite formal de risco.
- `qa-025-sast-sca-container-iac-gate.test.mjs`: suíte automatizada (`npm run test:security`) que valida cobertura das 4 frentes, bloqueio de `High`/`Critical` sem aceite vigente, expiração de exceções e sanitização de relatórios.
