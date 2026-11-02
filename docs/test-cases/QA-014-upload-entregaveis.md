# Casos de Teste: QA-014 — Upload de Entregáveis do Projeto Integrador

- **Issue / Work ID:** QA-014
- **SPEC:** `SPEC-PI-004` (Entregáveis e Uploads em Projetos Integradores)
- **Prioridade / Sprint:** P0 / S2
- **Estimativa:** 8 SP
- **Responsável:** Bianca Cirilo (`@biancacirilo`)
- **Revisor Designado:** Gustavo (`@gustavo`)
- **Dependências:** `BE-012` e `BE-013` (Endpoints de upload seguro, geração de URLs pré-assinadas, integridade de hash e revogação)
- **Baseline de Governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Status:** Casos e testes modelados (Execução em storage real bloqueada aguardando deploy de `BE-012–013`)

---

## 1. Regras de Negócio e Políticas de Segurança (SPEC-PI-004)

1. **Tipos de Arquivo Permitidos:** Apenas documentos técnicos e artefatos acadêmicos (`.pdf`, `.zip`, `.tar.gz`, `.docx`). Extensões executáveis (`.exe`, `.sh`, `.bat`, `.dll`, `.js`) ou mascaramento de MIME type devem ser rejeitados imediatamente.
2. **Limite de Tamanho:** O tamanho máximo do entregável por submissão é de **25 MB** (26.214.400 bytes).
3. **URL Pré-assinada (Presigned URL) com TTL Estrito:** A URL temporária de upload tem tempo de expiração fixo de **15 minutos**. Após este período, a URL é invalidada.
4. **Verificação Obrigatória de Integridade (Checksum Hash):** O cliente deve enviar o hash SHA-256 no início do upload. O backend recalcula e valida o hash do arquivo recebido antes de confirmar a submissão; se divergente, o arquivo é descartado.
5. **Revogação de Objetos:** Objetos excluídos ou substituídos devem ser marcados logicamente como revogados e seu acesso público/privado bloqueado.
6. **Autorização por Equipe (RBAC/Multi-tenant):** Apenas alunos ativos formalmente alocados na equipe do projeto integrador podem submeter entregáveis.

---

## 2. Matriz de Casos de Teste

| ID | Cenário | Condição de Entrada (Massa Sintética) | Regra / Política | Status HTTP Esperado | Resultado Esperado |
|---|---|---|---|:---:|---|
| **TC-UPL-01** | Upload Válido | PDF de 12 MB, hash SHA-256 válido, usuário alocado na equipe, URL dentro do TTL | Tipo/tamanho válidos e integridade preservada | `201 Created` / `200 OK` | Upload concluído com sucesso; metadados persistidos; status `SUBMETIDO`. |
| **TC-UPL-02** | Upload com Tipo Inválido | Arquivo `.exe` renomeado para `.pdf` (`application/x-msdownload`) | Bloqueio de arquivos executáveis e validação de magic bytes | `415 Unsupported Media Type` ou `422` | Rejeição imediata; arquivo não aceito pelo storage. |
| **TC-UPL-03** | Upload com Tamanho Inválido | Arquivo PDF de 32 MB (> 25 MB) | Limite máximo estrito de 25 MB | `413 Payload Too Large` | Rejeição no handshake inicial da URL pré-assinada ou na submissão. |
| **TC-UPL-04** | URL de Upload Expirada | Presigned URL gerada há mais de 16 minutos (TTL = 15m) | Expiração temporal de segurança | `403 Forbidden` ou `410 Gone` | Tentativa de envio rejeitada pelo storage com mensagem de URL expirada. |
| **TC-UPL-05** | Objeto Revogado | Tentativa de download/confirmação de entregável com flag `revoked: true` | Bloqueio de acesso a arquivos revogados | `404 Not Found` ou `410 Gone` | Acesso negado; payload informando que o objeto foi revogado pelo orientador. |
| **TC-UPL-06** | Hash Divergente (Corrupção/Tampering) | Hash enviado: `hash_A`, arquivo possui bytes de `hash_B` | Validação de integridade SHA-256 | `400 Bad Request` ou `422` | Submissão cancelada; integridade corrompida; objeto descartado do storage. |
| **TC-UPL-07** | Usuário Não Autorizado | Aluno da Equipe B tentando submeter na Equipe A | Controle de autorização por equipe (RBAC) | `403 Forbidden` | Bloqueio de acesso; tentativa registrada no log de auditoria. |

---

## 3. Especificação da Massa de Dados Sintética (LGPD & Security Compliant)

Nenhum dado real ou credencial de nuvem é utilizado:
- **Equipe Sintética A:** `TEAM-PI-9901`
- **Equipe Sintética B:** `TEAM-PI-9902`
- **Usuário Aluno Autorizado (Equipe A):** `USR-ALUNO-EQ-A` (RA sintético: `RA-990010`)
- **Usuário Aluno Não Autorizado (Equipe B):** `USR-ALUNO-EQ-B` (RA sintético: `RA-990020`)
- **Hash SHA-256 Válido:** `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- **Hash SHA-256 Divergente:** `ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`
- **Identificador de Objeto Revogado:** `OBJ-REVOKED-DELIVERY-01`

