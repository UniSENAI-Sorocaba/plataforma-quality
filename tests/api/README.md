# API

Testes integrados dos endpoints publicados pelo backend. Não duplicar testes unitários.

## Suítes publicadas

- `auth-10-password-recovery.test.mjs`: validação de recuperação segura de senha, prevenção de enumeração de contas, uso único/expiração de token, bloqueio de token em URL/logs e redefinição manual com troca obrigatória (`AUTH-10-QA` / `#32`).
- `qa022-audit-privacy.test.mjs`: validação de minimização de dados, auditoria completa e política de retenção (`QA-022` / `#22`).
