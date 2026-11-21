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
## T14 — Oportunidades de extensão no navegador

`npm run test:e2e:t14` valida login de aluno, carregamento do edital sintético publicado, inscrição e confirmação da inscrição na tela contra frontend, backend e PostgreSQL reais. O fixture padrão é `b0000000-0000-4000-8000-000000000401`; remova a inscrição sintética antes de reexecutar o cenário.
