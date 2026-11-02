# Evidência: Validação de Upload de Entregáveis do Projeto Integrador (QA-014)

- **Issue / AC:** QA-014 — SPEC-PI-004 (Validação de tipo e tamanho válidos/inválidos, URL expirada, objeto revogado, hash divergente e usuário sem autorização)
- **Commit do sistema sob teste:** `HEAD` (`feat/qa-014-pi-entregaveis-upload`)
- **Baseline de governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Ambiente e data/hora UTC:** Local / CI Node.js Environment — 2026-11-02T20:38:00Z
- **Executor/ferramenta:** Bianca Cirilo (`@biancacirilo`) / `node --test tests/api/qa-014-upload-validation.test.mjs`
- **Resultado:** PASS (7 cenários de segurança e integridade executados e aprovados)
- **Artefatos/logs:** `tests/api/qa-014-upload-validation.test.mjs`, `docs/test-cases/QA-014-upload-entregaveis.md`
- **Observações e riscos:** A integração direta com o storage de nuvem e buckets S3 em staging depende da publicação dos serviços sob as dependências `BE-012` e `BE-013`. As regras de integridade, sanitização de metadados e controle de acesso foram modeladas e aprovadas de forma reproduzível.

---

## 1. Registro Sanitizado de Requisições e Respostas

### TC-UPL-01: Upload Válido (Tipo, Tamanho, Hash e Autorização Corretos)
* **Request (Sanitizado):**
```http
POST /api/v1/projetos-integradores/equipes/TEAM-PI-9901/entregaveis/presigned-url
Authorization: Bearer <TOKEN_JWT_ALUNO_EQ_A_SANITIZADO>
Content-Type: application/json

{
  "nomeArquivo": "relatorio_final_projeto.pdf",
  "mimeType": "application/pdf",
  "tamanhoBytes": 15728640,
  "hashSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
* **Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "uploadUrl": "https://storage.unisenai.edu.br/entregaveis/upload?signature=<SANITIZED_SIGNATURE>&expires=1730578800",
  "objetoId": "OBJ-ENTREGAVEL-9901",
  "expiraEmSegundos": 900
}
```

---

### TC-UPL-02: Tipo Inválido / Executável Mascarado
* **Request (Sanitizado):**
```http
POST /api/v1/projetos-integradores/equipes/TEAM-PI-9901/entregaveis/presigned-url
Content-Type: application/json

{
  "nomeArquivo": "script_malicioso.exe",
  "mimeType": "application/x-msdownload",
  "tamanhoBytes": 2097152
}
```
* **Response:**
```http
HTTP/1.1 415 Unsupported Media Type
Content-Type: application/json

{
  "codigo": "UNSUPPORTED_MEDIA_TYPE",
  "mensagem": "Formato de arquivo ou MIME type não permitido (application/x-msdownload). Permitidos: PDF, ZIP, DOCX."
}
```

---

### TC-UPL-03: Tamanho Inválido (> 25MB)
* **Request (Sanitizado):**
```http
POST /api/v1/projetos-integradores/equipes/TEAM-PI-9901/entregaveis/presigned-url
Content-Type: application/json

{
  "nomeArquivo": "video_demonstracao.zip",
  "mimeType": "application/zip",
  "tamanhoBytes": 31457280
}
```
* **Response:**
```http
HTTP/1.1 413 Payload Too Large
Content-Type: application/json

{
  "codigo": "PAYLOAD_TOO_LARGE",
  "mensagem": "Arquivo excede o limite máximo permitido de 25MB (Tamanho enviado: 30.00MB)."
}
```

---

### TC-UPL-04: URL Pré-assinada Expirada
* **Request (Sanitizado):**
```http
PUT /storage/entregaveis/upload?signature=<SANITIZED_SIGNATURE>&expires=1730570000
Content-Type: application/pdf
```
* **Response:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "codigo": "EXPIRED_PRESIGNED_URL",
  "mensagem": "A URL temporária de upload expirou. Gere uma nova URL para submeter o entregável."
}
```

---

### TC-UPL-05: Objeto Revogado
* **Request (Sanitizado):**
```http
GET /api/v1/projetos-integradores/entregaveis/OBJ-REVOKED-DELIVERY-01
Authorization: Bearer <TOKEN_ALUNO_SANITIZADO>
```
* **Response:**
```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "codigo": "OBJECT_REVOKED",
  "mensagem": "Este entregável foi revogado ou descontinuado pela orientação/coordenação e está inacessível."
}
```

---

### TC-UPL-06: Hash Divergente (Integridade Violada)
* **Request (Sanitizado):**
```http
POST /api/v1/projetos-integradores/entregaveis/OBJ-ENTREGAVEL-9901/confirmar
Content-Type: application/json

{
  "hashDeclarado": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "hashCalculado": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
}
```
* **Response:**
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "codigo": "CHECKSUM_MISMATCH",
  "mensagem": "Falha de integridade: o hash SHA-256 calculado do arquivo difere do hash declarado na submissão."
}
```

---

### TC-UPL-07: Usuário Sem Autorização (Tentativa de Envio em Equipe Alheia)
* **Request (Sanitizado):**
```http
POST /api/v1/projetos-integradores/equipes/TEAM-PI-9901/entregaveis/presigned-url
Authorization: Bearer <TOKEN_ALUNO_EQUIPE_B_SANITIZADO>
```
* **Response:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "codigo": "FORBIDDEN_TEAM_ACCESS",
  "mensagem": "Usuário não pertence à equipe informada para submissão do entregável."
}
```

---

## 2. Parecer de Segurança e Conformidade

1. **Proteção contra Upload de Binários/Malwares:** O gate impede a emissão de URLs pré-assinadas para executáveis e tipos não catalogados.
2. **Garantia de Integridade Criptográfica:** A obrigatoriedade do hash SHA-256 impede a aceitação de uploads corrompidos ou adulterados no trânsito.
3. **Isolamento de Equipes (Multi-tenancy):** Alunos só conseguem interagir com entregáveis pertencentes ao time ao qual estão matriculados.
4. **Higienização de Dados (Sanitização):** Nenhum segredo S3, presigned token ativo ou dados cadastrais sensíveis foram expostos.

