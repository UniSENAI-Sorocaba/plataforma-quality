# Plataforma Digital — Qualidade, Testes & Segurança

Estrutura transversal para estratégia, evidências e suítes de API, contrato, E2E, performance e segurança. Testes unitários permanecem junto ao código do backend/frontend; este repositório concentra validações integradas e independentes.

## Estrutura

- `docs`: estratégia e matriz AC→evidência;
- `templates`: caso de teste, evidência e defeito;
- `tests/api`: testes HTTP integrados;
- `tests/contract`: compatibilidade OpenAPI/JSON Schema;
- `tests/e2e`: jornadas críticas com Playwright;
- `tests/performance`: cenários k6 versionados;
- `tests/security`: configurações e cenários SAST/SCA/DAST;
- `scripts`: validações determinísticas do próprio repositório.

## Validação

```bash
npm test
```

### E2E T13 — entrega de projeto

O cenário de navegador em `tests/e2e/t13-deliverable-browser.mjs` valida login, exibição de uma solicitação aprovada, seleção do arquivo e confirmação visual do upload. Ele usa dados sintéticos e não imprime tokens ou credenciais.

Pré-requisitos: PostgreSQL migrado, backend disponível em `http://127.0.0.1:8080` e frontend em `http://127.0.0.1:3000`, com uma solicitação aprovada para o aluno sintético configurado. Execute:

```bash
npm run test:e2e:t13
```

As URLs podem ser ajustadas com `FRONTEND_URL`, e as credenciais sintéticas com `E2E_STUDENT_EMAIL` e `E2E_STUDENT_PASSWORD`. O resultado só deve ser considerado evidência executada quando o comando terminar com `browserE2E: "passed"`.

As demais ferramentas executoras continuam sendo adicionadas por Issues próprias (`QA-003`, `QA-005`, `QA-008+`) conforme endpoints, contratos e ambientes forem disponibilizados.

## Pendência de governança

A tag da baseline ainda precisa ser publicada e resolver para o SHA em `.governance-baseline`. Até isso ocorrer, spec-compliance remoto não pode emitir PASS verificável.
