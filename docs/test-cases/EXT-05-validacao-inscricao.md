# Casos de Teste: EXT-05 — Validação de Inscrição em Atividade de Extensão

- **Issue:** [EXT-05 (Issue #25)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/25)
- **Responsável:** Vitor Fazano (`vfazano`)
- **Revisor:** Gabriel Ribeiro
- **Sprint:** S4
- **Dependências:** `EXT-05-BE`, `EXT-05-FE`, `EXT-05-DB`
- **Baseline de Governança:** `governance-v0.1.0` (379131e3fa7c0411d5055b14b6bb30dd0853a3b5)
- **Status:** Planejado / Casos modelados (Execução bloqueada aguardando entrega das dependências)

---

## 1. Dúvidas e Alinhamentos para o Product Owner (PO)

Antes da execução dos testes com resultados definitivos, os seguintes pontos foram levantados para validação com o PO:
1. **Janela de Inscrição:** O encerramento no último dia ocorre às 23:59:59 (horário de Brasília/UTC-3) ou em horário customizado?
2. **Critérios de Elegibilidade:** Quais condições impedem a inscrição? (ex.: vínculo/matrícula inativa, curso diferente do público-alvo da atividade, restrição acadêmica/documental).
3. **Duplicidade:** O bloqueio de duplicidade considera CPF/RA único por atividade? Caso o usuário cancele a inscrição voluntariamente durante a janela, ele tem permissão para se inscrever novamente?
4. **Códigos de Resposta de API:** O backend deve responder `422 Unprocessable Entity` ou `400 Bad Request` para prazo expirado/inelegibilidade? E `409 Conflict` para duplicidade?
5. **Máquina de Estados de Inscrição:** Quais são todas as transições legais e ilegais? Exemplo:
   - `SOLICITADA` -> `CONFIRMADA` (Permitida por avaliador/sistema)
   - `SOLICITADA` -> `CANCELADA` (Permitida por aluno/avaliador)
   - `CANCELADA` -> `CONCLUIDA` (Proibida)
   - `REJEITADA` -> `CONFIRMADA` (Proibida sem recurso formal)

---

## 2. Massa de Dados Fictícios / Sintéticos (LGPD Compliant)

Nenhum dado pessoal real será utilizado. Os dados sintéticos combinados com BE/DB são:

### Usuários Sintéticos
- `USR-ELEGIVEL-01`: Aluno ativo, curso compatível, sem pendências (Elegível).
- `USR-INELEGIVEL-02`: Aluno com matrícula trancada / curso não elegível (Inelegível).
- `USR-DUPLICADO-03`: Aluno elegível que já possui registro prévio na atividade.
- `USR-GESTOR-04`: Usuário com papel administrativo/avaliador de extensão.

### Atividades de Extensão Fictícias
- `ACT-OPEN-01`: Inscrições abertas (Início: D-5 dias, Fim: D+10 dias).
- `ACT-BEFORE-02`: Inscrições futuras / antes do prazo (Início: D+5 dias, Fim: D+20 dias).
- `ACT-AFTER-03`: Inscrições encerradas / depois do prazo (Início: D-30 dias, Fim: D-2 dias).

---

## 3. Matriz de Casos de Teste x Regras de Negócio

| ID | Cenário | Regra de Negócio | Pré-condição / Entrada | Canal | Resultado Esperado |
|---|---|---|---|---|---|
| **TC-EXT-05-01** | Inscrição Válida | Permissão de inscrição apenas para elegíveis e dentro do prazo | Usuário `USR-ELEGIVEL-01` e Atividade `ACT-OPEN-01` | API & UI | **API:** Status `201 Created`, payload com status `SOLICITADA`/`CONFIRMADA`.<br>**UI:** Notificação de sucesso, redirecionamento para inscrições ativas. |
| **TC-EXT-05-02** | Inscrição Antes do Prazo | Inscrições só podem ser realizadas dentro da janela aprovada | Usuário `USR-ELEGIVEL-01` e Atividade `ACT-BEFORE-02` | API & UI | **API:** Rejeição com erro `422` ou `400` ("Inscrições não iniciadas").<br>**UI:** Botão desabilitado com aviso "Inscrições em breve". |
| **TC-EXT-05-03** | Inscrição Depois do Prazo | Bloqueio imediato após o encerramento do prazo | Usuário `USR-ELEGIVEL-01` e Atividade `ACT-AFTER-03` | API & UI | **API:** Rejeição com erro `422` ou `400` ("Prazo de inscrições encerrado").<br>**UI:** Indicador "Inscrições encerradas", formulário inacessível. |
| **TC-EXT-05-04** | Inscrição de Pessoa Inelegível | Apenas candidatos que atendem aos requisitos podem se inscrever | Usuário `USR-INELEGIVEL-02` e Atividade `ACT-OPEN-01` | API & UI | **API:** Rejeição com erro `403 Forbidden` ou `422` ("Candidato inelegível: motivo X").<br>**UI:** Mensagem amigável explicando a restrição de perfil. |
| **TC-EXT-05-05** | Inscrição Repetida / Duplicada | Rejeição de segunda inscrição igual para o mesmo candidato e atividade | Usuário `USR-DUPLICADO-03` e Atividade `ACT-OPEN-01` | API & UI | **API:** Rejeição com erro `409 Conflict` ("Inscrição já realizada para esta atividade").<br>**UI:** Aviso em destaque "Você já está inscrito nesta atividade". |
| **TC-EXT-05-06** | Transição de Estado Proibida | Estados de inscrição devem seguir rigorosamente a máquina de estados aprovada | Inscrição em estado `CANCELADA` ou `REJEITADA` | API | **API:** Tentativa de alteração para `CONCLUIDA` rejeitada com `422 Unprocessable Entity` ("Transição de estado inválida"). Banco permanece íntegro. |
| **TC-EXT-05-07** | Transição de Estado por Papel Não Autorizado | Aluno não pode alterar o próprio estado para aprovado/concluído | Usuário `USR-ELEGIVEL-01` tentando PATCH de status | API | **API:** Rejeição com status `403 Forbidden` (RBAC). |

---

## 4. Detalhamento dos Passos de Execução

### TC-EXT-05-01: Inscrição Válida
1. Autenticar como `USR-ELEGIVEL-01`.
2. Acessar a atividade `ACT-OPEN-01` (na API via `POST /api/v1/extensao/atividades/{id}/inscricoes` ou pela tela de detalhes da atividade).
3. Submeter formulário de inscrição com dados válidos.
4. **Validação:** Inscrição gravada no banco com status inicial correto; resposta da API `201 Created`; tela exibe confirmação.

### TC-EXT-05-02: Inscrição Antes do Prazo
1. Autenticar como `USR-ELEGIVEL-01`.
2. Tentar enviar requisição de inscrição para a atividade futura `ACT-BEFORE-02`.
3. Na UI, inspecionar a tela da atividade.
4. **Validação:** Requisição rejeitada (`400`/`422`); nenhum registro gravado no DB; UI exibe botão de inscrição desabilitado.

### TC-EXT-05-03: Inscrição Depois do Prazo
1. Autenticar como `USR-ELEGIVEL-01`.
2. Tentar enviar requisição de inscrição para a atividade encerrada `ACT-AFTER-03`.
3. Na UI, inspecionar a tela da atividade.
4. **Validação:** Requisição rejeitada (`400`/`422`); DB inalterado; UI exibe aviso de prazo encerrado.

### TC-EXT-05-04: Pessoa Inelegível
1. Autenticar como `USR-INELEGIVEL-02`.
2. Submeter inscrição para a atividade `ACT-OPEN-01`.
3. **Validação:** Rejeição com código `403`/`422`; mensagem de inelegibilidade clara; nenhuma inscrição persistida.

### TC-EXT-05-05: Inscrição Repetida
1. Autenticar como `USR-DUPLICADO-03` (já previamente inscrito em `ACT-OPEN-01`).
2. Tentar nova submissão de inscrição na mesma atividade.
3. **Validação:** Rejeição com `409 Conflict`; banco mantém apenas 1 registro único da inscrição original.

### TC-EXT-05-06: Transição de Estado Proibida
1. Identificar inscrição em estado final/intermediário restrito (ex.: `CANCELADA`).
2. Submeter `PATCH /api/v1/extensao/inscricoes/{id}/status` com payload `{"status": "CONCLUIDA"}`.
3. **Validação:** Rejeição com erro de transição inválida (`422 Unprocessable Entity`); estado no banco de dados continua `CANCELADA`.

---

## 5. Próximos Passos (Critérios de Desbloqueio)

- [ ] Disponibilização do ambiente com migrações e seeds (`EXT-05-DB`).
- [ ] Deploy dos endpoints da API de extensão (`EXT-05-BE`).
- [ ] Deploy da tela de inscrição (`EXT-05-FE`).
- [ ] Coleta de logs, requests e responses sanitizados.
- [ ] Abertura de defeitos para eventuais discrepâncias encontradas.
- [ ] Submissão de PR e solicitação de review para Gabriel Ribeiro.

