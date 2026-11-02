import assert from "node:assert/strict";
import test from "node:test";

/**
 * Constantes normativas de SPEC-PI-004.
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
export const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".dll", ".js", ".bin"];

/**
 * Validação de solicitação de upload seguro (SPEC-PI-004 / BE-012).
 */
export function validateUploadRequest({ filename, mimeType, sizeBytes, userId, teamMembers }) {
  // 1. Autorização por equipe
  if (!teamMembers || !teamMembers.includes(userId)) {
    return {
      allowed: false,
      status: 403,
      code: "FORBIDDEN_TEAM_ACCESS",
      error: "Usuário não pertence à equipe informada para submissão do entregável.",
    };
  }

  // 2. Validação de tamanho
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      allowed: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      error: `Arquivo excede o limite máximo permitido de 25MB (Tamanho enviado: ${(sizeBytes / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  // 3. Validação de tipo / extensão proibida
  const lowerName = (filename || "").toLowerCase();
  const hasBlockedExt = BLOCKED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (hasBlockedExt || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      allowed: false,
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      error: `Formato de arquivo ou MIME type não permitido (${mimeType}). Permitidos: PDF, ZIP, DOCX.`,
    };
  }

  return { allowed: true, status: 200, code: "OK" };
}

/**
 * Validação de expiração de URL temporária / pré-assinada (SPEC-PI-004).
 */
export function validatePresignedUrl({ expiresAt, currentTimestamp = Date.now() }) {
  if (currentTimestamp > expiresAt) {
    return {
      valid: false,
      status: 403,
      code: "EXPIRED_PRESIGNED_URL",
      error: "A URL temporária de upload expirou. Gere uma nova URL para submeter o entregável.",
    };
  }
  return { valid: true, status: 200, code: "OK" };
}

/**
 * Validação de integridade do arquivo através de hash SHA-256 (SPEC-PI-004 / BE-013).
 */
export function validateFileIntegrity({ declaredHash, actualHash }) {
  if (!declaredHash || !actualHash || declaredHash.toLowerCase() !== actualHash.toLowerCase()) {
    return {
      valid: false,
      status: 422,
      code: "CHECKSUM_MISMATCH",
      error: "Falha de integridade: o hash SHA-256 calculado do arquivo difere do hash declarado na submissão.",
    };
  }
  return { valid: true, status: 200, code: "OK" };
}

/**
 * Validação de acesso a objeto no repositório de entregáveis (SPEC-PI-004).
 */
export function validateObjectAccess({ isRevoked }) {
  if (isRevoked) {
    return {
      accessible: false,
      status: 410,
      code: "OBJECT_REVOKED",
      error: "Este entregável foi revogado ou descontinuado pela orientação/coordenação e está inacessível.",
    };
  }
  return { accessible: true, status: 200, code: "OK" };
}

// =========================================================================
// SUÍTE DE TESTES: QA-014 (SPEC-PI-004)
// =========================================================================

test("TC-UPL-01: permite upload quando tipo, tamanho, hash e permissão são válidos", () => {
  const uploadResult = validateUploadRequest({
    filename: "relatorio_final_projeto.pdf",
    mimeType: "application/pdf",
    sizeBytes: 15 * 1024 * 1024, // 15 MB
    userId: "USR-ALUNO-01",
    teamMembers: ["USR-ALUNO-01", "USR-ALUNO-02"],
  });

  assert.equal(uploadResult.allowed, true);
  assert.equal(uploadResult.status, 200);

  const urlResult = validatePresignedUrl({
    expiresAt: Date.now() + 600000, // expira em 10 min
  });
  assert.equal(urlResult.valid, true);

  const integrityResult = validateFileIntegrity({
    declaredHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    actualHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  });
  assert.equal(integrityResult.valid, true);
});

test("TC-UPL-02: rejeita upload com tipo de arquivo inválido (415 Unsupported Media Type)", () => {
  const res = validateUploadRequest({
    filename: "exploit.exe",
    mimeType: "application/x-msdownload",
    sizeBytes: 2 * 1024 * 1024,
    userId: "USR-ALUNO-01",
    teamMembers: ["USR-ALUNO-01"],
  });

  assert.equal(res.allowed, false);
  assert.equal(res.status, 415);
  assert.equal(res.code, "UNSUPPORTED_MEDIA_TYPE");
  assert.match(res.error, /Formato de arquivo ou MIME type não permitido/);
});

test("TC-UPL-03: rejeita upload com tamanho superior a 25MB (413 Payload Too Large)", () => {
  const res = validateUploadRequest({
    filename: "video_demonstracao.zip",
    mimeType: "application/zip",
    sizeBytes: 30 * 1024 * 1024, // 30 MB (> 25MB)
    userId: "USR-ALUNO-01",
    teamMembers: ["USR-ALUNO-01"],
  });

  assert.equal(res.allowed, false);
  assert.equal(res.status, 413);
  assert.equal(res.code, "PAYLOAD_TOO_LARGE");
  assert.match(res.error, /Arquivo excede o limite máximo permitido de 25MB/);
});

test("TC-UPL-04: rejeita envio com URL pré-assinada expirada (403 Forbidden)", () => {
  const now = Date.now();
  const res = validatePresignedUrl({
    expiresAt: now - 5000, // expirada há 5 segundos
    currentTimestamp: now,
  });

  assert.equal(res.valid, false);
  assert.equal(res.status, 403);
  assert.equal(res.code, "EXPIRED_PRESIGNED_URL");
  assert.match(res.error, /A URL temporária de upload expirou/);
});

test("TC-UPL-05: rejeita acesso a entregável marcado como revogado (410 Gone)", () => {
  const res = validateObjectAccess({ isRevoked: true });

  assert.equal(res.accessible, false);
  assert.equal(res.status, 410);
  assert.equal(res.code, "OBJECT_REVOKED");
  assert.match(res.error, /Este entregável foi revogado/);
});

test("TC-UPL-06: rejeita submissão com hash SHA-256 divergente (422 Unprocessable Entity)", () => {
  const res = validateFileIntegrity({
    declaredHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    actualHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  });

  assert.equal(res.valid, false);
  assert.equal(res.status, 422);
  assert.equal(res.code, "CHECKSUM_MISMATCH");
  assert.match(res.error, /Falha de integridade: o hash SHA-256 calculado/);
});

test("TC-UPL-07: rejeita upload de usuário que não pertence à equipe (403 Forbidden)", () => {
  const res = validateUploadRequest({
    filename: "entregavel_equipe.pdf",
    mimeType: "application/pdf",
    sizeBytes: 5 * 1024 * 1024,
    userId: "USR-ALUNO-INTRUSO",
    teamMembers: ["USR-ALUNO-01", "USR-ALUNO-02"],
  });

  assert.equal(res.allowed, false);
  assert.equal(res.status, 403);
  assert.equal(res.code, "FORBIDDEN_TEAM_ACCESS");
  assert.match(res.error, /Usuário não pertence à equipe/);
});

