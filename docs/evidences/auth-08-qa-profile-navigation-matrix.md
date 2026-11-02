# Matriz de Perfis, Navegação Autenticada e Controle de Rotas (`AUTH-08-QA`)

- **Issue de Qualidade:** [`AUTH-08-QA` (`plataforma-quality#31`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/31) / [`QA-009` (`plataforma-quality#9`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/9)
- **Issue Principal (Produto):** [`AUTH-08` (`plataforma-governance#21`)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/21)
- **Refinamento de Governança:** [`PG-006` (`plataforma-governance#6`)](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6)
- **Issues Dependentes (Implementação):**
  - **Backend:** `plataforma-backend#33` (`AUTH-08-BE`), `BE-004`, `BE-006`, `BE-010`
  - **Frontend:** [`AUTH-08-FE-01` (`#26`)](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/issues/26) a [`AUTH-08-FE-07` (`#32`)](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/issues/32) ([PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) e [PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46))
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Matriz Principal: Perfil × Página Inicial × Menus Visíveis × Menus Ocultos × Rotas Recusadas × Regra de Produto

> **Nota normativa (`_KB/README.md`):** As regras oriundas do [Caderno de Validações](https://github.com/UniSENAI-Sorocaba/plataforma-governance/blob/main/_KB/product/official-validation-decisions.md) possuem autoridade de produto confirmada, mas as especificações `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` permanecem em `Draft` até o fechamento de `PG-006` a `PG-012`. Itens sem path ou comportamento fechado em contrato estão sinalizados como **`[Pendente PO/Contrato]`**.

| # | Perfil / Estado de Conta | Página Inicial (Destino Pós-Login) | Menus e Atalhos Visíveis (Permitidos) | Menus e Opções Ocultos (Não Exibidos na UI) | Rotas e Endpoints que Devem Ser Recusados (Link Direto / API Server-Side) | Regra de Produto Correspondente (SPEC / AC / Issue) |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Aluno** *(CPF provisionado e ativo em pelo menos uma turma)* | Área inicial do Aluno (`AUTH-08-FE-04` / [PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44))<br>`[Pendente PO/FE: confirmar URL canônica ex.: /aluno]` | - **Início** (painel acadêmico do aluno)<br>- **Meus Projetos** (consulta a projetos publicados e rascunhos; solicitação de participação em janela vigente; envio/edição de atividades e entregáveis antes da avaliação/prazo; consulta a arquivos e notas individuais do próprio projeto)<br>- **Extensão** (consulta a avisos/editais, submissão/correção de atividades e horas dentro do prazo)<br>- **Avaliações entre alunos** (quando atribuído pela coordenação)<br>- **Troca de senha / Logout** | - Gestão de usuários e permissões<br>- Importação de cadastro CSV<br>- Inativação de aluno ou turma<br>- Criação, edição, reabertura ou arquivamento de proposta/projeto<br>- Aprovação/recusa ou remoção de participantes<br>- Validação ou alteração de horas<br>- Criação de rubrica, finalização ou reabertura de avaliação PI<br>- Redefinição de senha de terceiros | - `/docente` e sub-rotas docentes (`AUTH-08-FE-05`)<br>- Rotas de Coordenação (`AUTH-08-FE-06`) e Administração (`AUTH-08-FE-07`)<br>- Endpoints de importação CSV e gestão de contas (`AC-AUTH-001-03b`, `AC-AUTH-003-02`)<br>- Endpoints de criação/edição/reabertura/arquivamento de projeto (`AC-PI-001-01`, `AC-PI-001-05`, `AC-PI-001-06`)<br>- Endpoints de decisão de matrícula/remoção (`AC-PI-001-10`, `AC-PI-001-13`)<br>- Endpoints de validação/alteração de horas (`AC-EXT-002-03`, `AC-EXT-002-04`)<br>- Consulta a arquivos ou notas individuais de projetos aos quais **não** está vinculado (`AC-PI-004-01`, `AC-PI-003-04`) | - `SPEC-AUTH-001`: `AC-AUTH-001-01`, `AC-AUTH-001-03b`<br>- `SPEC-AUTH-003`: `AC-AUTH-003-02`, `AC-AUTH-003-05`, `AC-AUTH-003-06`<br>- `SPEC-PI-001`: `AC-PI-001-02`, `AC-PI-001-06`, `AC-PI-001-09`, `AC-PI-001-13`, `AC-PI-001-15`<br>- `SPEC-PI-003`: `AC-PI-003-03`, `AC-PI-003-04`, `AC-PI-003-06`<br>- `SPEC-PI-004`: `AC-PI-004-01`, `AC-PI-004-02`<br>- `SPEC-EXT-002`: `AC-EXT-002-01`, `AC-EXT-002-03`<br>- Issues: `AUTH-08`, `AUTH-08-FE-04` |
| **2** | **Professor / Docente** *(Sem função de Coordenação acumulada)* | `/docente` (`AUTH-08-FE-05` / [PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46)) | - **Visão Geral / Início Docente** (`/docente`)<br>- **Projetos Orientados / Propostas** (criar proposta em rascunho/publicado, editar, reabrir/arquivar projetos sob sua responsabilidade, autorizar publicação de fotos)<br>- **Solicitações de Participação** (aprovar/negar pedidos e remover aluno com justificativa obrigatória nos seus projetos)<br>- **Validação de Horas e Atividades** (definir/validar/alterar horas e ajustar prazo nos projetos sob sua responsabilidade)<br>- **Avaliações e Rubricas** (criar rubrica/pesos, finalizar/reabrir/corrigir avaliação de PI próprio; adicionar avaliação de Extensão)<br>- **Avisos** (publicar avisos gerais ou de projeto)<br>- **Redefinir senha de usuário / Trocar própria senha / Logout** | - Importação de cadastros via CSV<br>- Criação/gestão de papéis e permissões globais<br>- Inativação de turma ou de aluno<br>- Definição global de calendário/período de inscrição de editais<br>- Atribuição de qual aluno avalia qual projeto e data<br>- Painel exclusivo de Aluno ou de Coordenação/Admin | - Rotas exclusivas de Coordenação (`AUTH-08-FE-06`), Administração (`AUTH-08-FE-07`) e área exclusiva de Aluno (`AUTH-08-FE-04`)<br>- Endpoints de importação CSV, gestão de permissões e inativação de aluno/turma (`AC-AUTH-001-03b`, `AC-AUTH-003-02`)<br>- Edição, aprovação/remoção de participantes, validação/alteração de horas ou finalização/reabertura de avaliação em **projetos nos quais NÃO é o docente responsável** (`AC-AUTH-003-03`, `AC-PI-001-05`, `AC-PI-001-07`, `AC-PI-001-10`, `AC-PI-003-03`, `AC-EXT-002-03`, `AC-EXT-002-04`)<br>- Remoção de participante sem justificativa (`AC-AUTH-003-04`, `AC-PI-001-13`) | - `SPEC-AUTH-001`: `AC-AUTH-001-03b`, `AC-AUTH-001-04`<br>- `SPEC-AUTH-003`: `AC-AUTH-003-02`, `AC-AUTH-003-03`, `AC-AUTH-003-04`, `AC-AUTH-003-06`<br>- `SPEC-PI-001`: `AC-PI-001-01` a `08`, `AC-PI-001-10`, `AC-PI-001-13`<br>- `SPEC-PI-002` & `SPEC-PI-003`: `AC-PI-003-01` a `03`<br>- `SPEC-PI-004`: `AC-PI-004-01`, `AC-PI-004-04`<br>- `SPEC-EXT-001` & `SPEC-EXT-002`: `AC-EXT-002-03`, `AC-EXT-002-04`<br>- Issues: `AUTH-08`, `AUTH-08-FE-05` |
| **3** | **Coordenador (Coordenação)** *(Sem papel de Docente responsável por projeto)* | Tela inicial do Coordenador (`AUTH-08-FE-06` (`#31`))<br>`[Pendente PO/FE: confirmar URL canônica ex.: /coordenacao]` | - **Início / Painel da Coordenação**<br>- **Usuários e Permissões** (criar/gerenciar usuários e atribuir funções)<br>- **Importação CSV** (provisionamento inicial de cadastros)<br>- **Turmas e Alunos** (inativar turma ou aluno; redefinir senha de usuário)<br>- **Períodos de Inscrição e Avisos** (definir/alterar datas de períodos de inscrição em UTC-3; publicar avisos)<br>- **Atribuição de Avaliadores Discentes** (atribuir qual aluno avalia cada projeto de PI e em qual data)<br>- **Trocar própria senha / Logout** | - Submissão de atividades/entregáveis como Aluno<br>- Solicitação de matrícula em projeto como Aluno<br>- Validação de horas ou aprovação/remoção de alunos em projeto específico *(salvo se acumular função Docente responsável pelo projeto)* | - Rota exclusiva do Aluno (`AUTH-08-FE-04`)<br>- Rota `/docente` (`AUTH-08-FE-05`), caso não possua função Docente acumulada<br>- Ações exclusivas do Docente Responsável por projeto (validar/alterar horas `AC-EXT-002-03`/`04`, aprovar/remover participantes `AC-AUTH-003-03`, criar/fechar rubrica do PI `AC-PI-003-01`/`03`) quando não acumular vínculo docente no projeto<br>- Ações exclusivas de Aluno (`AC-PI-001-09`, `AC-EXT-002-01`) | - `SPEC-AUTH-001`: `AC-AUTH-001-03`, `AC-AUTH-001-03a`, `AC-AUTH-001-03b`, `AC-AUTH-001-04`<br>- `SPEC-AUTH-003`: `AC-AUTH-003-02`, `AC-AUTH-003-03`, `AC-AUTH-003-06`<br>- `SPEC-PI-002` & `SPEC-PI-003`: `AC-PI-003-03`, `AC-PI-003-06`<br>- `SPEC-EXT-001` (períodos de inscrição e avisos)<br>- `SPEC-EXT-002`: `AC-EXT-002-03`, `AC-EXT-002-04`<br>- Issues: `AUTH-08`, `AUTH-08-FE-06` |
| **4** | **Administrador** *(Papel técnico em aberto para reconciliação com PO)* | Tela inicial do Administrador (`AUTH-08-FE-07` (`#32`))<br>`[Pendente PO: confirmar existência do perfil separado de Coordenação]` | - `[Pendente PO]`: `SPEC-PI-004` (`AC-PI-004-01`) e `SPEC-PORTAL-001` citam que *administradores* visualizam arquivos internos de projetos; demais menus dependem de aprovação formal em `SPEC-AUTH-003` / `PG-006` | - Todos os menus de negócio não atribuídos explicitamente após decisão de `PG-006` (negação por padrão) | - Qualquer rota/endpoint de negócio não autorizado explicitamente no servidor (`AC-AUTH-003-06`: *"Para ações e escopos que o caderno não atribui, manter negação por padrão"*) | - `SPEC-AUTH-003`: Seção *"Detalhes ainda não definidos"* (*"papéis técnicos distintos que não aparecem no caderno"*) e `AC-AUTH-003-06`<br>- `SPEC-PI-004`: `AC-PI-004-01`<br>- `SPEC-PORTAL-001`<br>- Issues: `AUTH-08-FE-07`, `PG-006` |
| **5** | **Multi-perfil (Acúmulo de Funções)** *(ex.: Docente + Coordenação no mesmo CPF)* | `[Pendente PO/FE]`: Definir regra de destino padrão no login (`AUTH-08-FE-02`) quando o CPF acumula mais de uma função | - **União dos menus permitidos** às funções atribuídas ao mesmo CPF (ex.: menus de `Coordenação` + menus de `Docente`), sem exigir contas duplicadas (`AUTH-08-FE-03`) | - Menus exclusivos de funções **não** atribuídas àquele CPF (ex.: submissão exclusiva de `Aluno`, se não for aluno ativo) | - Rotas e endpoints de funções **não** atribuídas ao CPF<br>- Escopos de projetos de outros docentes nos quais não seja responsável (`AC-AUTH-003-03`, `AC-PI-001-07`) | - `SPEC-AUTH-001` (*"Um CPF corresponde a um cadastro, que pode receber permissões de mais de uma função"*)<br>- `SPEC-AUTH-003`: `AC-AUTH-003-01` (*Acumular funções*), `AC-AUTH-003-03`, `AC-AUTH-003-06`<br>- Issues: `AUTH-08-FE-02`, `AUTH-08-FE-03` |
| **6** | **Primeiro Acesso ou Senha Redefinida** *(Qualquer perfil com troca de senha pendente)* | Tela obrigatória de criação/troca de senha<br>`[Pendente PO/FE: confirmar URL ex.: /primeiro-acesso ou /trocar-senha]` | - Apenas formulário de definição de nova senha e opção de sair (`Logout`) | - **Todos** os menus funcionais do perfil (`Aluno`, `Docente`, `Coordenação`, `Admin`) ficam ocultos até concluir a troca de senha | - **Todas** as rotas e endpoints de funcionalidades protegidas (`/aluno`, `/docente`, `/coordenacao`, `/admin` e APIs de negócio) devem ser recusados até que a nova senha seja gravada (`AC-AUTH-001-04a`) | - `SPEC-AUTH-001`: `AC-AUTH-001-04`, `AC-AUTH-001-04a` (*"senha temporária ou redefinida por docente/coordenação não permite prosseguir para funcionalidades protegidas sem criar nova senha"*)<br>- `SPEC-AUTH-002` |
| **7** | **Visitante Anônimo / Sessão Encerrada (`Logout`) / Conta Inativa** | Catálogo Público ou Tela de Login (`SPEC-PORTAL-001` / `SPEC-AUTH-001`) | - **Catálogo Público** (apenas projetos marcados como publicados pelo docente responsável, sem notas/horas individuais)<br>- **Login** (autenticação local por CPF e senha) | - Todos os menus do layout autenticado (`AUTH-08-FE-01`, `AUTH-08-FE-03`)<br>- Não há opção/link de autocadastro público (`AC-AUTH-001-03a`) | - Todas as rotas autenticadas (`/aluno`, `/docente`, `/coordenacao`, `/admin` e sub-rotas)<br>- Projetos em estado `rascunho` (`AC-PI-001-02`, `AC-PORTAL-001-02`)<br>- Arquivos internos de projetos, horas e notas individuais (`AC-PI-004-01`, `AC-PORTAL-001-04`)<br>- Qualquer rota pública de autocadastro (`AC-AUTH-001-03a`) | - `SPEC-AUTH-001`: `AC-AUTH-001-02a`, `AC-AUTH-001-03a`<br>- `SPEC-AUTH-002` (encerramento de sessão no logout)<br>- `SPEC-AUTH-003`: `AC-AUTH-003-06`<br>- `SPEC-PORTAL-001`: `AC-PORTAL-001-01` a `05`<br>- `SPEC-PI-004`: `AC-PI-004-01` |

---

## 2. Regras de Proteção Transversais para Validação em `AUTH-08-QA`

1. **Ocultar menu na UI não substitui autorização (`SPEC-AUTH-003` / `AC-AUTH-003-06`):**
   - Tentar abrir por link direto (navegação SSR/client-side) ou chamar diretamente a API de outro perfil ou de projeto fora do escopo deve resultar em negação determinística (`401`/`403` na API e bloqueio/redirecionamento seguro na UI), sem vazar título, membros ou metadados protegidos (`AC-PI-001-07`, `AC-PI-004-01`).
2. **Sanitização de erros e logs (`AC-AUTH-001-05a` / `AC-AUTH-004-02`):**
   - Nenhuma resposta de falha de autenticação/autorização ou log técnico pode expor senha, token, conteúdo de CSV ou dados pessoais fora do escopo.
3. **Ausência de convites individuais (`AC-PI-001-09` / `AC-PI-001-14`):**
   - Menus do Aluno e do Docente não devem exibir fluxos legados de convite individual (aceite/recusa de convite por aluno); o único fluxo oficial é a **solicitação de participação pelo aluno** seguida de **aprovação/negação pelo docente responsável**.
4. **Ausência de agenda/bancas (`SPEC-PI-002`):**
   - Menus de Aluno, Docente e Coordenação não devem conter agendamento de sala, link de banca ou gestão de bancas.

---

## 3. Contas Fictícias e Percorrida de Validação (`templates/test-case.md`)

- **Issue:** `AUTH-08-QA` (`plataforma-quality#31`) / `AUTH-08` (`plataforma-governance#21`)
- **SPEC / critério de aceite:** `SPEC-AUTH-001` (`AC-AUTH-001-01..05`), `SPEC-AUTH-002`, `SPEC-AUTH-003` (`AC-AUTH-003-01..06`), `SPEC-PI-001` (`AC-PI-001-07`, `AC-PI-001-13`, `AC-PI-001-14`), `SPEC-PI-002`, `SPEC-PI-003` (`AC-PI-003-03`, `AC-PI-003-04`), `SPEC-PI-004` (`AC-PI-004-01`), `SPEC-EXT-002` (`AC-EXT-002-03`, `AC-EXT-002-04`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos:**
  - `USR-SINT-01` (**Aluno Ativo**): CPF `000.000.001-01` | Senha `[SYNTHETIC_PASS_ALUNO_01]` | Papel: `ALUNO` | Projeto vinculado: `PRJ-PI-01`
  - `USR-SINT-02` (**Professor / Docente**): CPF `000.000.002-02` | Senha `[SYNTHETIC_PASS_DOCENTE_02]` | Papel: `DOCENTE` | Responsável por: `PRJ-PI-01` (sem vínculo com `PRJ-PI-02`)
  - `USR-SINT-03` (**Coordenador**): CPF `000.000.003-03` | Senha `[SYNTHETIC_PASS_COORD_03]` | Papel: `COORDENACAO`
  - `USR-SINT-04` (**Multi-perfil Docente + Coordenação**): CPF `000.000.004-04` | Senha `[SYNTHETIC_PASS_MULTI_04]` | Papéis: `DOCENTE` + `COORDENACAO` (`AC-AUTH-003-01`)
  - `USR-SINT-05` (**Primeiro Acesso / Senha Redefinida**): CPF `000.000.005-05` | Senha `[SYNTHETIC_TEMP_PASS_05]` | Papel: `ALUNO` | `mustChangePassword=true` (`AC-AUTH-001-04a`)
  - `USR-SINT-06` (**Conta Inativa**): CPF `000.000.006-06` | Senha `[SYNTHETIC_PASS_INATIVO_06]` | Papel: `ALUNO` | `active=false` (`AC-AUTH-001-02a`)
- **Ambiente:** Suíte determinística local (`node --test`) + inspeção das entregas em aberto do Frontend ([PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) e [PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46)) e Backend (`AUTH-08-BE`).

### Passos Executados por Conta Fictícia

| Caso / Conta Sintética | 1. Login | 2. Redirecionamento Pós-Login | 3. Navegação (Menus Visíveis × Menus Ocultos) | 4. Tentativa de Link Direto em Área Proibida | 5. Logout e Reacesso Pós-Logout | Resultado (Harness Normativo vs. Integração Real) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CT-AUTH08-01**<br>`USR-SINT-01` (**Aluno Ativo**) | Autentica com CPF `000.000.001-01` (`200 OK`) | Redireciona para `/aluno` (`AUTH-08-FE-04`) | **Visíveis:** *Início*, *Meus Projetos*, *Extensão*, *Avaliações*, *Trocar Senha*, *Sair*<br>**Ocultos:** *Importação CSV*, *Usuários e Permissões*, *Validação de Horas*, *Meus Convites*, *Agendar Banca* | - `GET /docente` → **Recusado (`403`)**<br>- `GET /coordenacao/usuarios` → **Recusado (`403`)**<br>- `POST /api/users/import-csv` → **Recusado (`403`)**<br>- `GET /aluno/projetos?projectId=PRJ-PI-02` (projeto alheio) → **Recusado (`403`)** | Aciona `Logout` (`204`) → tentar reabrir `GET /aluno` retorna `401` e redireciona para `/login` | - **Harness:** `PASS`<br>- **Integrado FE/BE:** `WARN` ([PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) usa `student-service.ts` mockado; falta guarda `AUTH-08-BE` / `FE-02` / `FE-03`) |
| **CT-AUTH08-02**<br>`USR-SINT-02` (**Docente Responsável**) | Autentica com CPF `000.000.002-02` (`200 OK`) | Redireciona para `/docente` (`AUTH-08-FE-05`) | **Visíveis:** *Visão Geral Docente*, *Projetos Orientados*, *Solicitações de Participação*, *Validação de Horas*, *Avaliações e Rubricas*, *Avisos*, *Redefinir Senha*, *Sair*<br>**Ocultos:** *Importação CSV*, *Turmas e Alunos*, *Meus Projetos*, *Meus Convites*, *Agendar Banca* | - `GET /coordenacao` → **Recusado (`403`)**<br>- `GET /aluno` → **Recusado (`403`)**<br>- `GET /docente/projetos?projectId=PRJ-PI-02` (projeto de outro docente) → **Recusado (`403 FORBIDDEN_PROJECT_SCOPE`)**<br>- Remoção de aluno sem justificativa → **Recusado (`422 JUSTIFICATION_REQUIRED`)** | Aciona `Logout` (`204`) → tentar reabrir `GET /docente` retorna `401` e redireciona para `/login` | - **Harness:** `PASS`<br>- **Integrado FE/BE:** `WARN` ([PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46) expõe `/docente` SSR com `faculty-service.ts` mockado sem bloqueio real de sessão/papel até `AUTH-08-BE`) |
| **CT-AUTH08-03**<br>`USR-SINT-03` (**Coordenador**) | Autentica com CPF `000.000.003-03` (`200 OK`) | Redireciona para `/coordenacao` (`AUTH-08-FE-06`) | **Visíveis:** *Painel da Coordenação*, *Usuários e Permissões*, *Importação CSV*, *Turmas e Alunos*, *Períodos de Inscrição e Avisos*, *Atribuição de Avaliadores*, *Sair*<br>**Ocultos:** *Meus Projetos*, *Validação de Horas*, *Meus Convites*, *Agendar Banca* | - `GET /docente` → **Recusado (`403`)**<br>- `GET /aluno` → **Recusado (`403`)**<br>- `GET /admin` → **Recusado (`403`)** | Aciona `Logout` (`204`) → tentar reabrir `GET /coordenacao` retorna `401` e redireciona para `/login` | - **Harness:** `PASS`<br>- **Integrado FE/BE:** `WARN` (`AUTH-08-FE-06` e `AUTH-08-BE` ainda não entregues) |
| **CT-AUTH08-04**<br>`USR-SINT-04` (**Multi-perfil Docente + Coordenação**) | Autentica com CPF único `000.000.004-04` (`200 OK`) | Redireciona com alerta `WARN` de regra pendente (`AC-AUTH-003-01` / `AUTH-08-FE-02`) | **Visíveis:** União dos menus de `DOCENTE` + `COORDENACAO` (*Importação CSV* + *Validação de Horas*)<br>**Ocultos:** *Meus Projetos* (exclusivo de `ALUNO`) | - `GET /coordenacao` → **Permitido (`200`)**<br>- `GET /docente` (`PRJ-PI-01`) → **Permitido (`200`)**<br>- `GET /aluno` → **Recusado (`403`)**<br>- `GET /docente` (`PRJ-PI-02` alheio) → **Recusado (`403`)** | Aciona `Logout` (`204`) → encerra acesso a ambos os papéis (`401`) | - **Harness:** `PASS`<br>- **Integrado FE/BE:** `WARN` (Regra de rota inicial padrão para multi-perfil pendente do PO) |
| **CT-AUTH08-05**<br>`USR-SINT-05` (**Primeiro Acesso / Senha Redefinida**) | Autentica com senha temporária (`200 OK`) | Redireciona obrigatoriamente para `/primeiro-acesso` (`AC-AUTH-001-04a`) | **Visíveis:** *Trocar Senha Obrigatória*, *Sair*<br>**Ocultos:** Todos os menus de negócio | - Tentativa de pular a troca abrindo link direto `GET /aluno` → **Recusado (`403 PASSWORD_CHANGE_REQUIRED`)**, mantendo em `/primeiro-acesso` | Aciona `Logout` (`204`) → sessão encerrada (`401`) | - **Harness:** `PASS`<br>- **Integrado FE/BE:** `WARN` (Aguarda `AUTH-08-BE` / `FE-004`) |
| **CT-AUTH08-06**<br>`USR-SINT-06` (**Conta Inativa / Sanitização**) | Tentativa de login com CPF inativo `000.000.006-06` | Permanece em `/login` (`401 Unauthorized`) | Nenhum menu autenticado exibido | - Tentativa de link direto `GET /aluno` ou `GET /docente` sem sessão → **Recusado (`401`)**<br>- Resposta de erro sanitizada (não ecoa senha nem CPF) | Não aplicável (sessão não emitida) | - **Harness:** `PASS`<br>- **Integrado FE/BE:** `WARN` (Aguarda `AUTH-08-BE`) |

---

## 4. Registro de Evidência e Respostas Sanitizadas (`templates/evidence.md`)

- **Issue / AC:** `AUTH-08-QA` (`plataforma-quality#31`) / `AUTH-08` (`plataforma-governance#21`) — `AC-AUTH-001-01..05`, `SPEC-AUTH-002`, `AC-AUTH-003-01..06`, `AC-AUTH-004-02`, `AC-PI-001-07`, `AC-PI-001-13..15`, `AC-PI-003-03..04`, `AC-PI-004-01`, `AC-EXT-002-03..04`
- **Commit do sistema sob teste:** `a75f3d1` (`plataforma-quality`) | [PR #44 (`AUTH-08-FE-04`)](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) e [PR #46 (`AUTH-08-FE-05`)](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46) (`plataforma-frontend`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-10-30T17:31:00Z`
- **Executor/ferramenta:** `node --test tests/api/auth-08-rbac-navigation.test.mjs tests/e2e/auth-08-profile-navigation.spec.mjs` + `npm run compliance`
- **Resultado:** `WARN` (Suíte determinística de contrato/regras: `PASS` em 9/9 cenários; validação integrada E2E em homologação: `WARN` por dependência externa de `AUTH-08-BE` e `AUTH-08-FE-01..03, 06..07` e divergências registradas como defeito na Seção 5)
- **Artefatos/logs:**
  - Suíte API/RBAC: [`tests/api/auth-08-rbac-navigation.test.mjs`](../../tests/api/auth-08-rbac-navigation.test.mjs)
  - Suíte E2E/Jornadas: [`tests/e2e/auth-08-profile-navigation.spec.mjs`](../../tests/e2e/auth-08-profile-navigation.spec.mjs)
  - Matriz e Relatório: [`docs/evidences/auth-08-qa-profile-navigation-matrix.md`](./auth-08-qa-profile-navigation-matrix.md)
- **Observações e riscos:** Nenhum segredo, token JWT real ou CPF real foi utilizado. Enquanto `AUTH-08-BE` não estiver integrado ao Frontend, esconder links na UI não impede acesso por URL direta às telas mockadas.

### 4.1. Respostas e Estados de Tela Sanitizados por Perfil

#### A) `USR-SINT-01` — Aluno Ativo (`CT-AUTH08-01` / `E2E-AUTH08-01`)
```json
{
  "accountId": "USR-SINT-01",
  "roles": ["ALUNO"],
  "login": {
    "status": 200,
    "sessionId": "SESS-SINT-1",
    "redirectTo": "/aluno",
    "visibleMenus": ["Início", "Meus Projetos", "Extensão", "Avaliações", "Trocar Senha", "Sair"]
  },
  "directRouteAttempts": {
    "/aluno (PRJ-PI-01)": { "status": 200, "allowed": true, "body": { "area": "ALUNO" } },
    "/aluno/projetos (PRJ-PI-02 alheio)": {
      "status": 403,
      "allowed": false,
      "redirectTo": "/acesso-negado",
      "body": { "code": "FORBIDDEN_PROJECT_READ", "message": "Acesso negado a arquivos ou avaliações individuais de outro projeto." }
    },
    "/docente": {
      "status": 403,
      "allowed": false,
      "redirectTo": "/acesso-negado",
      "body": { "code": "FORBIDDEN_ROLE", "message": "Acesso restrito ao perfil Docente." }
    },
    "/coordenacao": {
      "status": 403,
      "allowed": false,
      "redirectTo": "/acesso-negado",
      "body": { "code": "FORBIDDEN_ROLE", "message": "Acesso restrito ao perfil Coordenação." }
    }
  },
  "logout": { "status": 204, "redirectTo": "/login" },
  "postLogoutAttempt": {
    "status": 401,
    "allowed": false,
    "redirectTo": "/login",
    "body": { "code": "UNAUTHENTICATED", "message": "Sessão ausente, expirada ou encerrada." }
  }
}
```

#### B) `USR-SINT-02` — Professor / Docente Responsável (`CT-AUTH08-02` / `E2E-AUTH08-02`)
```json
{
  "accountId": "USR-SINT-02",
  "roles": ["DOCENTE"],
  "login": {
    "status": 200,
    "sessionId": "SESS-SINT-2",
    "redirectTo": "/docente",
    "visibleMenus": [
      "Visão Geral Docente",
      "Projetos Orientados",
      "Solicitações de Participação",
      "Validação de Horas",
      "Avaliações e Rubricas",
      "Avisos",
      "Redefinir Senha de Usuário",
      "Trocar Senha",
      "Sair"
    ]
  },
  "directRouteAttempts": {
    "/docente (PRJ-PI-01 próprio)": { "status": 200, "allowed": true, "body": { "area": "DOCENTE" } },
    "/docente (PRJ-PI-02 de outro docente)": {
      "status": 403,
      "allowed": false,
      "redirectTo": "/acesso-negado",
      "body": { "code": "FORBIDDEN_PROJECT_SCOPE", "message": "Operação negada: docente não é responsável por este projeto." }
    },
    "/api/projects/manage (remoção sem justificativa)": {
      "status": 422,
      "allowed": false,
      "body": { "code": "JUSTIFICATION_REQUIRED", "message": "Justificativa obrigatória para remover participante do projeto." }
    },
    "/coordenacao": {
      "status": 403,
      "allowed": false,
      "redirectTo": "/acesso-negado",
      "body": { "code": "FORBIDDEN_ROLE", "message": "Acesso restrito ao perfil Coordenação." }
    },
    "/aluno": {
      "status": 403,
      "allowed": false,
      "redirectTo": "/acesso-negado",
      "body": { "code": "FORBIDDEN_ROLE", "message": "Acesso restrito ao perfil Aluno." }
    }
  },
  "logout": { "status": 204, "redirectTo": "/login" },
  "postLogoutAttempt": {
    "status": 401,
    "allowed": false,
    "redirectTo": "/login",
    "body": { "code": "UNAUTHENTICATED", "message": "Sessão ausente, expirada ou encerrada." }
  }
}
```

#### C) `USR-SINT-03` — Coordenador (`CT-AUTH08-03` / `E2E-AUTH08-03`) e `USR-SINT-04` — Multi-perfil (`CT-AUTH08-04`)
```json
{
  "coordenadorAtivo": {
    "accountId": "USR-SINT-03",
    "roles": ["COORDENACAO"],
    "redirectTo": "/coordenacao",
    "visibleMenus": [
      "Painel da Coordenação",
      "Usuários e Permissões",
      "Importação CSV",
      "Turmas e Alunos",
      "Períodos de Inscrição e Avisos",
      "Atribuição de Avaliadores",
      "Redefinir Senha de Usuário",
      "Trocar Senha",
      "Sair"
    ],
    "directRouteAttempts": {
      "/coordenacao": { "status": 200, "allowed": true },
      "/api/users/import-csv": { "status": 200, "allowed": true },
      "/docente (sem papel Docente)": { "status": 403, "allowed": false, "code": "FORBIDDEN_ROLE" },
      "/aluno": { "status": 403, "allowed": false, "code": "FORBIDDEN_ROLE" }
    }
  },
  "multiPerfilDocenteCoord": {
    "accountId": "USR-SINT-04",
    "roles": ["DOCENTE", "COORDENACAO"],
    "pendingRuleWarning": "WARN [AC-AUTH-003-01 / AUTH-08-FE-02]: Regra de destino inicial para acúmulo de funções aguarda confirmação do PO.",
    "directRouteAttempts": {
      "/coordenacao": { "status": 200, "allowed": true },
      "/docente (PRJ-PI-01 próprio)": { "status": 200, "allowed": true },
      "/docente (PRJ-PI-02 alheio)": { "status": 403, "allowed": false, "code": "FORBIDDEN_PROJECT_SCOPE" },
      "/aluno": { "status": 403, "allowed": false, "code": "FORBIDDEN_ROLE" }
    }
  }
}
```

#### D) `USR-SINT-05` (Primeiro Acesso / Senha Redefinida) e `USR-SINT-06` (Conta Inativa)
```json
{
  "alunoSenhaRedefinida": {
    "accountId": "USR-SINT-05",
    "login": { "status": 200, "redirectTo": "/primeiro-acesso", "visibleMenus": ["Trocar Senha Obrigatória", "Sair"] },
    "directAttemptToAlunoBeforeChange": {
      "status": 403,
      "allowed": false,
      "redirectTo": "/primeiro-acesso",
      "body": { "code": "PASSWORD_CHANGE_REQUIRED", "message": "Necessário definir nova senha antes de acessar áreas protegidas." }
    }
  },
  "alunoInativo": {
    "accountId": "USR-SINT-06",
    "login": {
      "status": 401,
      "redirectTo": "/login",
      "body": { "code": "AUTH_INVALID_OR_INACTIVE", "message": "Credenciais inválidas ou conta não habilitada para acesso." }
    }
  }
}
```

---

## 5. Registro de Defeitos e Bloqueios Observados (`templates/defect.md`)

### Defeito 1: Telas iniciais de Aluno e Docente renderizam dados mockados e permitem acesso por link direto sem guarda de sessão/papel

- **Issue/AC relacionado:** `AUTH-08` (`plataforma-governance#21`), `AUTH-08-QA` (`plataforma-quality#31`), `AUTH-08-BE` (`plataforma-backend#33`), `AUTH-08-FE-02` (`#27`), `AUTH-08-FE-03` (`#28`), `AUTH-08-FE-04` ([PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44)), `AUTH-08-FE-05` ([PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46)) / `AC-AUTH-003-05`, `AC-AUTH-003-06`
- **Ambiente e versão:** Branches de PR do repositório `plataforma-frontend` ([PR #44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) e [PR #46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46)) — Sprint `S1`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Bloqueador de aceite para `AUTH-08`)
- **Pré-condições:** Executar a aplicação frontend com as entregas parciais `AUTH-08-FE-04` ou `AUTH-08-FE-05` sem o backend `AUTH-08-BE` e sem o middleware de guarda de rotas `AUTH-08-FE-02`/`FE-03`.
- **Passos para reproduzir:**
  1. Iniciar o servidor Next.js da branch do [PR #46 (`AUTH-08-FE-05`)](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46) ou [PR #44 (`AUTH-08-FE-04`)](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44).
  2. Sem autenticar como Docente (ou autenticado com perfil `ALUNO`), navegar diretamente pela barra de endereços para a URL `/docente`.
  3. Observar a renderização da tela inicial do professor.
- **Resultado observado:** A rota SSR `/docente` (e a tela inicial do aluno) carrega dados estáticos de `faculty-service.ts` / `student-service.ts` sem validar sessão ativa nem recusar perfil distinto em `AUTH-08-BE`.
- **Resultado esperado:** Conforme a matriz da `AUTH-08-QA` e `AC-AUTH-003-06`, tentar abrir `/docente` por link direto com perfil `ALUNO` (ou sem sessão) deve ser recusado (`403 Forbidden` / redirecionamento seguro para área permitida ou `/login`), pois esconder o menu sozinho não basta.
- **Evidência sem dados sensíveis:** Descrição técnica e escopo declarados nos próprios PRs [#44](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/44) (*"camada de serviço mock para permitir o avanço do front-end sem bloqueio pela dependência AUTH-08-BE"*) e [#46](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/pull/46) (*"Isolamento de dados mockados em faculty-service.ts ... para futura integração com AUTH-08-BE"*).
- **Owner sugerido:** Squads **Backend** (`AUTH-08-BE` / `BE-004` / `BE-010`) e **Frontend** (`AUTH-08-FE-02` e `AUTH-08-FE-03` — Paola de Oliveira / Kaique Silva).

---

### Defeito 2: Ausência de implementação do layout autenticado comum (`Logout`), redirecionamento pós-login e tela inicial de Coordenação

- **Issue/AC relacionado:** `AUTH-08` (`plataforma-governance#21`), `AUTH-08-FE-01` (`#26`), `AUTH-08-FE-02` (`#27`), `AUTH-08-FE-03` (`#28`), `AUTH-08-FE-06` (`#31`) / `SPEC-AUTH-002`, `AC-AUTH-003-02`
- **Ambiente e versão:** Repositório `plataforma-frontend` (`main` e issues abertas `#26`, `#27`, `#28`, `#31`) — Sprint `S1`
- **Severidade e prioridade:** Alta (`High`) / `P0`
- **Pré-condições:** Consultar as issues dependentes de `AUTH-08` no repositório `plataforma-frontend`.
- **Passos para reproduzir:**
  1. Verificar o estado de entrega das issues `AUTH-08-FE-01` (`#26` — layout autenticado e saída), `AUTH-08-FE-02` (`#27` — redirecionamento por perfil), `AUTH-08-FE-03` (`#28` — menus por perfil) e `AUTH-08-FE-06` (`#31` — tela inicial do coordenador).
  2. Tentar executar o fluxo ponta a ponta de login → redirecionamento → menu filtrado → logout para o perfil `COORDENACAO`.
- **Resultado observado:** As issues `#26`, `#27`, `#28` e `#31` encontram-se abertas (`open`) e sem PR integrado, impossibilitando a validação E2E real do redirecionamento da Coordenação e da revogação de sessão no botão `Sair` (`Logout`).
- **Resultado esperado:** Cada perfil aprovado deve possuir tela inicial, menu filtrado pelo papel e ação de `Logout` funcional que invalide a sessão (`SPEC-AUTH-002`).
- **Evidência sem dados sensíveis:** Rastreabilidade de issues dependentes em [`plataforma-governance#21`](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/21#issuecomment-6046695399) e listagem de issues abertas em `plataforma-frontend`.
- **Owner sugerido:** Squad **Frontend** (`AUTH-08-FE-01`, `FE-02`, `FE-03`, `FE-06`) em conjunto com **Backend** (`AUTH-08-BE` / `BE-006`).

---

### Defeito 3: Divergência normativa sobre o perfil "Administrador" (`AUTH-08-FE-07`) e ausência de regra de destino inicial para Acúmulo de Funções (`AC-AUTH-003-01`)

- **Issue/AC relacionado:** `AUTH-08` (`plataforma-governance#21`), `PG-006` (`plataforma-governance#6`), `AUTH-08-FE-07` (`plataforma-frontend#32`) / `SPEC-AUTH-003` (`AC-AUTH-003-01`, `AC-AUTH-003-06`)
- **Ambiente e versão:** Base normativa `plataforma-governance` (`SPEC-AUTH-003` em `Draft`) vs. Backlog `plataforma-frontend` (`#32`)
- **Severidade e prioridade:** Média (`Medium`) / `P1` (Exige decisão humana do PO — `WARN`)
- **Pré-condições:** Comparar os papéis oficiais de `SPEC-AUTH-003` com as issues filhas de `AUTH-08`.
- **Passos para reproduzir:**
  1. Ler a `SPEC-AUTH-003` (`_KB/specs/SPEC-AUTH-003-rbac.md`), que estabelece oficialmente apenas **Coordenação**, **Docentes** e **Alunos** e lista *"papéis técnicos distintos que não aparecem no caderno"* como detalhe não definido.
  2. Confrontar com a issue [`AUTH-08-FE-07` (`plataforma-frontend#32`)](https://github.com/UniSENAI-Sorocaba/plataforma-frontend/issues/32) (*"Implementar tela inicial do administrador"*).
  3. Verificar na `SPEC-AUTH-003` (`AC-AUTH-003-01`) para qual URL inicial deve ir um usuário que acumula duas funções no mesmo CPF (ex.: `DOCENTE` + `COORDENACAO`).
- **Resultado observado:** Não há aprovação normativa para o papel `Administrador` separado de `Coordenação` nem regra de precedência de redirecionamento pós-login para contas multi-perfil.
- **Resultado esperado:** O PO deve confirmar em `PG-006` se `AUTH-08-FE-07` será cancelada/absorvida por `Coordenação` e qual é a rota inicial padrão quando o CPF possui múltiplos papéis.
- **Evidência sem dados sensíveis:** Seção *"Detalhes ainda não definidos"* de `SPEC-AUTH-003` e issue `PG-006` (`plataforma-governance#6`).
- **Owner sugerido:** **Product Owner** (Fellipe Raszejas — `PG-006`).


---

## 6. Checklist "Pronto quando" (`Definition of Done` — `AUTH-08-QA`) e Vínculo de PR/Revisão

| Critério "Pronto quando" (`plataforma-quality#31`) | Status na Suíte QA (`tests/api` + `tests/e2e`) | Status na Integração Real (`FE` + `BE`) | Evidência / Vínculo Rastreável |
| :--- | :---: | :---: | :--- |
| **1. Os perfis aprovados têm resultado para redirecionamento, menus e rota proibida.** | `PASS` (`9/9` cenários automatizados aprovados) | `WARN` (Bloqueado por `AUTH-08-BE` e `AUTH-08-FE-01..03, 06..07`) | - Matriz (Seção 1) e Casos `CT-AUTH08-01..06` (Seção 3)<br>- Respostas sanitizadas para **Aluno**, **Docente**, **Coordenação** e **Multi-perfil** (Seção 4.1)<br>- Automação: [`tests/api/auth-08-rbac-navigation.test.mjs`](../../tests/api/auth-08-rbac-navigation.test.mjs) e [`tests/e2e/auth-08-profile-navigation.spec.mjs`](../../tests/e2e/auth-08-profile-navigation.spec.mjs) |
| **2. Logout encerra o acesso conforme a regra de sessão.** | `PASS` (`204` no logout + `401` ao tentar reabrir rota autenticada por link direto) | `WARN` (Aguarda `AUTH-08-FE-01`, `BE-006` e fechamento de `SPEC-AUTH-002` em `PG-006`) | - Verificado em `CT-AUTH08-01..05` e `E2E-AUTH08-01..03` (`postLogoutAttempt.status === 401`, `redirectTo === "/login"`)<br>- Defeito 2 registrado na Seção 5 |
| **3. Evidência, defeitos, PR e revisão estão vinculados.** | `PASS` (Todos os artefatos versionados e rastreados) | `WARN` (Aguardando revisão humana de Gabriel Ribeiro) | - **Evidência:** Este relatório (`docs/evidences/auth-08-qa-profile-navigation-matrix.md`) e [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)<br>- **Defeitos:** Defeitos 1, 2 e 3 registrados com passos de reprodução na Seção 5<br>- **Branch / PR:** [`feat/auth-08-qa-profile-navigation`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/tree/feat/auth-08-qa-profile-navigation) ([Abrir/Visualizar PR](https://github.com/UniSENAI-Sorocaba/plataforma-quality/pull/new/feat/auth-08-qa-profile-navigation))<br>- **Revisor designado:** Gabriel Ribeiro de Camargo Miranda (`@GabrielRibeiro`) |
