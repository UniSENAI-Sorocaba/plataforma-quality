# E2E

Jornadas críticas no staging com Playwright, dados sintéticos e limpeza idempotente.
## T07 — primeiro acesso e recuperação

Com backend fonte, PostgreSQL e Mailpit reais em execução:

```bash
E2E_BASE_URL=http://localhost:18081 MAILPIT_URL=http://localhost:8025 \
  node tests/e2e/t07-identity-recovery.mjs
```

O teste valida primeiro acesso, login, solicitação de recuperação, entrega SMTP,
reset, novo login e rejeição de reuso. O token é usado apenas em memória e nunca
é impresso no relatório.
