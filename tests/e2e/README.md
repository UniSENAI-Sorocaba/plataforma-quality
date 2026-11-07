# E2E

Jornadas críticas no staging com Playwright, dados sintéticos e limpeza idempotente.

## Suítes disponíveis

- [`auth-08-profile-navigation.spec.mjs`](./auth-08-profile-navigation.spec.mjs): Validação da jornada autenticada por perfil (`ALUNO`, `DOCENTE`, `COORDENACAO`), redirecionamento pós-login, menus visíveis/ocultos, bloqueio de link direto a rotas proibidas e encerramento de sessão no logout (`AUTH-08-QA` / `SPEC-AUTH-001..004`).
- [`qa-019-staging-critical-journeys.spec.mjs`](./qa-019-staging-critical-journeys.spec.mjs): Validação E2E Playwright das 12 jornadas críticas expostas pelo frontend (`FE-004..016`) cobrindo login, sessão, proposta, solicitação de participação, aprovação/negação docente, edital, banca, upload, horas, notas, certificado e catálogo público (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003`, `SPEC-PORTAL-001..002`), com captura automática e sanitizada de `screenshot` (`only-on-failure`), `video` (`retain-on-failure`) e `trace` (`retain-on-failure`) em falhas (`QA-019`).
