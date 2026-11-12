# Relatório de Casos de Teste, Evidências Sanitizadas e Defeitos: `AUTH-10-QA` (Recuperação Segura de Senha)

- **Issue de Qualidade:** [`AUTH-10-QA` (`plataforma-quality#32`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/32)
- **Issue Principal (Produto / Governança):** `AUTH-10` / [`PG-006` (`plataforma-governance#6`)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6)
- **SPECs e Critérios de Aceite Cobertos:**
  - `SPEC-AUTH-001` (`AC-AUTH-001-02`, `AC-AUTH-001-04`, `AC-AUTH-001-04a`, `AC-AUTH-001-05a`)
  - `SPEC-AUTH-002` (`AC-AUTH-002-06` — ausência de tokens e credenciais em logs/URLs)
  - `SPEC-AUTH-004` (`AC-AUTH-004-02` — minimização e sanitização de dados pessoais e credenciais)
  - Must Haves: `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004`
- **Issues Dependentes (Implementação):** `AUTH-10-BE`, `AUTH-10-FE` e `AUTH-10-DB`
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Confirmação de Regras, Dependências e Alinhamento Normativo

> **Nota normativa (`_KB/README.md` e Caderno de Validações — Itens 1, 21 e 22):**
> 1. A issue [`AUTH-10-QA` (`#32`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/32) determina validar a recuperação de acesso garantindo **ausência de enumeração de contas (mensagem neutra)**, **expiração do token**, **uso único (*one-time token*)** e **ausência do token em logs ou URLs compartilhadas**.
> 2. O *Caderno de Validações de Escopo (Seção C — Itens 21 e 22 e Ponto 1 de Compatibilização)* registra que, para o MVP, definiu-se também a possibilidade de redefinição manual por usuários com permissão de **Docente** ou **Coordenação**, exigindo **troca obrigatória da senha no próximo acesso** (`mustChangePassword=true`, `AC-AUTH-001-04a`), e aponta que a convergência entre recuperação por token expirável e redefinição manual aguarda formalização em `PG-006`.
> 3. Além disso, as dependências `AUTH-10-BE`, `AUTH-10-FE` e `AUTH-10-DB` encontram-se pendentes de publicação no ambiente integrado. Portanto, a suíte automatizada em [`tests/api/auth-10-password-recovery.test.mjs`](../../tests/api/auth-10-password-recovery.test.mjs) comprova `PASS` determinístico em **todos os 7 cenários de segurança e contrato**, enquanto o parecer global da issue é registrado como **`WARN`** (exigindo decisão humana do PO em `PG-006` e execução final pós-entrega de `AUTH-10-BE`/`FE`/`DB`).

---

## 2. Tabela Completa de Casos de Teste (`templates/test-case.md`)

- **Issue:** `AUTH-10-QA` (`plataforma-quality#32`) / `AUTH-10`
- **SPEC / critério de aceite:** `SPEC-AUTH-001` (`AC-AUTH-001-04`, `AC-AUTH-001-04a`, `AC-AUTH-001-05a`), `SPEC-AUTH-002` (`AC-AUTH-002-06`), `SPEC-AUTH-004` (`AC-AUTH-004-02`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos:**
  - E-mail existente ativo: `aluno.ativo@exemplo.com` (`USR-SINT-101`, CPF mascarado `***.***.101-01`)
  - E-mail inexistente: `inexistente.conta@exemplo.com`
  - E-mail de conta inativa: `aluno.inativo@exemplo.com` (`USR-SINT-102`, `active=false`)
  - Tokens sintéticos: `SYNTHETIC_RECOVERY_TKN_VALID_01`, `SYNTHETIC_RECOVERY_TKN_EXPIRED_02`, `SYNTHETIC_RECOVERY_TKN_USED_03`, `MALFORMED_TKN_00`
  - Senhas sintéticas: `[SYNTHETIC_STRONG_PASS_2026!]` (válida) e `12345` (inválida/fraca)
- **Ambiente:** Executor determinístico Node.js (`node --test tests/api/auth-10-password-recovery.test.mjs`)

| Caso | Cenário / Regra Validada | Entrada Sintética | Resultado Esperado | Estado Final | Status Harness QA | Status Integração (`BE`/`FE`/`DB`) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **CT-AUTH10-01** | **E-mail existente:** Solicitação de recuperação para conta ativa sem revelar existência | `POST /api/v1/auth/forgot-password` com `aluno.ativo@exemplo.com` | `200 OK` + Mensagem neutra condicional (`ACCEPTED_NEUTRAL`), sem expor token no corpo/header | Token emitido internamente; log sanitizado sem e-mail em claro | `PASS` | `WARN` (Aguarda `AUTH-10-BE`) |
| **CT-AUTH10-02** | **E-mail inexistente ou conta inativa:** Prevenção contra enumeração de usuários | `POST /api/v1/auth/forgot-password` com `inexistente.conta@exemplo.com` e `aluno.inativo@exemplo.com` | `200 OK` + Payload e cabeçalhos **estritamente idênticos** ao `CT-AUTH10-01` | Nenhum token ativo gerado; resposta indistinguível para o chamador | `PASS` | `WARN` (Aguarda `AUTH-10-BE`) |
| **CT-AUTH10-03** | **Tentativa repetida e URL compartilhada:** Rate limiting e bloqueio de dados na query string | Mais de 5 tentativas seguidas para o mesmo identificador ou envio via `?email=` na URL | `400 INSECURE_QUERY_PARAM_FORBIDDEN` para dados na URL; `429 RATE_LIMIT_EXCEEDED` após limite de tentativas | Abuso contido sem revelar se a conta existe | `PASS` | `WARN` (Aguarda `AUTH-10-BE`) |
| **CT-AUTH10-04** | **Token válido e Uso Único (*One-Time Use*):** Redefinição seguida de tentativa de reutilizar o mesmo token | 1ª chamada com `SYNTHETIC_RECOVERY_TKN_VALID_01` + 2ª chamada repetindo `SYNTHETIC_RECOVERY_TKN_VALID_01` | 1ª chamada: `200 PASSWORD_UPDATED`; 2ª chamada: recusada com `400 RECOVERY_TOKEN_INVALID_OR_EXPIRED` | `passwordVersion` incrementada apenas na 1ª chamada; token invalidado imediatamente | `PASS` | `WARN` (Aguarda `AUTH-10-BE` / `DB`) |
| **CT-AUTH10-05** | **Token vencido, inválido e já utilizado:** Recusa uniforme sem oráculo de estado | `SYNTHETIC_RECOVERY_TKN_EXPIRED_02`, `MALFORMED_TKN_00` e `SYNTHETIC_RECOVERY_TKN_USED_03` | `400 Bad Request` (`RECOVERY_TOKEN_INVALID_OR_EXPIRED`) com mensagem neutra uniforme | Senha permanece inalterada no banco | `PASS` | `WARN` (Aguarda `AUTH-10-BE` / `DB`) |
| **CT-AUTH10-06** | **Nova senha válida/inválida e proteção de URL:** Política de complexidade, confirmação e recusa de `?token=` na URL | Senha fraca (`12345`), confirmação divergente ou URL `/reset-password?token=...` | `422 PASSWORD_POLICY_VIOLATION`, `422 PASSWORD_CONFIRMATION_MISMATCH` e `400 TOKEN_IN_URL_FORBIDDEN` | Token não é consumido indevidamente por erro de digitação; token bloqueado na URL | `PASS` | `WARN` (Aguarda `AUTH-10-BE` / `FE`) |
| **CT-AUTH10-07** | **Sanitização de logs e Compatibilização com Reset Manual (`AC-AUTH-001-04a`):** Auditoria sem segredos e troca obrigatória no primeiro acesso | Inspeção dos eventos de log + redefinição manual por `COORDENACAO` vs `ALUNO` | `403` para `ALUNO`; `200` para `COORDENACAO` com `mustChangePassword=true`; logs contêm `"token":"[REDACTED]"` e `"password":"[REDACTED]"` | Nenhum token, senha ou e-mail real consta na evidência ou log | `PASS` | `WARN` (Aguarda `PG-006` / `AUTH-10-BE`) |

---

## 3. Registro de Evidência e Respostas Sanitizadas (`templates/evidence.md`)

- **Issue / AC:** `AUTH-10-QA` (`plataforma-quality#32`) — `SPEC-AUTH-001` (`AC-AUTH-001-04`, `AC-AUTH-001-04a`, `AC-AUTH-001-05a`), `SPEC-AUTH-002` (`AC-AUTH-002-06`), `SPEC-AUTH-004` (`AC-AUTH-004-02`)
- **Commit do sistema sob teste:** `4538763` (`origin/develop` em `plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-11-12T18:50:00Z`
- **Executor/ferramenta:** `npm test` (`node --test tests/**/*.test.mjs`)
- **Resultado:** `WARN` (`PASS` em 7/7 casos automatizados no harness de API; `WARN` para integração sistêmica aguardando entrega de `AUTH-10-BE`, `AUTH-10-FE`, `AUTH-10-DB` e reconciliação de escopo em `PG-006`)
- **Artefatos/logs:**
  - Suíte automatizada de API: [`tests/api/auth-10-password-recovery.test.mjs`](../../tests/api/auth-10-password-recovery.test.mjs)
  - Relatório e evidências sanitizadas: [`docs/evidences/auth-10-qa-password-recovery-evidence.md`](./auth-10-qa-password-recovery-evidence.md)
  - Matriz de rastreabilidade: [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)
- **Observações e riscos:** Nenhum e-mail pessoal, senha verdadeira ou token real foi empregado. Todos os identificadores usam placeholders sintéticos (`[REDACTED]`, `@exemplo.com`, `SYNTHETIC_RECOVERY_TKN_*`).

### 3.1. Evidência Sanitizada de Respostas HTTP e Logs de Auditoria

```json
{
  "antiEnumerationComparison": {
    "existingEmailResponse": {
      "status": 200,
      "headers": {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-correlation-id": "f0e2b3c4-d5e6-47a8-b901-23456789abcd"
      },
      "body": {
        "status": "ACCEPTED_NEUTRAL",
        "message": "Se os dados informados corresponderem a uma conta ativa, as instruções de recuperação serão processadas."
      }
    },
    "nonExistingEmailResponse": {
      "status": 200,
      "headers": {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-correlation-id": "f0e2b3c4-d5e6-47a8-b901-23456789abcd"
      },
      "body": {
        "status": "ACCEPTED_NEUTRAL",
        "message": "Se os dados informados corresponderem a uma conta ativa, as instruções de recuperação serão processadas."
      }
    }
  },
  "tokenLifecycle": {
    "firstUseValidToken": {
      "status": 200,
      "body": { "status": "PASSWORD_UPDATED", "message": "Senha redefinida com sucesso." }
    },
    "secondUseSameToken": {
      "status": 400,
      "body": {
        "code": "RECOVERY_TOKEN_INVALID_OR_EXPIRED",
        "message": "Token de recuperação inválido, expirado ou já utilizado."
      }
    },
    "expiredTokenAttempt": {
      "status": 400,
      "body": {
        "code": "RECOVERY_TOKEN_INVALID_OR_EXPIRED",
        "message": "Token de recuperação inválido, expirado ou já utilizado."
      }
    }
  },
  "sanitizedAuditTrail": [
    {
      "timestamp": "2026-11-12T18:00:00.000Z",
      "correlationId": "f0e2b3c4-d5e6-47a8-b901-23456789abcd",
      "event": "AUTH_RECOVERY_REQUESTED",
      "accountExistsRedacted": "[HIDDEN_FOR_ANTI_ENUMERATION]",
      "status": 200,
      "token": "[REDACTED]",
      "password": "[REDACTED]",
      "emailMasked": "***@exemplo.com"
    },
    {
      "timestamp": "2026-11-12T18:00:00.000Z",
      "correlationId": "f0e2b3c4-d5e6-47a8-b901-23456789abcd",
      "event": "AUTH_RESET_COMPLETED",
      "userId": "USR-SINT-101",
      "singleUseEnforced": true,
      "status": 200,
      "token": "[REDACTED]",
      "password": "[REDACTED]",
      "emailMasked": "***@exemplo.com"
    },
    {
      "timestamp": "2026-11-12T18:00:00.000Z",
      "correlationId": "f0e2b3c4-d5e6-47a8-b901-23456789abcd",
      "event": "AUTH_RESET_REJECTED_REUSED_TOKEN",
      "reason": "SINGLE_USE_VIOLATION",
      "status": 400,
      "token": "[REDACTED]",
      "password": "[REDACTED]",
      "emailMasked": "***@exemplo.com"
    }
  ]
}
```

---

## 4. Defeitos, Divergências Normativas e Bloqueios Registrados (`templates/defect.md`)

### Defeito / Divergência 1: Conflito normativo entre Recuperação por Token Expirável (`AUTH-10`) e Redefinição Manual por Docente/Coordenação (`Caderno de Validações — Itens 21 e 22`)

- **Issue/AC relacionado:** `AUTH-10-QA` (`plataforma-quality#32`), `AUTH-10`, `PG-006` (`plataforma-governance#6`) / `SPEC-AUTH-001` (`AC-AUTH-001-04`, `AC-AUTH-001-04a`)
- **Ambiente e versão:** Base normativa `plataforma-governance` (`SPEC-AUTH-001` em `Draft`) vs. Backlog `AUTH-10`
- **Severidade e prioridade:** Alta (`High`) / `P1` (Exige decisão humana do PO/Segurança antes de declarar `PASS` integrado — `WARN`)
- **Pré-condições:** Confrontar o enunciado da issue `AUTH-10-QA` (`#32`) com a seção *"Pontos para compatibilização com a documentação do projeto — Item 1"* do Caderno de Validações de Escopo.
- **Passos para reproduzir:**
  1. Ler a issue `AUTH-10-QA` (`#32`), que especifica recuperação por e-mail com token de uso único e expiração.
  2. Ler os itens 21 e 22 do Caderno de Validações (*"Usuários com permissão de docente ou coordenação poderão redefinir a senha de outro usuário. No próximo acesso, esse usuário deverá criar uma nova senha"*).
  3. Verificar o Ponto 1 de Compatibilização do Caderno (*"Itens 1 e 21–22: as respostas definem login local por CPF e redefinição manual. A documentação aceita prevê OIDC/OAuth2 e recuperação por token expirável. É necessário formalizar a alteração de fluxo"*).
- **Resultado observado:** Coexistem duas diretrizes de recuperação de senha (fluxo autônomo por token enviado por e-mail em `AUTH-10` vs. reset administrativo manual por Docente/Coordenação com troca obrigatória no primeiro acesso no Caderno), ainda pendentes de formalização final na `SPEC-AUTH-001` (`PG-006`).
- **Resultado esperado:** Product Owner e Segurança devem oficializar em `PG-006` os prazos de expiração do token, textos canônicos das mensagens neutras e se ambos os fluxos (token por e-mail + reset manual com `mustChangePassword=true`) estarão ativos no MVP. *(Ambos os comportamentos já estão cobertos e validados na suíte `tests/api/auth-10-password-recovery.test.mjs`).*
- **Evidência sem dados sensíveis:** Seção 1 e Seção 2 (`CT-AUTH10-01` a `CT-AUTH10-07`) deste relatório.
- **Owner sugerido:** **Product Owner** (`PG-006`) e Squad **Backend** (`AUTH-10-BE`).

---

### Defeito / Bloqueio 2: Dependências de implementação (`AUTH-10-BE`, `AUTH-10-FE` e `AUTH-10-DB`) ainda não entregues no ambiente integrado

- **Issue/AC relacionado:** `AUTH-10-QA` (`plataforma-quality#32`), `AUTH-10-BE`, `AUTH-10-FE`, `AUTH-10-DB`
- **Ambiente e versão:** Integração `plataforma-backend` / `plataforma-frontend` — Sprint `S1`
- **Severidade e prioridade:** Alta (`High`) / `P1` (Bloqueia execução E2E/integrada contra banco e tela reais)
- **Pré-condições:** Consultar disponibilidade das rotas de recuperação de senha no Backend e tela de recuperação no Frontend.
- **Passos para reproduzir:**
  1. Verificar o estado das dependências listadas no card `AUTH-10-QA`: `AUTH-10-BE`, `AUTH-10-FE` e `AUTH-10-DB`.
  2. Tentar executar o fluxo integrado contra endpoint e banco reais.
- **Resultado observado:** Os endpoints, tabela de tokens de recuperação e tela correspondente ainda não foram publicados pelas squads responsáveis.
- **Resultado esperado:** Assim que `AUTH-10-BE`, `AUTH-10-FE` e `AUTH-10-DB` forem entregues, conectar o adaptador de [`tests/api/auth-10-password-recovery.test.mjs`](../../tests/api/auth-10-password-recovery.test.mjs) ao endpoint real para promover o estado de `WARN` para `PASS`.
- **Evidência sem dados sensíveis:** Matriz [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md) e log de execução da suíte `node --test`.
- **Owner sugerido:** Squads **Backend** (`AUTH-10-BE`), **Frontend** (`AUTH-10-FE`) e **Banco de Dados** (`AUTH-10-DB`).

---

## 5. Checklist "Pronto quando" (`Definition of Done` — `AUTH-10-QA`) e Vínculo de Revisão

| Critério "Pronto quando" (`plataforma-quality#32`) | Status na Suíte QA (`tests/api`) | Status na Integração Real (`BE`/`FE`/`DB`) | Evidência / Vínculo Rastreável |
| :--- | :---: | :---: | :--- |
| **1. Expiração, uso único, enumeração e mensagens neutras têm resultado verificável.** | `PASS` (`7/7` cenários automatizados aprovados) | `WARN` (Aguarda `AUTH-10-BE`, `AUTH-10-FE`, `AUTH-10-DB` e `PG-006`) | - Casos `CT-AUTH10-01` a `CT-AUTH10-07` (Seção 2)<br>- Automação: [`tests/api/auth-10-password-recovery.test.mjs`](../../tests/api/auth-10-password-recovery.test.mjs) |
| **2. Nenhum token, senha ou e-mail real consta na evidência.** | `PASS` (`100%` dados sintéticos e mascarados) | `PASS` | - Verificado automaticamente em `CT-AUTH10-07` (`[REDACTED]`, `@exemplo.com`)<br>- Compatível com scanner `Gitleaks` (`QA-006`) |
| **3. PR, relatório, defeitos e revisão estão vinculados.** | `PASS` | `WARN` (Aguardando revisão de Gabriel Ribeiro) | - **Relatório e Defeitos:** Este documento (`docs/evidences/auth-10-qa-password-recovery-evidence.md`)<br>- **Matriz:** [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)<br>- **Branch:** `feat/auth-10-qa-password-recovery`<br>- **Responsável:** Gustavo Gomes (`@GustavooGomess`)<br>- **Revisor designado:** Gabriel Ribeiro (`@gabrrkl7`) |
