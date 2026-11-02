import assert from "node:assert/strict";
import test from "node:test";

/**
 * Categorias públicas padronizadas de revogação (SPEC-EXT-003 / Minimização LGPD).
 */
export const MINIMIZED_REVOCATION_REASONS = new Set([
  "Revogado por decisão administrativa",
  "Revogado por emissão de nova via",
  "Revogado por cancelamento de atividade",
]);

/**
 * Emissão controlada de certificado (SPEC-EXT-003 / BE-017).
 */
export function issueCertificate({ issuerRole, studentId, activityId, completedHours, requiredHours }) {
  const authorizedRoles = ["COORDENACAO", "GESTOR_EXTENSAO", "SISTEMA_BATCH"];
  if (!authorizedRoles.includes(issuerRole)) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN_ISSUANCE",
      error: "Usuário não possui permissão para emitir certificados de extensão.",
    };
  }

  if (completedHours < requiredHours) {
    return {
      success: false,
      status: 422,
      code: "HOURS_INSUFFICIENT",
      error: `Aluno não completou a carga horária mínima necessária (${completedHours}h < ${requiredHours}h).`,
    };
  }

  const code = `CERT-EXT-${Date.now()}-${studentId.slice(-4)}`;
  const hash = `hash_sha256_${code}_${activityId}`;

  return {
    success: true,
    status: 201,
    certificate: {
      codigo: code,
      alunoId: studentId,
      atividadeId: activityId,
      cargaHoraria: completedHours,
      hashOficial: hash,
      status: "EMITIDO",
      isRevoked: false,
      qrCodeUrl: `https://validar.unisenai.edu.br/certificados/${code}`,
    },
  };
}

/**
 * Consulta pública de autenticidade por Código / QR Code / Hash (SPEC-EXT-003).
 */
export function validateCertificatePublic({ code, providedHash, certificateStore }) {
  const cert = certificateStore.find((c) => c.codigo === code);

  // 1. Código inexistente
  if (!cert) {
    return {
      success: false,
      status: 404,
      code: "CERTIFICATE_NOT_FOUND",
      error: "Certificado não encontrado no registro oficial.",
    };
  }

  // 2. Certificado Revogado (Minimização de Dados)
  if (cert.isRevoked) {
    return {
      success: false,
      status: 410,
      code: "CERTIFICATE_REVOKED",
      statusDocumento: "REVOGADO",
      motivoPublico: cert.minimizedReason,
      dataRevogacao: cert.revokedAt,
      // Garante explicitamente que motivos internos sigilosos não vazem na resposta
    };
  }

  // 3. Certificado Adulterado (Hash Divergente)
  if (providedHash && providedHash !== cert.hashOficial) {
    return {
      success: false,
      status: 422,
      code: "CERTIFICATE_TAMPERED",
      statusDocumento: "ADULTERADO",
      error: "Falha de integridade: o hash do documento difere do hash oficial registrado no momento da emissão.",
    };
  }

  // 4. Certificado Autêntico e Válido
  return {
    success: true,
    status: 200,
    statusDocumento: "AUTENTICO",
    codigo: cert.codigo,
    aluno: cert.alunoId,
    atividade: cert.atividadeId,
    cargaHoraria: cert.cargaHoraria,
    qrCodeUrl: cert.qrCodeUrl,
  };
}

/**
 * Revogação administrativa com motivo minimizado (SPEC-EXT-003).
 */
export function revokeCertificate({ cert, adminRole, publicReasonCategory, internalConfidentialNotes }) {
  if (adminRole !== "COORDENACAO" && adminRole !== "GESTOR_EXTENSAO") {
    return { success: false, status: 403, error: "Apenas a coordenação pode revogar certificados." };
  }

  if (!MINIMIZED_REVOCATION_REASONS.has(publicReasonCategory)) {
    return { success: false, status: 400, error: "Categoria pública de revogação inválida ou não padronizada." };
  }

  cert.isRevoked = true;
  cert.minimizedReason = publicReasonCategory;
  cert.internalNotes = internalConfidentialNotes; // Fica restrito ao banco interno
  cert.revokedAt = new Date().toISOString();

  return { success: true, status: 200, cert };
}

