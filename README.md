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

As ferramentas executoras serão adicionadas por Issues próprias (`QA-003`, `QA-005`, `QA-008+`) quando endpoints, contratos e ambientes existirem.

## Pendência de governança

A tag da baseline ainda precisa ser publicada e resolver para o SHA em `.governance-baseline`. Até isso ocorrer, spec-compliance remoto não pode emitir PASS verificável.
