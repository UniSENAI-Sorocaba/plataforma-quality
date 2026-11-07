# API

Testes integrados dos endpoints publicados pelo backend. Não duplicar testes unitários.

## Suítes disponíveis

- [`qa-008-auth-session-rotation-reuse.test.mjs`](./qa-008-auth-session-rotation-reuse.test.mjs): Validação dos fluxos de login, refresh rotativo, logout, expiração, detecção de reuse com revogação da família de tokens e ausência de tokens/segredos em logs (`QA-008` / `SPEC-AUTH-001` e `SPEC-AUTH-002`).
- [`qa-009-rbac-route-authorization.test.mjs`](./qa-009-rbac-route-authorization.test.mjs): Validação server-side de autorização RBAC/ABAC (`allow`/`deny` por perfil, rota, escopo e recurso) em `SPEC-AUTH-003`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` (`QA-009`).
- [`qa-013-banca-scheduling-concurrency.test.mjs`](./qa-013-banca-scheduling-concurrency.test.mjs): Validação de criação de banca, normalização e colisão entre timezones, avaliador duplicado ou inválido, sobreposição de horário e concorrência garantindo que no máximo um agendamento conflitante seja confirmado (`QA-013` / `SPEC-PI-002`).
- [`qa-018-portal-public-catalog.test.mjs`](./qa-018-portal-public-catalog.test.mjs): Validação de catálogo público expondo somente itens publicados e fotos autorizadas, filtros determinísticos sem busca oráculo privada, paginação estável (`publishedAt DESC, id ASC`), página vazia, invalidação de cache após retirada e ausência total de campos privados em API, SSR e metadata (`QA-018` / `SPEC-PORTAL-001` e `SPEC-PORTAL-002`).
- [`auth-08-rbac-navigation.test.mjs`](./auth-08-rbac-navigation.test.mjs): Validação de controle de acesso por perfil, redirecionamento pós-login, isolamento de escopo de projetos e bloqueio de rotas proibidas por link direto (`AUTH-08-QA` / `SPEC-AUTH-001..004`).
