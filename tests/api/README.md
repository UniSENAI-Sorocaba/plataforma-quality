# API

Testes integrados dos endpoints publicados pelo backend. Não duplicar testes unitários.

## Suítes disponíveis

- [`qa-008-auth-session-rotation-reuse.test.mjs`](./qa-008-auth-session-rotation-reuse.test.mjs): Validação dos fluxos de login, refresh rotativo, logout, expiração, detecção de reuse com revogação da família de tokens e ausência de tokens/segredos em logs (`QA-008` / `SPEC-AUTH-001` e `SPEC-AUTH-002`).
- [`auth-08-rbac-navigation.test.mjs`](./auth-08-rbac-navigation.test.mjs): Validação de controle de acesso por perfil, redirecionamento pós-login, isolamento de escopo de projetos e bloqueio de rotas proibidas por link direto (`AUTH-08-QA` / `SPEC-AUTH-001..004`).
