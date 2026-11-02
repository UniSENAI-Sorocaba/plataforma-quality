# Evidência: Emissão, Validação e Revogação de Certificados (QA-017)

- **Issue / AC:** QA-017 — SPEC-EXT-003 (Emissão autorizada, hash/QR válido, certificado adulterado, código inválido e revogação com motivo minimizado)
- **Commit do sistema sob teste:** `HEAD` (`feat/qa-017-ext-certificados-revogacao`)
- **Baseline de governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Ambiente e data/hora UTC:** Local / CI Node.js Environment — 2026-11-02T20:44:00Z
- **Executor/ferramenta:** Vitor Fazano (`vfazano`) / `node --test tests/api/qa-017-certificates-validation.test.mjs`
- **Resultado:** PASS (5 cenários de segurança, integridade criptográfica e privacidade LGPD aprovados)
- **Artefatos/logs:** `tests/api/qa-017-certificates-validation.test.mjs`, `docs/test-cases/QA-017-certificados-revogacao.md`
- **Observações e riscos:** A emissão física dos PDFs finais pelo backend depende da conclusão da dependência `BE-017`. O modelo de validação pública, detecção de adulteração e minimização de motivos na revogação foi validado de forma reproduzível.

---

## 1. Arquivos e Modelos Sintéticos de Certificado

### Modelo Sintético do Certificado Emitido (JSON/Metadados)
```json
{
  "codigo": "CERT-EXT-2026-9901",
  "aluno": "Aluno Sintético UniSENAI A",
  "documentoSanitizado": "***.456.789-**",
  "atividade": "Workshop de Robótica Sustentável",
  "cargaHoraria": 40,
  "dataEmissao": "2026-11-02T17:00:00Z",
  "emissor": "Coordenação de Extensão UniSENAI",
  "hashOficialSha256": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
  "qrCodeUrl": "https://validar.unisenai.edu.br/certificados/CERT-EXT-2026-9901"
}
```

---

## 2. Respostas de Validação Pública Registradas

### TC-CERT-01: Emissão Autorizada
* **Request:**
```http
POST /api/v1/extensao/certificados/emitir
Authorization: Bearer <TOKEN_COORDENACAO_SANITIZADO>
Content-Type: application/json

{
  "alunoId": "USR-ALUNO-01",
  "atividadeId": "ACT-EXT-01",
  "cargaHorariaIntegralizada": 40
}
```
* **Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "codigo": "CERT-EXT-2026-9901",
  "status": "EMITIDO",
  "qrCodeUrl": "https://validar.unisenai.edu.br/certificados/CERT-EXT-2026-9901"
}
```

---

### TC-CERT-02: Consulta Pública com QR Code / Hash Válido
* **Request:**
```http
GET /api/v1/certificados/validar/CERT-EXT-2026-9901?hash=a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0
```
* **Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "statusDocumento": "AUTENTICO",
  "codigo": "CERT-EXT-2026-9901",
  "aluno": "Aluno Sintético UniSENAI A",
  "atividade": "Workshop de Robótica Sustentável",
  "cargaHoraria": 40,
  "dataEmissao": "2026-11-02T17:00:00Z"
}
```

---

### TC-CERT-03: Certificado Adulterado (Hash Divergente)
* **Request:**
```http
GET /api/v1/certificados/validar/CERT-EXT-2026-9901?hash=hash_modificado_fraudulento
```
* **Response:**
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "codigo": "CERTIFICATE_TAMPERED",
  "statusDocumento": "ADULTERADO",
  "mensagem": "Falha de integridade: o hash do documento difere do hash oficial registrado no momento da emissão."
}
```

---

### TC-CERT-04: Código Inexistente
* **Request:**
```http
GET /api/v1/certificados/validar/CERT-INEXISTENTE-0000
```
* **Response:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "codigo": "CERTIFICATE_NOT_FOUND",
  "mensagem": "Certificado não encontrado no registro oficial."
}
```

---

### TC-CERT-05: Revogação com Motivo Minimizado (LGPD)
* **Request:**
```http
GET /api/v1/certificados/validar/CERT-EXT-2026-9902
```
* **Response:**
```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "statusDocumento": "REVOGADO",
  "codigo": "CERT-EXT-2026-9902",
  "motivoPublico": "Revogado por decisão administrativa",
  "dataRevogacao": "2026-11-02T17:40:00Z"
}
```

---

## 3. Parecer de Segurança e Conformidade (LGPD & SPEC-EXT-003)

1. **Minimização de Dados (Privacy by Design):** Na consulta pública a certificados revogados, informações médicas, disciplinares ou cadastrais são rigorosamente filtradas na API, retornando exclusivamente a categoria pública padronizada.
2. **Inviolabilidade por QR Code:** O QR Code direciona para a validação oficial do domínio institucional, impedindo falsificação visual de certificados impressos ou digitais.
3. **Imutabilidade e Integridade:** Documentos adulterados não passam pela conferência de hash SHA-256.

