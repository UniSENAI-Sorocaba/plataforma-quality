# Evidências da Issue QA-011

## Escopo

Testes HTTP da SPEC-PI-001 para criação de projetos e participações. Os cenários abaixo registram os critérios de aceite cobertos:

- Criar projeto com sucesso e receber `201`; rejeitar payload inválido com `400`.
- Criar participação em projeto existente e receber `201`; informar `404` para projeto inexistente.

## Arquivos

- `tests/api/support/qa-011/contract.mjs`: rotas, enums e payloads de exemplo.
- `tests/api/support/qa-011/mockFetch.mjs`: mock local dos endpoints.
- `tests/api/qa-011-pi001-projetos-http.test.mjs`: cenários de criação de projeto.
- `tests/api/qa-011-pi001-participacao-http.test.mjs`: cenários de criação de participação.

## Execução local com mock

No PowerShell, na raiz do repositório:

```powershell
$env:QA_INTEGRATED = "1"
$env:USE_MOCK_API = "1"
node --test .\tests\api\qa-011-pi001-projetos-http.test.mjs .\tests\api\qa-011-pi001-participacao-http.test.mjs
Remove-Item Env:QA_INTEGRATED
Remove-Item Env:USE_MOCK_API
```

Resultado validado: 4 testes aprovados, sem falhas ou testes ignorados.

Essa execução usa o mock local e não comprova integração com uma API real. Para validar o backend, é necessário configurar os endpoints e fornecer um `QA_PROJECT_ID` válido para o cenário de participação.