// =========================================================================
// SUÍTE DE TESTES: QA-017 (SPEC-EXT-003)
// =========================================================================

test("TC-CERT-01: emissão autorizada gera certificado válido com código e QR code", () => {
  const result = issueCertificate({
    issuerRole: "COORDENACAO",
    studentId: "USR-ALUNO-01",
    activityId: "ACT-EXT-01",
    completedHours: 40,
    requiredHours: 40,
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 201);
  assert.ok(result.certificate.codigo.startsWith("CERT-EXT-"));
  assert.equal(result.certificate.status, "EMITIDO");
  assert.ok(result.certificate.qrCodeUrl.includes("validar.unisenai.edu.br"));
});

test("TC-CERT-02: validação pública por Hash/QR confirma autenticidade do documento", () => {
  const cert = {
    codigo: "CERT-EXT-9901",
    alunoId: "Aluno Sintético UniSENAI",
    atividadeId: "Robótica Sustentável",
    cargaHoraria: 40,
    hashOficial: "hash_valido_sha256_oficial_123456",
    isRevoked: false,
    qrCodeUrl: "https://validar.unisenai.edu.br/certificados/CERT-EXT-9901",
  };

  const validation = validateCertificatePublic({
    code: "CERT-EXT-9901",
    providedHash: "hash_valido_sha256_oficial_123456",
    certificateStore: [cert],
  });

  assert.equal(validation.success, true);
  assert.equal(validation.status, 200);
  assert.equal(validation.statusDocumento, "AUTENTICO");
  assert.equal(validation.codigo, "CERT-EXT-9901");
});

test("TC-CERT-03: detecta e rejeita certificado adulterado (422 Unprocessable Entity)", () => {
  const cert = {
    codigo: "CERT-EXT-9901",
    hashOficial: "hash_original_intacto",
    isRevoked: false,
  };

  const validation = validateCertificatePublic({
    code: "CERT-EXT-9901",
    providedHash: "hash_modificado_por_adulteracao", // Checksum mismatch
    certificateStore: [cert],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.status, 422);
  assert.equal(validation.code, "CERTIFICATE_TAMPERED");
  assert.equal(validation.statusDocumento, "ADULTERADO");
  assert.match(validation.error, /Falha de integridade: o hash do documento difere/);
});

test("TC-CERT-04: consulta pública de código inválido retorna 404 Not Found", () => {
  const validation = validateCertificatePublic({
    code: "CERT-INEXISTENTE-9999",
    providedHash: "hash_qualquer",
    certificateStore: [],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.status, 404);
  assert.equal(validation.code, "CERTIFICATE_NOT_FOUND");
  assert.match(validation.error, /Certificado não encontrado/);
});

test("TC-CERT-05: revogação expõe apenas motivo público minimizado e oculta dados confidenciais (LGPD)", () => {
  const cert = {
    codigo: "CERT-EXT-9902",
    alunoId: "Aluno Teste Privado",
    hashOficial: "hash_cert_9902",
    isRevoked: false,
  };

  // Coordenação realiza revogação com motivo público padronizado e nota interna confidencial
  revokeCertificate({
    cert,
    adminRole: "COORDENACAO",
    publicReasonCategory: "Revogado por decisão administrativa",
    internalConfidentialNotes: "Aluno solicitou trancamento retroativo por laudo médico sigiloso",
  });

  // Consulta pública externa ao certificado revogado
  const validation = validateCertificatePublic({
    code: "CERT-EXT-9902",
    providedHash: "hash_cert_9902",
    certificateStore: [cert],
  });

  assert.equal(validation.success, false);
  assert.equal(validation.status, 410);
  assert.equal(validation.statusDocumento, "REVOGADO");
  assert.equal(validation.motivoPublico, "Revogado por decisão administrativa");

  // TESTE DE SEGURANÇA E PRIVACIDADE LGPD:
  // Garante que o laudo/nota interna sigilosa JAMAIS seja retornada na API pública!
  assert.equal(validation.internalNotes, undefined);
  assert.ok(!JSON.stringify(validation).includes("laudo"));
  assert.ok(!JSON.stringify(validation).includes("trancamento"));
});

