# Plataforma Digital — Qualidade, Testes & Segurança

Estrutura transversal para estratégia, evidências e suítes de API, contrato, E2E, performance e segurança. Testes unitários permanecem junto ao código do backend/frontend; este repositório concentra validações integradas e independentes.

## Estrutura

- `docs`: estratégia, matriz AC→evidência e relatórios de conformidade;
- `templates`: caso de teste, evidência e defeito;
- `tests/api`: testes HTTP integrados;
- `tests/contract`: compatibilidade OpenAPI/JSON Schema;
- `tests/e2e`: jornadas críticas com Playwright;
- `tests/performance`: cenários k6 versionados;
- `tests/security`: configurações e cenários SAST/SCA/DAST;
- `scripts`: validações determinísticas do próprio repositório (`scripts/spec-compliance.mjs`).

## Validação e Execução do Spec-Compliance

```bash
# Executar suíte de testes determinísticos do repositório
npm test

# Executar verificação de conformidade (spec-compliance)
npm run compliance

# Opcional: apontar para clone local da Governança ou emitir JSON
node scripts/spec-compliance.mjs --governance-dir ../plataforma-governance
node scripts/spec-compliance.mjs --json
```

O comando `npm run compliance` avalia as regras normativas contra `.governance-baseline` (`governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`) e o diff do repositório, exibindo `Regra`, `Arquivo`, `Motivo`, `Resultado` (`PASS` | `WARN` | `FAIL`) e `Referência da baseline`. Em caso de `FAIL`, encerra com código de saída `1` (diferente de zero), bloqueando o gate de PR.

As ferramentas executoras adicionais serão integradas por Issues próprias (`QA-005`, `QA-008+`) quando endpoints, contratos e ambientes existirem.

## Pendência de governança

A tag da baseline (`governance-v0.1.0`) ainda precisa ser publicada no repositório `plataforma-governance` e resolver para o SHA `379131e3fa7c0411d5055b14b6bb30dd0853a3b5` em `.governance-baseline`. Até isso ocorrer, `spec-compliance` emite `WARN` (não declara `PASS` sem a tag verificável).
