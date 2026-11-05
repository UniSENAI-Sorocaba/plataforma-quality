# API

Testes integrados dos endpoints publicados pelo backend. Não duplicar testes unitários.

## QA-016 — notas (`/api/v1/evaluations`)

```bash
QA_BASE_URL=http://localhost:8080 npm run test:api
```

- `QA_BASE_URL`: API do perfil local/test da `develop`. Nunca produção. Sem ela, a suíte inteira fica em skip (BLOQUEADO).
- `QA_RUN_ID`: opcional; identifica a execução nos dados e nos correlation ids.
- Resultado por caso (PASS/WARN/FAIL/BLOQUEADO) em `reports/qa-016-<run>.json` (não versionado). O `node:test` mostra WARN como `ok` e BLOQUEADO como skip, então leia o resumo `# QA-016 resumo` e o relatório.
- Casos e esperados: `docs/test-cases/QA-016.md`. Perguntas pendentes: `docs/questions/QA-016-perguntas.md`.

Estrutura:

- `helpers/client.mjs`: chamada HTTP com `X-Correlation-Id` único; decimais lidos do texto, nunca de float.
- `helpers/assertions.mjs`: valida `application/problem+json` por `status` e `code`.
- `helpers/dataset.mjs`: massa fictícia (users → projects → project-members → boards) e limpeza.
- `fixtures/qa-016-notas.json`: entradas e esperados. `finalGradeEsperado` só é preenchido com cálculo feito à mão, depois que a SPEC definir fórmula e arredondamento.

Mock não prova integração: não use servidor simulado como evidência.
