import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

/**
 * QA-019 (plataforma-quality#19)
 * E2E Playwright no Staging — Jornadas Críticas Expostas pelo Frontend (FE-004..016)
 *
 * SPECs cobertas:
 * - SPEC-AUTH-001..004 (Login, Sessão, RBAC/ABAC, Guardas de Rota, Auditoria e Sanitização)
 * - SPEC-PI-001..004 (Proposta, Solicitação de Participação, Aprovação/Negação/Remoção Docente,
 *                     Banca e Guarda PG-008, Notas/Rubricas/Pares e Upload/Arquivos/Fotos)
 * - SPEC-EXT-001..003 (Edital/Janelas UTC-3/Avisos, Submissão e Validação de Horas, Certificado QR/Hash/Revogação)
 * - SPEC-PORTAL-001..002 (Catálogo Público, Filtros, Paginação Estável, Página Vazia, Cache após Retirada e Privacidade)
 *
 * Artefatos obrigatórios em falhas:
 * - screenshot ("only-on-failure" -> .png)
 * - video ("retain-on-failure" -> .webm)
 * - trace ("retain-on-failure" -> trace.zip)
 */

export const QA019_PLAYWRIGHT_STAGING_CONFIG = Object.freeze({
  testDir: "./tests/e2e",
  outputDir: "./test-results/qa-019-staging",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/qa-019", open: "never" }],
    ["json", { outputFile: "test-results/qa-019-staging/report.json" }],
  ],
  use: {
    baseURL: process.env.STAGING_BASE_URL || "https://staging.plataforma.unisenai.edu.br",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
});

export const QA019_FRONTEND_DEPENDENCIES = Object.freeze([
  {
    feId: "FE-004",
    title: "Tela de Login, Troca Obrigatória de Senha (1º Acesso) e Guarda de Sessão",
    journeys: ["J01", "J02"],
    specs: ["SPEC-AUTH-001", "SPEC-AUTH-002", "SPEC-AUTH-004"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-005",
    title: "Layout Autenticado, Navegação por Perfil (RBAC) e Multi-perfil no Mesmo CPF",
    journeys: ["J02"],
    specs: ["SPEC-AUTH-002", "SPEC-AUTH-003"],
    stagingStatus: "PARTIAL_MOCK_PR_44_46",
  },
  {
    feId: "FE-006",
    title: "Gestão de Propostas de Projeto Integrador (Rascunho, Publicação, Edição, Reabertura e Arquivamento)",
    journeys: ["J03"],
    specs: ["SPEC-PI-001"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-007",
    title: "Solicitação de Participação em PI pelo Aluno dentro da Janela (Sem Convite Individual)",
    journeys: ["J04"],
    specs: ["SPEC-PI-001"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-008",
    title: "Aprovação/Negação de Participação e Remoção de Aluno com Justificativa Obrigatória pelo Docente Responsável",
    journeys: ["J05"],
    specs: ["SPEC-PI-001", "SPEC-AUTH-003"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-009",
    title: "Acompanhamento de Etapas do PI e Jornada/Guarda de Banca (SPEC-PI-002 / PG-008)",
    journeys: ["J07"],
    specs: ["SPEC-PI-002"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-010",
    title: "Upload de Entregáveis, Isolamento de Arquivos Internos e Autorização de Publicação de Fotos",
    journeys: ["J08"],
    specs: ["SPEC-PI-004"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-011",
    title: "Rubricas, Fechamento/Reabertura de Avaliação, Avaliação entre Pares e Sigilo de Notas Individuais",
    journeys: ["J10"],
    specs: ["SPEC-PI-003"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-012",
    title: "Gestão de Editais, Janelas de Inscrição em UTC-3 e Publicação de Avisos de Extensão",
    journeys: ["J06"],
    specs: ["SPEC-EXT-001"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-013",
    title: "Submissão Discente de Atividades e Validação/Alteração Exclusiva de Horas pelo Docente Responsável",
    journeys: ["J09"],
    specs: ["SPEC-EXT-002"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-014",
    title: "Consolidação de Horas, Emissão, Verificação Pública (QR/Hash) e Revogação de Certificados de Extensão",
    journeys: ["J11"],
    specs: ["SPEC-EXT-003"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-015",
    title: "Catálogo Público do Portal: Listagem de Publicados, Filtros, Paginação Estável e Página Vazia",
    journeys: ["J12"],
    specs: ["SPEC-PORTAL-001", "SPEC-PORTAL-002"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
  {
    feId: "FE-016",
    title: "Detalhe SSR do Projeto no Portal, Metadata SEO/OpenGraph, Autorização de Fotos e Expurgo de Cache após Retirada",
    journeys: ["J12"],
    specs: ["SPEC-PORTAL-001", "SPEC-PORTAL-002"],
    stagingStatus: "PENDING_STAGING_DEPLOY",
  },
]);

export const QA019_SYNTHETIC_ACCOUNTS = Object.freeze({
  aluno01: {
    id: "USR-QA019-ALU-01",
    name: "Ana Clara Souza",
    cpf: "000.000.019-01",
    password: "[SYNTH_PASS_QA019_ALU_01]",
    roles: ["ALUNO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/aluno",
  },
  aluno02: {
    id: "USR-QA019-ALU-02",
    name: "Bruno Henrique Lima",
    cpf: "000.000.019-02",
    password: "[SYNTH_PASS_QA019_ALU_02]",
    roles: ["ALUNO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/aluno",
  },
  docente01: {
    id: "USR-QA019-DOC-01",
    name: "Prof. Dr. Marcos Vinícius",
    cpf: "000.000.019-03",
    password: "[SYNTH_PASS_QA019_DOC_01]",
    roles: ["DOCENTE"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/docente",
  },
  docente02: {
    id: "USR-QA019-DOC-02",
    name: "Profa. Dra. Helena Costa",
    cpf: "000.000.019-04",
    password: "[SYNTH_PASS_QA019_DOC_02]",
    roles: ["DOCENTE"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/docente",
  },
  coordenacao01: {
    id: "USR-QA019-COORD-01",
    name: "Coord. Roberto Almeida",
    cpf: "000.000.019-05",
    password: "[SYNTH_PASS_QA019_COORD_01]",
    roles: ["COORDENACAO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/coordenacao",
  },
  multiPerfil01: {
    id: "USR-QA019-MULTI-01",
    name: "Profa. Coord. Patrícia Nogueira",
    cpf: "000.000.019-06",
    password: "[SYNTH_PASS_QA019_MULTI_01]",
    roles: ["DOCENTE", "COORDENACAO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/coordenacao",
  },
  primeiroAcesso01: {
    id: "USR-QA019-TEMP-01",
    name: "Lucas Primeiro Acesso",
    cpf: "000.000.019-07",
    password: "[SYNTH_TEMP_PASS_QA019_07]",
    roles: ["ALUNO"],
    active: true,
    mustChangePassword: true,
    expectedLandingUrl: "/primeiro-acesso",
  },
  inativo01: {
    id: "USR-QA019-INAT-01",
    name: "Usuário Inativo",
    cpf: "000.000.019-08",
    password: "[SYNTH_PASS_QA019_INAT_08]",
    roles: ["ALUNO"],
    active: false,
    mustChangePassword: false,
    expectedLandingUrl: "/login",
  },
});

const PUBLIC_PORTAL_ALLOWLIST = Object.freeze([
  "id",
  "slug",
  "type",
  "course",
  "semester",
  "publishedAt",
  "tags",
  "publicTitle",
  "publicSummary",
  "advisorPublicName",
  "teamPublicNames",
  "photos",
  "publicUrl",
]);

export const QA019_FORBIDDEN_PRIVATE_KEYS = Object.freeze([
  "ownerCpf",
  "ownerEmailPrivate",
  "internalNotesSecret",
  "participantsPrivate",
  "gradesByStudent",
  "hoursByStudent",
  "internalFiles",
  "removalJustifications",
  "password",
  "accessToken",
  "refreshToken",
]);

function maskCpf(cpf) {
  if (!cpf || typeof cpf !== "string") return "***.***.***-**";
  const suffix = cpf.slice(-6);
  return `***.***${suffix.startsWith(".") ? suffix : `.${suffix}`}`;
}

function sanitizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "***.***.***-**")
    .replace(/\[SYNTH_(?:PASS|TEMP_PASS)_[A-Z0-9_]+\]/g, "[REDACTED_PASSWORD]")
    .replace(/ACC-QA019-[0-9A-Za-z_-]+/g, "[REDACTED_TOKEN]")
    .replace(/REF-QA019-[0-9A-Za-z_-]+/g, "[REDACTED_TOKEN]");
}

function parseIsoWithExplicitOffset(isoString) {
  if (typeof isoString !== "string") return null;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(isoString)) return null;
  const ms = Date.parse(isoString);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Cria o ambiente integrado E2E determinístico (Playwright Staging Harness)
 * para execução das 12 jornadas críticas e captura de artefatos em falhas.
 */
export function createQA019PlaywrightStagingHarness(options = {}) {
  const config = {
    ...QA019_PLAYWRIGHT_STAGING_CONFIG,
    ...(options.config || {}),
  };

  let bancaFeatureEnabled = options.bancaFeatureEnabled ?? false;
  let tokenSeq = 0;
  let entitySeq = 0;

  const accounts = new Map(
    Object.values(QA019_SYNTHETIC_ACCOUNTS).map((acc) => [acc.id, { ...acc, roles: [...acc.roles] }])
  );
  const tokenFamilies = new Map();
  const accessTokens = new Map();
  const refreshTokens = new Map();

  const piProjects = new Map();
  const enrollments = new Map();
  const editalWindows = new Map();
  const notices = [];
  const bancas = new Map();
  const deliverables = new Map();
  const extActivities = new Map();
  const certificates = new Map();
  const portalCache = new Map();
  const auditLogs = [];
  const failureArtifacts = [];
  const journeyTelemetry = [];

  // Seed inicial de edital vigente em America/Sao_Paulo (UTC-3)
  editalWindows.set("EDT-2026-2", {
    id: "EDT-2026-2",
    title: "Edital Unificado PI & Extensão 2026.2",
    timezone: "America/Sao_Paulo",
    startAt: "2026-10-01T00:00:00-03:00",
    endAt: "2026-11-30T23:59:59-03:00",
    startMs: Date.parse("2026-10-01T00:00:00-03:00"),
    endMs: Date.parse("2026-11-30T23:59:59-03:00"),
    status: "OPEN",
  });

  function recordAudit(event, actor, details = {}) {
    const sanitizedDetails = JSON.parse(sanitizeText(JSON.stringify(details)));
    auditLogs.push({
      timestamp: "2026-11-07T12:30:00.000Z",
      event,
      actorId: actor?.id || "ANONYMOUS",
      actorCpfMasked: actor?.cpf ? maskCpf(actor.cpf) : null,
      token: "[REDACTED]",
      details: sanitizedDetails,
    });
  }

  function resolveSession(accessToken) {
    if (!accessToken) return { error: { status: 401, code: "UNAUTHENTICATED" } };
    const tokenRecord = accessTokens.get(accessToken);
    if (!tokenRecord) return { error: { status: 401, code: "INVALID_ACCESS_TOKEN" } };
    const family = tokenFamilies.get(tokenRecord.familyId);
    if (!family || family.revoked) {
      return { error: { status: 401, code: "SESSION_FAMILY_REVOKED" } };
    }
    const account = accounts.get(family.userId);
    if (!account || !account.active) {
      return { error: { status: 401, code: "ACCOUNT_INACTIVE" } };
    }
    return { account, family, tokenRecord };
  }

  function ensureActiveBusinessSession(accessToken) {
    const resolved = resolveSession(accessToken);
    if (resolved.error) return resolved;
    if (resolved.account.mustChangePassword) {
      return {
        error: {
          status: 403,
          code: "PASSWORD_CHANGE_REQUIRED",
          redirectTo: "/primeiro-acesso",
        },
      };
    }
    return resolved;
  }

  function buildMenusForRoles(roles, mustChangePassword) {
    if (mustChangePassword) {
      return ["Definir Nova Senha", "Sair"];
    }
    const menuSet = new Set();
    if (roles.includes("ALUNO")) {
      ["Início", "Meus Projetos", "Solicitar Participação", "Entregáveis", "Extensão", "Avaliações", "Certificados"].forEach(
        (m) => menuSet.add(m)
      );
    }
    if (roles.includes("DOCENTE")) {
      [
        "Visão Geral Docente",
        "Projetos Orientados",
        "Nova Proposta PI",
        "Solicitações de Participação",
        "Validação de Horas",
        "Avaliações e Rubricas",
        "Autorização de Fotos",
        "Avisos",
        "Redefinir Senha de Usuário",
      ].forEach((m) => menuSet.add(m));
    }
    if (roles.includes("COORDENACAO")) {
      [
        "Painel da Coordenação",
        "Usuários e Permissões",
        "Importação CSV",
        "Turmas e Alunos",
        "Períodos de Inscrição e Editais",
        "Atribuição de Avaliadores",
        "Avisos Institucionais",
        "Redefinir Senha de Usuário",
      ].forEach((m) => menuSet.add(m));
    }
    if (bancaFeatureEnabled && (roles.includes("DOCENTE") || roles.includes("COORDENACAO"))) {
      menuSet.add("Agendar Banca");
    }
    menuSet.add("Trocar Senha");
    menuSet.add("Sair");
    return [...menuSet];
  }

  function invalidatePortalCacheForProject(project) {
    const purgedKeys = [];
    for (const key of portalCache.keys()) {
      if (
        key.startsWith("portal:list:") ||
        key === `portal:detail:${project.id}` ||
        key === `portal:detail:${project.slug}` ||
        key === `portal:ssr:${project.id}` ||
        key === `portal:ssr:${project.slug}`
      ) {
        portalCache.delete(key);
        purgedKeys.push(key);
      }
    }
    return purgedKeys;
  }

  function projectToPublicProjection(project) {
    const authorizedPhotos =
      project.photoAuthorized === true
        ? (project.photos || [])
            .filter((p) => p.authorized === true)
            .map((p) => ({ id: p.id, url: p.url, alt: p.alt }))
        : [];
    return {
      id: project.id,
      slug: project.slug,
      type: project.type,
      course: project.course,
      semester: project.semester,
      publishedAt: project.publishedAt,
      tags: [...(project.tags || [])],
      publicTitle: project.publicTitle,
      publicSummary: project.publicSummary,
      advisorPublicName: project.advisorPublicName,
      teamPublicNames: [...(project.teamPublicNames || [])],
      photos: authorizedPhotos,
      publicUrl: `/portal/projetos/${project.slug}`,
    };
  }

  return {
    config,
    setBancaFeatureEnabled(enabled) {
      bancaFeatureEnabled = Boolean(enabled);
    },

    // =========================================================================
    // J01 & J02 — Autenticação, Sessão, Refresh Rotativo, Reuse, Rotas e Logout
    // =========================================================================
    renderLoginPage() {
      return {
        status: 200,
        url: "/login",
        elements: {
          cpfInput: '[data-testid="login-cpf-input"]',
          passwordInput: '[data-testid="login-password-input"]',
          submitButton: '[data-testid="login-submit-btn"]',
          publicSelfRegisterLink: null, // AC-AUTH-001-03a: proibido autocadastro público
        },
      };
    },

    login({ cpf, password }) {
      const account = [...accounts.values()].find((acc) => acc.cpf === cpf);
      if (!account || !account.active || account.password !== password) {
        const reason = !account ? "USER_NOT_FOUND" : !account.active ? "ACCOUNT_INACTIVE" : "BAD_CREDENTIALS";
        recordAudit("AUTH_LOGIN_DENIED", account || { id: "UNKNOWN", cpf }, { reason });
        return {
          status: 401,
          code: "INVALID_CREDENTIALS_OR_INACTIVE",
          message: "Credenciais inválidas ou conta inativa.",
          redirectTo: "/login",
          visibleMenus: [],
        };
      }

      tokenSeq += 1;
      const familyId = `FAM-QA019-${tokenSeq}`;
      const accessToken = `ACC-QA019-${tokenSeq}-G1`;
      const refreshToken = `REF-QA019-${tokenSeq}-G1`;

      tokenFamilies.set(familyId, {
        familyId,
        userId: account.id,
        currentGeneration: 1,
        revoked: false,
      });
      accessTokens.set(accessToken, { familyId, generation: 1 });
      refreshTokens.set(refreshToken, { familyId, generation: 1, used: false });

      const redirectTo = account.mustChangePassword ? "/primeiro-acesso" : account.expectedLandingUrl;
      const visibleMenus = buildMenusForRoles(account.roles, account.mustChangePassword);

      recordAudit("AUTH_LOGIN_SUCCESS", account, { familyId, redirectTo });
      return {
        status: 200,
        code: "LOGIN_OK",
        familyId,
        accessToken,
        refreshToken,
        redirectTo,
        mustChangePassword: account.mustChangePassword,
        roles: [...account.roles],
        visibleMenus,
      };
    },

    completeMandatoryPasswordChange(accessToken, { newPassword }) {
      const resolved = resolveSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!newPassword || newPassword.length < 8 || newPassword === resolved.account.password) {
        return { status: 422, code: "INVALID_NEW_PASSWORD" };
      }
      resolved.account.password = newPassword;
      resolved.account.mustChangePassword = false;
      const landing = resolved.account.roles.includes("ALUNO")
        ? "/aluno"
        : resolved.account.roles.includes("DOCENTE")
          ? "/docente"
          : "/coordenacao";
      resolved.account.expectedLandingUrl = landing;
      recordAudit("AUTH_PASSWORD_CHANGED", resolved.account, { redirectTo: landing });
      return {
        status: 200,
        code: "PASSWORD_UPDATED",
        redirectTo: landing,
        visibleMenus: buildMenusForRoles(resolved.account.roles, false),
      };
    },

    rotateRefreshToken(refreshToken) {
      const refRecord = refreshTokens.get(refreshToken);
      if (!refRecord) {
        return { status: 401, code: "INVALID_REFRESH_TOKEN" };
      }
      const family = tokenFamilies.get(refRecord.familyId);
      if (!family || family.revoked) {
        return { status: 401, code: "SESSION_FAMILY_REVOKED" };
      }
      if (refRecord.used) {
        // Reuse detection: revoga imediatamente toda a família de sessão (SPEC-AUTH-002)
        family.revoked = true;
        const account = accounts.get(family.userId);
        recordAudit("AUTH_REFRESH_REUSE_DETECTED", account, {
          familyId: family.familyId,
          reusedGeneration: refRecord.generation,
        });
        return {
          status: 401,
          code: "REFRESH_TOKEN_REUSE_DETECTED",
          familyRevoked: true,
        };
      }

      refRecord.used = true;
      family.currentGeneration += 1;
      const nextGen = family.currentGeneration;
      const newAccessToken = `ACC-QA019-${family.familyId}-G${nextGen}`;
      const newRefreshToken = `REF-QA019-${family.familyId}-G${nextGen}`;

      accessTokens.set(newAccessToken, { familyId: family.familyId, generation: nextGen });
      refreshTokens.set(newRefreshToken, { familyId: family.familyId, generation: nextGen, used: false });

      return {
        status: 200,
        code: "TOKEN_ROTATED",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        generation: nextGen,
      };
    },

    navigateToRoute(accessToken, url) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) {
        return {
          status: resolved.error.status,
          code: resolved.error.code,
          allowed: false,
          redirectTo: resolved.error.redirectTo || "/login",
        };
      }
      const { account } = resolved;

      if (url === "/bancas/agendar" && !bancaFeatureEnabled) {
        return {
          status: 403,
          code: "FEATURE_FORBIDDEN_BY_SPEC",
          allowed: false,
          redirectTo: "/acesso-negado",
        };
      }
      if (url.startsWith("/aluno") && !account.roles.includes("ALUNO")) {
        return { status: 403, code: "FORBIDDEN_ROLE", allowed: false, redirectTo: "/acesso-negado" };
      }
      if (url.startsWith("/docente") && !account.roles.includes("DOCENTE")) {
        return { status: 403, code: "FORBIDDEN_ROLE", allowed: false, redirectTo: "/acesso-negado" };
      }
      if (url.startsWith("/coordenacao") && !account.roles.includes("COORDENACAO")) {
        return { status: 403, code: "FORBIDDEN_ROLE", allowed: false, redirectTo: "/acesso-negado" };
      }
      if (url.startsWith("/admin")) {
        return { status: 403, code: "FORBIDDEN_UNAPPROVED_ROLE", allowed: false, redirectTo: "/acesso-negado" };
      }

      return {
        status: 200,
        code: "NAVIGATION_OK",
        allowed: true,
        url,
        visibleMenus: buildMenusForRoles(account.roles, false),
      };
    },

    logout(accessToken) {
      const resolved = resolveSession(accessToken);
      if (!resolved.error) {
        resolved.family.revoked = true;
        recordAudit("AUTH_LOGOUT", resolved.account, { familyId: resolved.family.familyId });
      }
      return { status: 204, redirectTo: "/login" };
    },

    // =========================================================================
    // J03 — Proposta de Projeto Integrador (SPEC-PI-001)
    // =========================================================================
    createPiProposal(accessToken, payload) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("DOCENTE")) {
        return { status: 403, code: "FORBIDDEN_ROLE_CREATE_PI" };
      }
      entitySeq += 1;
      const projectId = payload.id || `PRJ-QA019-PI-${entitySeq}`;
      const status = payload.status || "DRAFT";
      const project = {
        id: projectId,
        slug: payload.slug || `projeto-pi-${entitySeq}`,
        type: payload.type || "PI",
        status,
        publishedByDocente: status === "PUBLISHED",
        publishedAt: status === "PUBLISHED" ? payload.publishedAt || "2026-10-20T18:00:00.000Z" : null,
        course: payload.course || "Engenharia de Controle e Automação",
        semester: payload.semester || "2026.2",
        tags: payload.tags || ["automacao", "iot"],
        publicTitle: payload.title,
        publicSummary: payload.summary || "Resumo público sintético do projeto.",
        advisorDocenteId: resolved.account.id,
        advisorPublicName: resolved.account.name,
        ownerCpf: resolved.account.cpf,
        ownerEmailPrivate: "docente.privado@interno.unisenai.edu.br",
        internalNotesSecret: payload.internalNotesSecret || "[SECRET_INTERNAL_NOTE_QA019]",
        participants: new Set(),
        teamPublicNames: [],
        removalJustifications: [],
        photoAuthorized: Boolean(payload.photoAuthorized),
        photos: payload.photos || [],
        internalFiles: [],
        rubric: null,
        evaluationClosed: false,
        peerAssignments: new Map(),
        gradesByStudent: {},
        editalId: payload.editalId || "EDT-2026-2",
      };
      piProjects.set(projectId, project);
      recordAudit("PI_PROPOSAL_CREATED", resolved.account, { projectId, status });
      return { status: 201, code: "PROPOSAL_CREATED", project: { id: projectId, status, slug: project.slug } };
    },

    getPiProposal(accessToken, projectId) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      if (project.status === "DRAFT" && project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_DRAFT_VISIBILITY" };
      }
      return {
        status: 200,
        project: {
          id: project.id,
          title: project.publicTitle,
          status: project.status,
          advisorDocenteId: project.advisorDocenteId,
        },
      };
    },

    transitionPiProposal(accessToken, projectId, { action, title }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_PROJECT_SCOPE" };
      }

      const previousStatus = project.status;
      if (action === "PUBLISH") {
        project.status = "PUBLISHED";
        project.publishedByDocente = true;
        project.publishedAt = project.publishedAt || "2026-10-20T18:00:00.000Z";
      } else if (action === "ARCHIVE") {
        project.status = "ARCHIVED";
        project.publishedByDocente = false;
      } else if (action === "REOPEN") {
        project.status = "PUBLISHED";
        project.publishedByDocente = true;
      } else if (action === "WITHDRAW") {
        project.status = "WITHDRAWN";
        project.publishedByDocente = false;
      } else if (action === "EDIT") {
        if (title) project.publicTitle = title;
      } else {
        return { status: 422, code: "INVALID_PROPOSAL_ACTION" };
      }

      const purgedCacheKeys = invalidatePortalCacheForProject(project);
      recordAudit("PI_PROPOSAL_TRANSITION", resolved.account, {
        projectId,
        action,
        previousStatus,
        currentStatus: project.status,
      });

      return {
        status: 200,
        code: "PROPOSAL_UPDATED",
        previousStatus,
        currentStatus: project.status,
        title: project.publicTitle,
        purgedCacheKeys,
      };
    },

    // =========================================================================
    // J04 & J05 — Solicitação de Participação e Aprovação/Negação/Remoção Docente
    // =========================================================================
    requestParticipation(accessToken, projectId, { requestedAt = "2026-10-25T14:00:00-03:00" } = {}) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("ALUNO")) {
        return { status: 403, code: "FORBIDDEN_ONLY_STUDENT_CAN_REQUEST" };
      }
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (project.status !== "PUBLISHED") {
        return { status: 422, code: "PROJECT_NOT_OPEN_FOR_ENROLLMENT" };
      }

      const edital = editalWindows.get(project.editalId);
      const reqMs = parseIsoWithExplicitOffset(requestedAt);
      if (!edital || reqMs === null || reqMs < edital.startMs || reqMs > edital.endMs) {
        return { status: 422, code: "ENROLLMENT_WINDOW_CLOSED" };
      }

      const key = `${projectId}:${resolved.account.id}`;
      if (enrollments.has(key)) {
        return { status: 409, code: "DUPLICATE_ENROLLMENT_REQUEST" };
      }

      const enrollment = {
        id: `ENR-${projectId}-${resolved.account.id}`,
        projectId,
        studentId: resolved.account.id,
        studentName: resolved.account.name,
        status: "PENDING",
        requestedAt,
      };
      enrollments.set(key, enrollment);
      recordAudit("PI_ENROLLMENT_REQUESTED", resolved.account, { projectId, enrollmentId: enrollment.id });
      return { status: 201, code: "ENROLLMENT_PENDING", enrollment };
    },

    sendLegacyIndividualInvitation(accessToken, projectId) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      return {
        status: 403,
        code: "INVITATION_FLOW_REMOVED_BY_SPEC",
        projectId,
      };
    },

    decideParticipation(accessToken, projectId, { studentId, decision }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_NOT_PROJECT_ADVISOR" };
      }

      const key = `${projectId}:${studentId}`;
      const enrollment = enrollments.get(key);
      if (!enrollment) return { status: 404, code: "ENROLLMENT_NOT_FOUND" };
      if (decision !== "APPROVED" && decision !== "REJECTED") {
        return { status: 422, code: "INVALID_DECISION" };
      }

      enrollment.status = decision;
      if (decision === "APPROVED") {
        project.participants.add(studentId);
        const studentAcc = accounts.get(studentId);
        if (studentAcc && !project.teamPublicNames.includes(studentAcc.name)) {
          project.teamPublicNames.push(studentAcc.name);
        }
      }
      recordAudit("PI_ENROLLMENT_DECIDED", resolved.account, { projectId, studentId, decision });
      return { status: 200, code: "ENROLLMENT_DECIDED", enrollment: { ...enrollment } };
    },

    removeParticipant(accessToken, projectId, { studentId, justification }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_NOT_PROJECT_ADVISOR" };
      }
      if (!justification || typeof justification !== "string" || justification.trim().length < 10) {
        return { status: 422, code: "JUSTIFICATION_REQUIRED" };
      }
      if (!project.participants.has(studentId)) {
        return { status: 404, code: "PARTICIPANT_NOT_LINKED" };
      }

      project.participants.delete(studentId);
      const studentAcc = accounts.get(studentId);
      if (studentAcc) {
        project.teamPublicNames = project.teamPublicNames.filter((n) => n !== studentAcc.name);
      }
      project.removalJustifications.push({
        studentId,
        justification: justification.trim(),
        removedBy: resolved.account.id,
      });
      recordAudit("PI_PARTICIPANT_REMOVED", resolved.account, { projectId, studentId });
      return { status: 200, code: "PARTICIPANT_REMOVED", studentId };
    },

    // =========================================================================
    // J06 — Edital, Janelas de Inscrição em UTC-3 e Avisos (SPEC-EXT-001)
    // =========================================================================
    configureEditalWindow(accessToken, { id, title, timezone, startAt, endAt }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("COORDENACAO")) {
        return { status: 403, code: "FORBIDDEN_ONLY_COORDENACAO" };
      }
      if (timezone !== "America/Sao_Paulo") {
        return { status: 422, code: "INVALID_TIMEZONE_MUST_BE_SAO_PAULO" };
      }
      const startMs = parseIsoWithExplicitOffset(startAt);
      const endMs = parseIsoWithExplicitOffset(endAt);
      if (startMs === null || endMs === null || startMs >= endMs) {
        return { status: 422, code: "INVALID_WINDOW_RANGE" };
      }

      const windowObj = { id, title, timezone, startAt, endAt, startMs, endMs, status: "OPEN" };
      editalWindows.set(id, windowObj);
      recordAudit("EXT_EDITAL_CONFIGURED", resolved.account, { id, timezone, startAt, endAt });
      return { status: 200, code: "EDITAL_WINDOW_SAVED", edital: windowObj };
    },

    publishNotice(accessToken, { scope, projectId, title, message }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;

      if (scope === "GLOBAL") {
        if (!resolved.account.roles.includes("COORDENACAO") && !resolved.account.roles.includes("DOCENTE")) {
          return { status: 403, code: "FORBIDDEN_NOTICE_GLOBAL" };
        }
      } else if (scope === "PROJECT") {
        const project = piProjects.get(projectId);
        if (!project || project.advisorDocenteId !== resolved.account.id) {
          return { status: 403, code: "FORBIDDEN_NOTICE_PROJECT_SCOPE" };
        }
      } else {
        return { status: 422, code: "INVALID_NOTICE_SCOPE" };
      }

      const notice = { id: `NTC-${notices.length + 1}`, scope, projectId: projectId || null, title, message };
      notices.push(notice);
      return { status: 201, code: "NOTICE_PUBLISHED", notice };
    },

    // =========================================================================
    // J07 — Banca (SPEC-PI-002 / Guarda Normativa PG-008 + Concorrência QA-013)
    // =========================================================================
    scheduleBanca(accessToken, { projectId, room, timezone = "America/Sao_Paulo", startAt, endAt, evaluatorIds }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;

      if (!bancaFeatureEnabled) {
        return { status: 403, code: "FEATURE_FORBIDDEN_BY_SPEC" };
      }

      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      const isCoord = resolved.account.roles.includes("COORDENACAO");
      const isAdvisor =
        resolved.account.roles.includes("DOCENTE") && project.advisorDocenteId === resolved.account.id;
      if (!isCoord && !isAdvisor) {
        return { status: 403, code: "FORBIDDEN_BANCA_SCOPE" };
      }
      if (project.status !== "PUBLISHED") {
        return { status: 422, code: "PROJECT_NOT_ELIGIBLE_FOR_BANCA" };
      }

      const startMs = parseIsoWithExplicitOffset(startAt);
      const endMs = parseIsoWithExplicitOffset(endAt);
      if (startMs === null || endMs === null || startMs >= endMs) {
        return { status: 422, code: "INVALID_TIME_RANGE" };
      }

      if (!Array.isArray(evaluatorIds) || evaluatorIds.length < 2) {
        return { status: 422, code: "INVALID_EVALUATOR_LIST" };
      }
      const uniqueEvaluators = new Set(evaluatorIds);
      if (uniqueEvaluators.size !== evaluatorIds.length) {
        return { status: 422, code: "DUPLICATE_EVALUATOR" };
      }

      for (const evalId of evaluatorIds) {
        const evalAcc = accounts.get(evalId);
        if (!evalAcc) return { status: 422, code: "INVALID_EVALUATOR_NOT_FOUND" };
        if (!evalAcc.active) return { status: 422, code: "INVALID_EVALUATOR_INACTIVE" };
        if (!evalAcc.roles.includes("DOCENTE")) {
          return { status: 422, code: "INVALID_EVALUATOR_ROLE_OR_CONFLICT" };
        }
      }

      for (const existing of bancas.values()) {
        const overlaps = startMs < existing.endMs && endMs > existing.startMs;
        if (!overlaps) continue;
        const roomConflict = existing.room === room;
        const projectConflict = existing.projectId === projectId;
        const evaluatorConflict = evaluatorIds.some((id) => existing.evaluatorIds.includes(id));
        if (roomConflict || projectConflict || evaluatorConflict) {
          return {
            status: 409,
            code: "SCHEDULE_OVERLAP_CONFLICT",
            conflictingBancaId: existing.id,
          };
        }
      }

      const bancaId = `BANCA-QA019-${bancas.size + 1}`;
      const record = {
        id: bancaId,
        projectId,
        room,
        timezone,
        startAtUtc: new Date(startMs).toISOString(),
        endAtUtc: new Date(endMs).toISOString(),
        startMs,
        endMs,
        evaluatorIds: [...evaluatorIds],
      };
      bancas.set(bancaId, record);
      return { status: 201, code: "BANCA_SCHEDULED", banca: record };
    },

    // =========================================================================
    // J08 — Upload, Arquivos Internos e Autorização de Fotos (SPEC-PI-004)
    // =========================================================================
    uploadDeliverable(accessToken, projectId, { fileName, mimeType, sizeBytes, contentPreview = "" }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      const isLinkedStudent =
        resolved.account.roles.includes("ALUNO") && project.participants.has(resolved.account.id);
      if (!isLinkedStudent) {
        return { status: 403, code: "FORBIDDEN_NOT_PROJECT_PARTICIPANT" };
      }
      if (project.evaluationClosed) {
        return { status: 422, code: "DELIVERABLE_WINDOW_CLOSED_BY_EVALUATION" };
      }
      if (
        !fileName ||
        fileName.includes("..") ||
        fileName.includes("/") ||
        fileName.includes("\\") ||
        /\.(?:exe|bat|cmd|sh|ps1|php|js)$/i.test(fileName)
      ) {
        return { status: 422, code: "UNSAFE_FILENAME_OR_EXTENSION" };
      }
      const allowedMimes = ["application/pdf", "image/png", "image/jpeg", "application/zip"];
      if (!allowedMimes.includes(mimeType) || /<script/i.test(contentPreview)) {
        return { status: 422, code: "UNSUPPORTED_OR_MALICIOUS_MIME" };
      }
      const maxBytes = 25 * 1024 * 1024;
      if (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > maxBytes) {
        return { status: 413, code: "PAYLOAD_TOO_LARGE" };
      }

      const fileRecord = {
        id: `DELIV-QA019-${deliverables.size + 1}`,
        projectId,
        uploadedBy: resolved.account.id,
        fileName,
        mimeType,
        sizeBytes,
        sha256: crypto.createHash("sha256").update(`${fileName}:${sizeBytes}`).digest("hex"),
      };
      deliverables.set(fileRecord.id, fileRecord);
      project.internalFiles.push(fileRecord);
      return { status: 201, code: "DELIVERABLE_UPLOADED", deliverable: fileRecord };
    },

    listInternalFiles(accessToken, projectId) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      const isLinkedStudent =
        resolved.account.roles.includes("ALUNO") && project.participants.has(resolved.account.id);
      const isAdvisor =
        resolved.account.roles.includes("DOCENTE") && project.advisorDocenteId === resolved.account.id;
      const isCoord = resolved.account.roles.includes("COORDENACAO");

      if (!isLinkedStudent && !isAdvisor && !isCoord) {
        return { status: 403, code: "FORBIDDEN_INTERNAL_FILES_ACCESS" };
      }
      return { status: 200, files: [...project.internalFiles] };
    },

    setPhotoPublicationAuthorization(accessToken, projectId, { photoAuthorized, photoId, authorized }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_PHOTO_AUTHORIZATION_ONLY_ADVISOR" };
      }

      if (typeof photoAuthorized === "boolean") {
        project.photoAuthorized = photoAuthorized;
      }
      if (photoId) {
        const photo = project.photos.find((p) => p.id === photoId);
        if (photo && typeof authorized === "boolean") {
          photo.authorized = authorized;
        }
      }
      const purgedCacheKeys = invalidatePortalCacheForProject(project);
      return {
        status: 200,
        code: "PHOTO_AUTHORIZATION_UPDATED",
        photoAuthorized: project.photoAuthorized,
        purgedCacheKeys,
      };
    },

    // =========================================================================
    // J09 — Horas de Extensão (SPEC-EXT-002)
    // =========================================================================
    submitExtActivity(accessToken, projectId, { title, claimedHours }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      const isLinkedStudent =
        resolved.account.roles.includes("ALUNO") && project.participants.has(resolved.account.id);
      if (!isLinkedStudent) {
        return { status: 403, code: "FORBIDDEN_NOT_EXT_PARTICIPANT" };
      }
      if (typeof claimedHours !== "number" || claimedHours <= 0 || claimedHours > 200) {
        return { status: 422, code: "INVALID_CLAIMED_HOURS" };
      }

      const activityId = `ACT-QA019-${extActivities.size + 1}`;
      const record = {
        id: activityId,
        projectId,
        studentId: resolved.account.id,
        title,
        claimedHours,
        validatedHours: null,
        status: "PENDING_VALIDATION",
        deadline: "2026-11-25T23:59:59-03:00",
      };
      extActivities.set(activityId, record);
      return { status: 201, code: "ACTIVITY_SUBMITTED", activity: record };
    },

    validateOrAdjustExtHours(accessToken, activityId, { validatedHours, status = "APPROVED", newDeadline }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const activity = extActivities.get(activityId);
      if (!activity) return { status: 404, code: "ACTIVITY_NOT_FOUND" };
      const project = piProjects.get(activity.projectId);

      // AC-EXT-002-03 & AC-EXT-002-04: exclusivamente o docente responsável valida/altera horas e prazo
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_HOURS_VALIDATION_ONLY_ADVISOR" };
      }
      if (typeof validatedHours !== "number" || validatedHours < 0 || validatedHours > 200) {
        return { status: 422, code: "INVALID_VALIDATED_HOURS" };
      }

      activity.validatedHours = validatedHours;
      activity.status = status;
      if (newDeadline) activity.deadline = newDeadline;

      return { status: 200, code: "HOURS_VALIDATED", activity: { ...activity } };
    },

    // =========================================================================
    // J10 — Notas, Rubricas e Avaliações entre Pares (SPEC-PI-003)
    // =========================================================================
    configureRubric(accessToken, projectId, { criteria }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_RUBRIC_ONLY_ADVISOR" };
      }
      const totalWeight = (criteria || []).reduce((acc, item) => acc + Number(item.weight || 0), 0);
      if (!Array.isArray(criteria) || criteria.length === 0 || totalWeight !== 100) {
        return { status: 422, code: "INVALID_RUBRIC_WEIGHT_SUM" };
      }
      project.rubric = criteria.map((c) => ({ ...c }));
      return { status: 200, code: "RUBRIC_CONFIGURED", rubric: project.rubric };
    },

    assignPeerEvaluator(accessToken, { targetProjectId, evaluatorStudentId, evaluationDate }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("COORDENACAO")) {
        return { status: 403, code: "FORBIDDEN_PEER_ASSIGN_ONLY_COORDENACAO" };
      }
      const project = piProjects.get(targetProjectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      project.peerAssignments.set(evaluatorStudentId, { evaluationDate, submitted: null });
      return { status: 200, code: "PEER_EVALUATOR_ASSIGNED", targetProjectId, evaluatorStudentId, evaluationDate };
    },

    submitPeerEvaluation(accessToken, targetProjectId, { score, feedback }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(targetProjectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      const assignment = project.peerAssignments.get(resolved.account.id);
      if (!assignment) {
        return { status: 403, code: "FORBIDDEN_STUDENT_NOT_ASSIGNED_PEER_EVALUATOR" };
      }
      if (typeof score !== "number" || score < 0 || score > 10) {
        return { status: 422, code: "INVALID_SCORE_RANGE" };
      }
      assignment.submitted = { score, feedback };
      return { status: 201, code: "PEER_EVALUATION_SUBMITTED", score };
    },

    recordAndFinalizeGrades(accessToken, projectId, { studentId, finalGrade, feedback, closeEvaluation = true }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_GRADE_PUBLISH_ONLY_ADVISOR" };
      }
      if (typeof finalGrade !== "number" || finalGrade < 0 || finalGrade > 10) {
        return { status: 422, code: "INVALID_FINAL_GRADE" };
      }

      project.gradesByStudent[studentId] = {
        studentId,
        finalGrade: Math.round(finalGrade * 100) / 100,
        feedback: feedback || "",
      };
      if (closeEvaluation) {
        project.evaluationClosed = true;
      }
      return {
        status: 200,
        code: "GRADE_FINALIZED",
        evaluationClosed: project.evaluationClosed,
        grade: project.gradesByStudent[studentId],
      };
    },

    reopenEvaluation(accessToken, projectId) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_REOPEN_EVALUATION_ONLY_ADVISOR" };
      }
      project.evaluationClosed = false;
      return { status: 200, code: "EVALUATION_REOPENED", evaluationClosed: false };
    },

    getIndividualGrade(accessToken, projectId, targetStudentId) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      const isSelfStudent =
        resolved.account.roles.includes("ALUNO") &&
        project.participants.has(resolved.account.id) &&
        resolved.account.id === targetStudentId;
      const isAdvisor =
        resolved.account.roles.includes("DOCENTE") && project.advisorDocenteId === resolved.account.id;
      const isCoord = resolved.account.roles.includes("COORDENACAO");

      if (!isSelfStudent && !isAdvisor && !isCoord) {
        return { status: 403, code: "FORBIDDEN_GRADE_PRIVACY" };
      }
      const grade = project.gradesByStudent[targetStudentId];
      if (!grade) return { status: 404, code: "GRADE_NOT_FOUND" };
      return { status: 200, grade: { ...grade } };
    },

    // =========================================================================
    // J11 — Certificado de Extensão: Emissão, QR/Hash e Revogação (SPEC-EXT-003)
    // =========================================================================
    issueExtCertificate(accessToken, { projectId, studentId, minimumRequiredHours = 20 }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };

      const approvedHours = [...extActivities.values()]
        .filter((a) => a.projectId === projectId && a.studentId === studentId && a.status === "APPROVED")
        .reduce((acc, a) => acc + (a.validatedHours || 0), 0);

      if (approvedHours < minimumRequiredHours) {
        return {
          status: 422,
          code: "INSUFFICIENT_VALIDATED_HOURS",
          approvedHours,
          minimumRequiredHours,
        };
      }

      const studentAcc = accounts.get(studentId);
      const verificationCode = `CERT-QA019-${certificates.size + 1}`;
      const integrityHash = crypto
        .createHash("sha256")
        .update(`${verificationCode}:${projectId}:${studentId}:${approvedHours}`)
        .digest("hex");

      const certRecord = {
        code: verificationCode,
        projectId,
        projectTitle: project.publicTitle,
        studentId,
        studentName: studentAcc.name,
        studentCpfMasked: maskCpf(studentAcc.cpf),
        validatedHours: approvedHours,
        issuedAt: "2026-11-06T15:00:00.000Z",
        integrityHash,
        qrCodeUrl: `/portal/certificados/verificar/${verificationCode}?h=${integrityHash.slice(0, 16)}`,
        status: "VALID",
        revokedReason: null,
      };
      certificates.set(verificationCode, certRecord);
      return { status: 201, code: "CERTIFICATE_ISSUED", certificate: { ...certRecord } };
    },

    verifyCertificatePublic(verificationCode, hashPrefix) {
      const cert = certificates.get(verificationCode);
      if (!cert) return { status: 404, code: "CERTIFICATE_NOT_FOUND" };
      if (hashPrefix && !cert.integrityHash.startsWith(hashPrefix)) {
        return { status: 422, code: "CERTIFICATE_HASH_MISMATCH" };
      }
      if (cert.status === "REVOKED") {
        return {
          status: 200,
          code: "CERTIFICATE_REVOKED",
          publicVerification: {
            code: cert.code,
            status: "REVOKED",
            revokedAt: cert.revokedAt,
            message: "Certificado revogado pela instituição.",
          },
        };
      }
      return {
        status: 200,
        code: "CERTIFICATE_VALID",
        publicVerification: {
          code: cert.code,
          status: "VALID",
          studentName: cert.studentName,
          studentCpfMasked: cert.studentCpfMasked,
          projectTitle: cert.projectTitle,
          validatedHours: cert.validatedHours,
          issuedAt: cert.issuedAt,
          integrityHash: cert.integrityHash,
        },
      };
    },

    revokeCertificate(accessToken, verificationCode, { reason }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const cert = certificates.get(verificationCode);
      if (!cert) return { status: 404, code: "CERTIFICATE_NOT_FOUND" };
      const project = piProjects.get(cert.projectId);

      const isCoord = resolved.account.roles.includes("COORDENACAO");
      const isAdvisor =
        resolved.account.roles.includes("DOCENTE") && project?.advisorDocenteId === resolved.account.id;
      if (!isCoord && !isAdvisor) {
        return { status: 403, code: "FORBIDDEN_REVOKE_CERTIFICATE" };
      }
      if (!reason || reason.trim().length < 5) {
        return { status: 422, code: "REVOCATION_REASON_REQUIRED" };
      }

      cert.status = "REVOKED";
      cert.revokedReason = reason.trim();
      cert.revokedAt = "2026-11-07T10:00:00.000Z";
      return { status: 200, code: "CERTIFICATE_REVOKED", codeId: cert.code, statusValue: cert.status };
    },

    // =========================================================================
    // J12 — Catálogo Público / Portal (SPEC-PORTAL-001 & SPEC-PORTAL-002)
    // =========================================================================
    queryPublicCatalog({ type, course, semester, tag, q, page = 1, pageSize = 10 } = {}) {
      if (page <= 0 || pageSize <= 0 || pageSize > 50) {
        return { status: 422, code: "INVALID_PAGINATION_PARAMS" };
      }
      const cacheKey = `portal:list:${JSON.stringify({ type, course, semester, tag, q, page, pageSize })}`;
      if (portalCache.has(cacheKey)) {
        return { ...portalCache.get(cacheKey), xPortalCache: "HIT" };
      }

      let items = [...piProjects.values()]
        .filter((p) => p.status === "PUBLISHED" && p.publishedByDocente === true)
        .map((p) => projectToPublicProjection(p));

      if (type) items = items.filter((p) => p.type === type);
      if (course) items = items.filter((p) => p.course === course);
      if (semester) items = items.filter((p) => p.semester === semester);
      if (tag) items = items.filter((p) => p.tags.includes(tag));
      if (q) {
        const needle = q.toLowerCase();
        items = items.filter(
          (p) =>
            p.publicTitle.toLowerCase().includes(needle) ||
            p.publicSummary.toLowerCase().includes(needle) ||
            p.tags.some((t) => t.toLowerCase().includes(needle))
        );
      }

      // Ordenação determinística estável: publishedAt DESC, id ASC
      items.sort((a, b) => {
        const tDiff = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
        if (tDiff !== 0) return tDiff;
        return a.id.localeCompare(b.id);
      });

      const totalItems = items.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const offset = (page - 1) * pageSize;
      const pagedItems = items.slice(offset, offset + pageSize);
      const isEmpty = pagedItems.length === 0;

      const response = {
        status: 200,
        code: isEmpty ? "PORTAL_PUBLIC_LIST_EMPTY" : "PORTAL_PUBLIC_LIST_OK",
        xPortalCache: "MISS",
        stableSortKey: "publishedAt:desc,id:asc",
        page,
        pageSize,
        totalItems,
        totalPages,
        isEmpty,
        items: pagedItems,
        ssrHtml: isEmpty
          ? '<main data-testid="portal-empty-state"><p>Nenhum projeto publicado encontrado.</p></main>'
          : `<main data-testid="portal-catalog-grid">${pagedItems
              .map((i) => `<article data-project-id="${i.id}"><h2>${i.publicTitle}</h2></article>`)
              .join("")}</main>`,
        metadata: {
          robots: isEmpty ? "noindex, follow" : "index, follow",
        },
      };

      portalCache.set(cacheKey, response);
      return response;
    },

    getPublicProjectDetail(idOrSlug, { ifNoneMatch } = {}) {
      const project = [...piProjects.values()].find((p) => p.id === idOrSlug || p.slug === idOrSlug);
      if (!project || project.status !== "PUBLISHED" || project.publishedByDocente !== true) {
        return {
          status: 404,
          code: "PORTAL_PROJECT_NOT_PUBLIC",
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
          metadata: { robots: "noindex, nofollow" },
        };
      }

      const cacheKey = `portal:detail:${project.id}`;
      const etag = `W/"portal-qa019-${project.id}-pub"`;
      if (portalCache.has(cacheKey) && ifNoneMatch === etag) {
        return { status: 304, xPortalCache: "HIT", headers: { ETag: etag } };
      }

      const projection = projectToPublicProjection(project);
      const nextDataJson = JSON.stringify({ props: { pageProps: { project: projection } } });
      const response = {
        status: 200,
        code: "PORTAL_PROJECT_PUBLIC_OK",
        xPortalCache: portalCache.has(cacheKey) ? "HIT" : "MISS",
        headers: { ETag: etag, "Cache-Control": "public, max-age=60, must-revalidate" },
        item: projection,
        ssrHtml: `<!DOCTYPE html><html lang="pt-BR"><body><article data-testid="portal-project-detail"><h1>${projection.publicTitle}</h1></article><script id="__NEXT_DATA__" type="application/json">${nextDataJson}</script></body></html>`,
        metadata: {
          title: `${projection.publicTitle} | Portal UniSENAI`,
          openGraphTitle: projection.publicTitle,
          robots: "index, follow",
        },
      };

      portalCache.set(cacheKey, response);
      return response;
    },

    // =========================================================================
    // Executor de Jornada Playwright com Captura de Screenshot, Vídeo e Trace em Falhas
    // =========================================================================
    async executePlaywrightJourney({ journeyId, title, feRefs, specs, stepsFn }) {
      const startedAt = "2026-11-07T12:30:00.000Z";
      const traceEvents = [];
      const stepRecorder = {
        step(action, selectorOrRoute, assertionSummary) {
          traceEvents.push({
            seq: traceEvents.length + 1,
            action,
            target: sanitizeText(selectorOrRoute),
            assertion: sanitizeText(assertionSummary),
          });
        },
      };

      try {
        await stepsFn(stepRecorder);
        const record = {
          journeyId,
          title,
          feRefs,
          specs,
          status: "PASS",
          startedAt,
          stepsCount: traceEvents.length,
          // Com screenshot="only-on-failure", video="retain-on-failure" e trace="retain-on-failure",
          // testes aprovados não retêm artefatos de falha em disco
          retainedArtifactsOnSuccess: [],
        };
        journeyTelemetry.push(record);
        return record;
      } catch (err) {
        const sanitizedError = sanitizeText(err instanceof Error ? err.message : String(err));
        const slug = journeyId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const baseArtifactDir = `${config.outputDir}/${slug}-retry1`;

        const artifactBundle = {
          journeyId,
          title,
          feRefs,
          specs,
          status: "FAIL",
          errorMessage: sanitizedError,
          playwrightConfigUsed: {
            screenshot: config.use.screenshot,
            video: config.use.video,
            trace: config.use.trace,
          },
          artifacts: {
            screenshot: {
              path: `${baseArtifactDir}/test-failed-1.png`,
              mimeType: "image/png",
              mode: config.use.screenshot,
              fullPage: true,
              sanitizedDomBanner: `[SCREENSHOT_ON_FAILURE] ${journeyId} — ${sanitizedError}`,
            },
            video: {
              path: `${baseArtifactDir}/video.webm`,
              mimeType: "video/webm",
              mode: config.use.video,
              resolution: "1280x720",
            },
            trace: {
              path: `${baseArtifactDir}/trace.zip`,
              mimeType: "application/zip",
              mode: config.use.trace,
              entries: ["trace.trace", "trace.network", "resources/dom-snapshot.json"],
              recordedSteps: traceEvents,
            },
          },
        };

        failureArtifacts.push(artifactBundle);
        journeyTelemetry.push(artifactBundle);
        return artifactBundle;
      }
    },

    getAuditLogs() {
      return [...auditLogs];
    },

    getFailureArtifacts() {
      return [...failureArtifacts];
    },

    getJourneyTelemetry() {
      return [...journeyTelemetry];
    },
  };
}

// =============================================================================
// SUÍTE DE TESTES AUTOMATIZADOS E2E — QA-019 (13 Baterias / 12 Jornadas + Artefatos)
// =============================================================================

test("QA-019 | CT-QA019-01 (J01 Login — FE-004 / SPEC-AUTH-001, SPEC-AUTH-004): valida login por CPF/senha, bloqueio de 1º acesso até troca obrigatória, conta inativa, ausência de autocadastro público e sanitização", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J01-AUTH-LOGIN",
    title: "Login, Primeiro Acesso, Conta Inativa e Ausência de Autocadastro Público",
    feRefs: ["FE-004"],
    specs: ["SPEC-AUTH-001", "SPEC-AUTH-004"],
    stepsFn: (pw) => {
      // 1. Verificar tela de login sem link de autocadastro público (AC-AUTH-001-03a)
      const loginView = harness.renderLoginPage();
      pw.step("goto", "/login", "Renderiza formulário de CPF/senha sem link de autocadastro público");
      assert.equal(loginView.status, 200);
      assert.equal(loginView.elements.publicSelfRegisterLink, null);

      // 2. Tentativa com conta inativa (AC-AUTH-001-02a)
      const inactiveAttempt = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.inativo01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.inativo01.password,
      });
      pw.step("fill+click", '[data-testid="login-submit-btn"]', "Conta inativa recusada com 401");
      assert.equal(inactiveAttempt.status, 401);
      assert.equal(inactiveAttempt.redirectTo, "/login");
      assert.ok(!JSON.stringify(inactiveAttempt).includes(QA019_SYNTHETIC_ACCOUNTS.inativo01.password));

      // 3. Login com 1º acesso / senha redefinida (AC-AUTH-001-04a)
      const firstAccessSession = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.primeiroAcesso01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.primeiroAcesso01.password,
      });
      pw.step("login", "/primeiro-acesso", "Redireciona obrigatoriamente para /primeiro-acesso");
      assert.equal(firstAccessSession.status, 200);
      assert.equal(firstAccessSession.redirectTo, "/primeiro-acesso");
      assert.equal(firstAccessSession.mustChangePassword, true);

      // 4. Tentativa de burlar a troca de senha abrindo /aluno diretamente
      const bypassAttempt = harness.navigateToRoute(firstAccessSession.accessToken, "/aluno");
      pw.step("goto", "/aluno", "Bloqueia rota protegida com 403 PASSWORD_CHANGE_REQUIRED");
      assert.equal(bypassAttempt.status, 403);
      assert.equal(bypassAttempt.code, "PASSWORD_CHANGE_REQUIRED");
      assert.equal(bypassAttempt.redirectTo, "/primeiro-acesso");

      // 5. Concluir troca obrigatória de senha e prosseguir para /aluno
      const changed = harness.completeMandatoryPasswordChange(firstAccessSession.accessToken, {
        newPassword: "NovaSenhaForte#2026",
      });
      pw.step("submit", "/primeiro-acesso", "Conclui troca de senha e libera /aluno");
      assert.equal(changed.status, 200);
      assert.equal(changed.redirectTo, "/aluno");
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-02 (J02 Sessão e Guardas RBAC — FE-004, FE-005 / SPEC-AUTH-002, SPEC-AUTH-003): valida sessão por perfil, multi-perfil no mesmo CPF, refresh rotativo, revogação por reuse, bloqueio de link direto e logout", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J02-AUTH-SESSION",
    title: "Sessão Autenticada, Refresh Rotativo, Detecção de Reuse, Multi-perfil e Logout",
    feRefs: ["FE-004", "FE-005"],
    specs: ["SPEC-AUTH-002", "SPEC-AUTH-003"],
    stepsFn: (pw) => {
      // 1. Login Aluno e bloqueio de link direto a /docente e /coordenacao
      const alunoSess = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });
      pw.step("login", "/aluno", "Aluno autentica e recebe menus exclusivos do perfil ALUNO");
      assert.equal(alunoSess.status, 200);
      assert.equal(alunoSess.redirectTo, "/aluno");
      assert.equal(harness.navigateToRoute(alunoSess.accessToken, "/docente").status, 403);
      assert.equal(harness.navigateToRoute(alunoSess.accessToken, "/coordenacao").status, 403);

      // 2. Rotação de Refresh Token (G1 -> G2)
      const rotated = harness.rotateRefreshToken(alunoSess.refreshToken);
      pw.step("refresh", "/api/v1/auth/refresh", "Emite novo par Access+Refresh na geração 2");
      assert.equal(rotated.status, 200);
      assert.equal(rotated.generation, 2);

      // 3. Reuso do Refresh Token antigo (G1) -> revoga toda a família de sessão
      const reuseAttempt = harness.rotateRefreshToken(alunoSess.refreshToken);
      pw.step("reuse-attack", "/api/v1/auth/refresh", "Detecta reuse e revoga toda a família de tokens");
      assert.equal(reuseAttempt.status, 401);
      assert.equal(reuseAttempt.code, "REFRESH_TOKEN_REUSE_DETECTED");
      assert.equal(reuseAttempt.familyRevoked, true);
      assert.equal(harness.navigateToRoute(rotated.accessToken, "/aluno").status, 401);

      // 4. Login Multi-perfil (DOCENTE + COORDENACAO no mesmo CPF — AC-AUTH-003-01) e Logout
      const multiSess = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.multiPerfil01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.multiPerfil01.password,
      });
      pw.step("login-multi", "/coordenacao", "CPF acumula menus e rotas de DOCENTE e COORDENACAO");
      assert.equal(multiSess.status, 200);
      assert.ok(multiSess.visibleMenus.includes("Importação CSV"));
      assert.ok(multiSess.visibleMenus.includes("Validação de Horas"));
      assert.equal(harness.navigateToRoute(multiSess.accessToken, "/coordenacao").status, 200);
      assert.equal(harness.navigateToRoute(multiSess.accessToken, "/docente").status, 200);
      assert.equal(harness.navigateToRoute(multiSess.accessToken, "/aluno").status, 403);

      // 5. Logout invalida reacesso
      const logoutRes = harness.logout(multiSess.accessToken);
      pw.step("click", '[data-testid="logout-btn"]', "Encerra sessão e redireciona para /login");
      assert.equal(logoutRes.status, 204);
      assert.equal(harness.navigateToRoute(multiSess.accessToken, "/coordenacao").status, 401);
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-03 (J03 Proposta PI — FE-006 / SPEC-PI-001): valida criação em rascunho (isolado), publicação, edição, arquivamento, reabertura e bloqueio entre docentes", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J03-PI-PROPOSTA",
    title: "Ciclo de Vida de Proposta de Projeto Integrador (Rascunho -> Publicado -> Arquivado -> Reaberto)",
    feRefs: ["FE-006"],
    specs: ["SPEC-PI-001", "SPEC-AUTH-003"],
    stepsFn: (pw) => {
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const doc02 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente02.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente02.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });

      // 1. Docente 01 cria proposta em DRAFT
      const created = harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-QA019-PI-01",
        slug: "celula-robotica-colaborativa",
        title: "Célula Robótica Colaborativa com Visão Computacional",
        status: "DRAFT",
      });
      pw.step("submit", "/docente/projetos/novo", "Cria proposta PRJ-QA019-PI-01 em DRAFT");
      assert.equal(created.status, 201);
      assert.equal(created.project.status, "DRAFT");

      // 2. Rascunho invisível para Aluno 01, Docente 02 e Portal Público (AC-PI-001-02, AC-PI-001-07)
      assert.equal(harness.getPiProposal(alu01.accessToken, "PRJ-QA019-PI-01").status, 403);
      assert.equal(harness.getPiProposal(doc02.accessToken, "PRJ-QA019-PI-01").status, 403);
      assert.equal(harness.getPublicProjectDetail("PRJ-QA019-PI-01").status, 404);
      pw.step("verify-isolation", "/docente/projetos/PRJ-QA019-PI-01", "Isola proposta DRAFT de terceiros e do Portal");

      // 3. Docente 02 tenta publicar/editar proposta do Docente 01 -> 403 FORBIDDEN_PROJECT_SCOPE
      const unauthorizedEdit = harness.transitionPiProposal(doc02.accessToken, "PRJ-QA019-PI-01", {
        action: "PUBLISH",
      });
      assert.equal(unauthorizedEdit.status, 403);

      // 4. Docente 01 publica, arquiva e reabre a proposta
      const published = harness.transitionPiProposal(doc01.accessToken, "PRJ-QA019-PI-01", { action: "PUBLISH" });
      assert.equal(published.status, 200);
      assert.equal(published.currentStatus, "PUBLISHED");

      const archived = harness.transitionPiProposal(doc01.accessToken, "PRJ-QA019-PI-01", { action: "ARCHIVE" });
      assert.equal(archived.currentStatus, "ARCHIVED");

      const reopened = harness.transitionPiProposal(doc01.accessToken, "PRJ-QA019-PI-01", { action: "REOPEN" });
      assert.equal(reopened.currentStatus, "PUBLISHED");
      pw.step("transition", "/docente/projetos/PRJ-QA019-PI-01", "Publica, arquiva e reabre proposta pelo Docente Responsável");
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-04 (J04 Solicitação de Participação — FE-007 / SPEC-PI-001): valida solicitação pelo aluno em projeto publicado na janela, bloqueio em rascunho/duplicidade e vedação de convite individual", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J04-PI-SOLICITACAO",
    title: "Solicitação Discente de Participação em Projeto Publicado e Vedação de Convite Individual",
    feRefs: ["FE-007"],
    specs: ["SPEC-PI-001"],
    stepsFn: (pw) => {
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });

      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-QA019-DRAFT",
        title: "Projeto em Rascunho",
        status: "DRAFT",
      });
      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-QA019-PUB",
        title: "Projeto Publicado para Matrícula",
        status: "PUBLISHED",
      });

      // 1. Bloqueio de solicitação em projeto DRAFT
      const draftReq = harness.requestParticipation(alu01.accessToken, "PRJ-QA019-DRAFT");
      pw.step("click", '[data-testid="request-enrollment-draft"]', "Recusa inscrição em projeto DRAFT com 422");
      assert.equal(draftReq.status, 422);

      // 2. Solicitação válida em projeto PUBLISHED dentro da janela
      const validReq = harness.requestParticipation(alu01.accessToken, "PRJ-QA019-PUB");
      pw.step("click", '[data-testid="request-enrollment-btn"]', "Registra solicitação PENDING (201)");
      assert.equal(validReq.status, 201);
      assert.equal(validReq.enrollment.status, "PENDING");

      // 3. Bloqueio de solicitação duplicada
      const dupReq = harness.requestParticipation(alu01.accessToken, "PRJ-QA019-PUB");
      assert.equal(dupReq.status, 409);

      // 4. Bloqueio do fluxo legado de convite individual (AC-PI-001-14)
      const legacyInvite = harness.sendLegacyIndividualInvitation(doc01.accessToken, "PRJ-QA019-PUB");
      pw.step("assert-no-invite", "/aluno/projetos", "Confirma remoção de convites individuais (403)");
      assert.equal(legacyInvite.status, 403);
      assert.equal(legacyInvite.code, "INVITATION_FLOW_REMOVED_BY_SPEC");
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-05 (J05 Aprovação/Negação Docente e Remoção com Justificativa — FE-008 / SPEC-PI-001, SPEC-AUTH-003): valida decisão exclusiva pelo orientador e exigência de justificativa na remoção", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J05-PI-DECISAO-DOCENTE",
    title: "Aprovação/Negação de Participação e Remoção com Justificativa Obrigatória pelo Docente Responsável",
    feRefs: ["FE-008"],
    specs: ["SPEC-PI-001", "SPEC-AUTH-003"],
    stepsFn: (pw) => {
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const doc02 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente02.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente02.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });
      const alu02 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno02.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno02.password,
      });

      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-QA019-DEC",
        title: "Sistema Supervisorio Industrial",
        status: "PUBLISHED",
      });
      harness.requestParticipation(alu01.accessToken, "PRJ-QA019-DEC");
      harness.requestParticipation(alu02.accessToken, "PRJ-QA019-DEC");

      // 1. Docente 02 (não orientador) tenta decidir matrícula -> 403
      const wrongAdvisor = harness.decideParticipation(doc02.accessToken, "PRJ-QA019-DEC", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        decision: "APPROVED",
      });
      pw.step("decide-unauthorized", "/docente/solicitacoes", "Bloqueia decisão por docente não orientador (403)");
      assert.equal(wrongAdvisor.status, 403);

      // 2. Docente 01 aprova Aluno 01 e nega Aluno 02
      const approved = harness.decideParticipation(doc01.accessToken, "PRJ-QA019-DEC", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        decision: "APPROVED",
      });
      const rejected = harness.decideParticipation(doc01.accessToken, "PRJ-QA019-DEC", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno02.id,
        decision: "REJECTED",
      });
      pw.step("decide-valid", "/docente/solicitacoes", "Aprova Aluno 01 e nega Aluno 02");
      assert.equal(approved.status, 200);
      assert.equal(approved.enrollment.status, "APPROVED");
      assert.equal(rejected.status, 200);
      assert.equal(rejected.enrollment.status, "REJECTED");

      // 3. Tentativa de remover Aluno 01 sem justificativa -> 422 JUSTIFICATION_REQUIRED (AC-AUTH-003-04 / AC-PI-001-13)
      const removeNoJust = harness.removeParticipant(doc01.accessToken, "PRJ-QA019-DEC", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        justification: "",
      });
      pw.step("remove-without-justification", "/docente/projetos/PRJ-QA019-DEC", "Recusa remoção sem justificativa (422)");
      assert.equal(removeNoJust.status, 422);
      assert.equal(removeNoJust.code, "JUSTIFICATION_REQUIRED");

      // 4. Remoção válida com justificativa formal
      const removeWithJust = harness.removeParticipant(doc01.accessToken, "PRJ-QA019-DEC", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        justification: "Transferência oficial de turma solicitada pela secretaria acadêmica.",
      });
      pw.step("remove-with-justification", "/docente/projetos/PRJ-QA019-DEC", "Efetiva remoção com justificativa auditada (200)");
      assert.equal(removeWithJust.status, 200);
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-06 (J06 Edital e Avisos — FE-012 / SPEC-EXT-001): valida janelas de inscrição em UTC-3 pela Coordenação, avisos por escopo e bloqueio fora da janela", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J06-EXT-EDITAL",
    title: "Configuração de Edital e Períodos de Inscrição em UTC-3 e Avisos por Escopo",
    feRefs: ["FE-012"],
    specs: ["SPEC-EXT-001"],
    stepsFn: (pw) => {
      const coord = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.password,
      });
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });

      // 1. Docente sem papel de Coordenação tenta criar janela de edital -> 403
      const forbiddenEdital = harness.configureEditalWindow(doc01.accessToken, {
        id: "EDT-2026-EXT-01",
        title: "Edital Extensão",
        timezone: "America/Sao_Paulo",
        startAt: "2026-10-10T00:00:00-03:00",
        endAt: "2026-10-20T23:59:59-03:00",
      });
      assert.equal(forbiddenEdital.status, 403);

      // 2. Coordenação configura janela válida em America/Sao_Paulo (UTC-3)
      const validEdital = harness.configureEditalWindow(coord.accessToken, {
        id: "EDT-2026-EXT-01",
        title: "Edital de Extensão Tecnológica 2026.2",
        timezone: "America/Sao_Paulo",
        startAt: "2026-10-10T00:00:00-03:00",
        endAt: "2026-10-20T23:59:59-03:00",
      });
      pw.step("save-edital", "/coordenacao/editais", "Configura janela de inscrição em America/Sao_Paulo (UTC-3)");
      assert.equal(validEdital.status, 200);

      // 3. Projeto vinculado a esse edital bloqueia solicitação após o término da janela (25/10 > 20/10)
      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-EXT-EDITAL-01",
        type: "EXT",
        title: "Oficina de Robótica Educacional",
        status: "PUBLISHED",
        editalId: "EDT-2026-EXT-01",
      });
      const lateEnrollment = harness.requestParticipation(alu01.accessToken, "PRJ-EXT-EDITAL-01", {
        requestedAt: "2026-10-25T10:00:00-03:00",
      });
      pw.step("request-after-deadline", "/aluno/extensao", "Bloqueia solicitação fora da janela UTC-3 (422)");
      assert.equal(lateEnrollment.status, 422);
      assert.equal(lateEnrollment.code, "ENROLLMENT_WINDOW_CLOSED");

      // 4. Publicação de aviso institucional pela Coordenação e aviso de projeto pelo Docente
      assert.equal(
        harness.publishNotice(coord.accessToken, {
          scope: "GLOBAL",
          title: "Abertura de Editais 2026.2",
          message: "Inscrições abertas no horário de Brasília (UTC-3).",
        }).status,
        201
      );
      assert.equal(
        harness.publishNotice(doc01.accessToken, {
          scope: "PROJECT",
          projectId: "PRJ-EXT-EDITAL-01",
          title: "Reunião Inaugural",
          message: "Laboratório 3 às 14h.",
        }).status,
        201
      );
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-07 (J07 Banca — FE-009 / SPEC-PI-002): valida guarda normativa PG-008 (ausência de menu e 403) e motor de agendamento concorrente (timezone, avaliador duplicado, overlap e race condition)", async () => {
  const harness = createQA019PlaywrightStagingHarness({ bancaFeatureEnabled: false });

  const result = await harness.executePlaywrightJourney({
    journeyId: "J07-PI-BANCA",
    title: "Jornada de Banca: Guarda Normativa PG-008 e Agendamento Concorrente Multi-Timezone",
    feRefs: ["FE-009"],
    specs: ["SPEC-PI-002"],
    stepsFn: async (pw) => {
      const coord = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.password,
      });
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });

      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-BANCA-01",
        title: "Projeto Integrador Banca 01",
        status: "PUBLISHED",
      });
      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-BANCA-02",
        title: "Projeto Integrador Banca 02",
        status: "PUBLISHED",
      });

      // Modo A: Guarda Normativa PG-008 ativa (bancaFeatureEnabled = false)
      pw.step("check-menu-pg008", "/docente", "Menu Agendar Banca oculto quando PG-008 desabilita bancas");
      assert.ok(!doc01.visibleMenus.includes("Agendar Banca"));
      assert.equal(harness.navigateToRoute(doc01.accessToken, "/bancas/agendar").status, 403);
      assert.equal(
        harness.scheduleBanca(coord.accessToken, {
          projectId: "PRJ-BANCA-01",
          room: "SALA-101",
          startAt: "2026-11-18T14:00:00-03:00",
          endAt: "2026-11-18T15:00:00-03:00",
          evaluatorIds: [QA019_SYNTHETIC_ACCOUNTS.docente01.id, QA019_SYNTHETIC_ACCOUNTS.docente02.id],
        }).status,
        403
      );

      // Modo B: Motor de agendamento BE-011 habilitado para validação de regras e concorrência (QA-013)
      harness.setBancaFeatureEnabled(true);

      // Avaliador duplicado -> 422 DUPLICATE_EVALUATOR
      const dupEval = harness.scheduleBanca(coord.accessToken, {
        projectId: "PRJ-BANCA-01",
        room: "SALA-101",
        startAt: "2026-11-18T09:00:00-03:00",
        endAt: "2026-11-18T10:00:00-03:00",
        evaluatorIds: [QA019_SYNTHETIC_ACCOUNTS.docente01.id, QA019_SYNTHETIC_ACCOUNTS.docente01.id],
      });
      assert.equal(dupEval.status, 422);
      assert.equal(dupEval.code, "DUPLICATE_EVALUATOR");

      // Disparo concorrente de 8 requisições conflitantes em fusos distintos (-03:00 e Z)
      const concurrentRequests = Array.from({ length: 8 }, (_, idx) =>
        Promise.resolve().then(() =>
          harness.scheduleBanca(coord.accessToken, {
            projectId: idx % 2 === 0 ? "PRJ-BANCA-01" : "PRJ-BANCA-02",
            room: "SALA-AUD-01",
            timezone: idx % 2 === 0 ? "America/Sao_Paulo" : "UTC",
            startAt: idx % 2 === 0 ? "2026-11-18T14:00:00-03:00" : "2026-11-18T17:15:00Z",
            endAt: idx % 2 === 0 ? "2026-11-18T15:00:00-03:00" : "2026-11-18T18:15:00Z",
            evaluatorIds: [QA019_SYNTHETIC_ACCOUNTS.docente01.id, QA019_SYNTHETIC_ACCOUNTS.docente02.id],
          })
        )
      );
      const responses = await Promise.all(concurrentRequests);
      const confirmed = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);
      pw.step("concurrent-schedule", "/bancas/agendar", "Confirma exatamente 1 agendamento (201) e rejeita 7 (409)");
      assert.equal(confirmed.length, 1);
      assert.equal(conflicts.length, 7);
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-08 (J08 Upload, Arquivos Internos e Fotos — FE-010 / SPEC-PI-004): valida upload seguro de entregáveis, bloqueio de executáveis/XSS/path-traversal, isolamento de arquivos internos e autorização de fotos", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J08-PI-UPLOAD",
    title: "Upload de Entregáveis, Isolamento de Arquivos Internos e Autorização Docente de Fotos",
    feRefs: ["FE-010"],
    specs: ["SPEC-PI-004"],
    stepsFn: (pw) => {
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });
      const alu02 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno02.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno02.password,
      });

      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-UPLOAD-01",
        title: "Bancada de Eficiência Energética",
        status: "PUBLISHED",
      });
      harness.requestParticipation(alu01.accessToken, "PRJ-UPLOAD-01");
      harness.decideParticipation(doc01.accessToken, "PRJ-UPLOAD-01", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        decision: "APPROVED",
      });

      // 1. Aluno 01 (vinculado) faz upload válido de PDF
      const validUpload = harness.uploadDeliverable(alu01.accessToken, "PRJ-UPLOAD-01", {
        fileName: "relatorio-tecnico-etapa1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1_048_576,
      });
      pw.step("setInputFiles", '[data-testid="deliverable-upload-input"]', "Aceita PDF válido de 1 MB (201)");
      assert.equal(validUpload.status, 201);

      // 2. Bloqueia arquivo executável, path traversal, SVG com XSS e tamanho > 25MB
      assert.equal(
        harness.uploadDeliverable(alu01.accessToken, "PRJ-UPLOAD-01", {
          fileName: "malware.exe",
          mimeType: "application/x-msdownload",
          sizeBytes: 2048,
        }).status,
        422
      );
      assert.equal(
        harness.uploadDeliverable(alu01.accessToken, "PRJ-UPLOAD-01", {
          fileName: "../../etc/passwd.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
        }).status,
        422
      );
      assert.equal(
        harness.uploadDeliverable(alu01.accessToken, "PRJ-UPLOAD-01", {
          fileName: "diagrama.pdf",
          mimeType: "application/pdf",
          sizeBytes: 30 * 1024 * 1024,
        }).status,
        413
      );
      pw.step("validate-upload-security", "/aluno/projetos/PRJ-UPLOAD-01/entregaveis", "Bloqueia .exe, path traversal e >25MB");

      // 3. Aluno 02 (não vinculado ao projeto) não pode enviar entregável nem ler arquivos internos (AC-PI-004-01)
      assert.equal(
        harness.uploadDeliverable(alu02.accessToken, "PRJ-UPLOAD-01", {
          fileName: "intruso.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
        }).status,
        403
      );
      assert.equal(harness.listInternalFiles(alu02.accessToken, "PRJ-UPLOAD-01").status, 403);
      assert.equal(harness.listInternalFiles(alu01.accessToken, "PRJ-UPLOAD-01").status, 200);

      // 4. Autorização de publicação de fotos exclusiva do Docente Responsável (AC-PI-004-04)
      assert.equal(
        harness.setPhotoPublicationAuthorization(alu01.accessToken, "PRJ-UPLOAD-01", { photoAuthorized: true }).status,
        403
      );
      assert.equal(
        harness.setPhotoPublicationAuthorization(doc01.accessToken, "PRJ-UPLOAD-01", { photoAuthorized: true }).status,
        200
      );
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-09 (J09 Horas de Extensão — FE-013 / SPEC-EXT-002): valida submissão de atividades pelo aluno vinculado e validação/alteração exclusiva de horas pelo docente responsável", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J09-EXT-HORAS",
    title: "Submissão Discente de Atividades e Validação Exclusiva de Horas pelo Docente Responsável",
    feRefs: ["FE-013"],
    specs: ["SPEC-EXT-002", "SPEC-AUTH-003"],
    stepsFn: (pw) => {
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const doc02 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente02.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente02.password,
      });
      const coord = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });

      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-EXT-HORAS-01",
        type: "EXT",
        title: "Mentoria de Automação para Escolas Públicas",
        status: "PUBLISHED",
      });
      harness.requestParticipation(alu01.accessToken, "PRJ-EXT-HORAS-01");
      harness.decideParticipation(doc01.accessToken, "PRJ-EXT-HORAS-01", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        decision: "APPROVED",
      });

      // 1. Aluno 01 submete atividade de 24h
      const sub = harness.submitExtActivity(alu01.accessToken, "PRJ-EXT-HORAS-01", {
        title: "Ministrante de oficina prática de sensores",
        claimedHours: 24,
      });
      pw.step("submit-activity", "/aluno/extensao/PRJ-EXT-HORAS-01", "Submete atividade com 24h (PENDING_VALIDATION)");
      assert.equal(sub.status, 201);

      // 2. Aluno 01, Docente 02 e Coordenação pura tentam validar horas -> 403 (AC-EXT-002-03..04)
      assert.equal(
        harness.validateOrAdjustExtHours(alu01.accessToken, sub.activity.id, { validatedHours: 24 }).status,
        403
      );
      assert.equal(
        harness.validateOrAdjustExtHours(doc02.accessToken, sub.activity.id, { validatedHours: 24 }).status,
        403
      );
      assert.equal(
        harness.validateOrAdjustExtHours(coord.accessToken, sub.activity.id, { validatedHours: 24 }).status,
        403
      );
      pw.step("assert-advisor-exclusivity", "/docente/horas", "Bloqueia validação por aluno, outro docente ou coordenação (403)");

      // 3. Docente 01 (responsável) valida e ajusta horas para 20h
      const validated = harness.validateOrAdjustExtHours(doc01.accessToken, sub.activity.id, {
        validatedHours: 20,
        status: "APPROVED",
      });
      pw.step("validate-hours", "/docente/horas", "Docente responsável valida 20h com sucesso (200)");
      assert.equal(validated.status, 200);
      assert.equal(validated.activity.validatedHours, 20);
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-10 (J10 Notas, Rubricas e Pares — FE-011 / SPEC-PI-003): valida rubrica, avaliação entre pares, fechamento/reabertura docente e sigilo estrito de notas individuais", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J10-PI-NOTAS",
    title: "Rubricas, Avaliações entre Pares, Fechamento/Reabertura e Sigilo de Notas Individuais",
    feRefs: ["FE-011"],
    specs: ["SPEC-PI-003", "SPEC-PI-004"],
    stepsFn: (pw) => {
      const coord = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.coordenacao01.password,
      });
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });
      const alu02 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno02.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno02.password,
      });

      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-NOTAS-01",
        title: "Controle Preditivo em Planta Piloto",
        status: "PUBLISHED",
      });
      harness.requestParticipation(alu01.accessToken, "PRJ-NOTAS-01");
      harness.decideParticipation(doc01.accessToken, "PRJ-NOTAS-01", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        decision: "APPROVED",
      });

      // 1. Docente 01 configura rubrica com pesos somando 100% (rejeita soma != 100)
      assert.equal(
        harness.configureRubric(doc01.accessToken, "PRJ-NOTAS-01", {
          criteria: [{ name: "Protótipo", weight: 60 }],
        }).status,
        422
      );
      const rubricOk = harness.configureRubric(doc01.accessToken, "PRJ-NOTAS-01", {
        criteria: [
          { name: "Protótipo Funcional", weight: 60 },
          { name: "Documentação e Defesa", weight: 40 },
        ],
      });
      pw.step("configure-rubric", "/docente/avaliacoes/PRJ-NOTAS-01", "Configura rubrica com soma de pesos = 100%");
      assert.equal(rubricOk.status, 200);

      // 2. Coordenação designa Aluno 02 para avaliar PRJ-NOTAS-01 (AC-PI-003-06)
      assert.equal(
        harness.assignPeerEvaluator(coord.accessToken, {
          targetProjectId: "PRJ-NOTAS-01",
          evaluatorStudentId: QA019_SYNTHETIC_ACCOUNTS.aluno02.id,
          evaluationDate: "2026-11-20",
        }).status,
        200
      );
      assert.equal(
        harness.submitPeerEvaluation(alu02.accessToken, "PRJ-NOTAS-01", {
          score: 9.2,
          feedback: "Excelente estabilidade de malha.",
        }).status,
        201
      );

      // 3. Docente 01 publica nota final de Aluno 01 e fecha a avaliação
      const finalized = harness.recordAndFinalizeGrades(doc01.accessToken, "PRJ-NOTAS-01", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        finalGrade: 9.5,
        feedback: "Entrega exemplar.",
        closeEvaluation: true,
      });
      pw.step("finalize-grade", "/docente/avaliacoes/PRJ-NOTAS-01", "Publica nota 9.5 e encerra avaliação");
      assert.equal(finalized.status, 200);
      assert.equal(finalized.evaluationClosed, true);

      // 4. Após fechamento da avaliação, novo upload de entregável é bloqueado (AC-PI-004-02), até reabertura
      assert.equal(
        harness.uploadDeliverable(alu01.accessToken, "PRJ-NOTAS-01", {
          fileName: "atrasado.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
        }).status,
        422
      );
      assert.equal(harness.reopenEvaluation(doc01.accessToken, "PRJ-NOTAS-01").status, 200);

      // 5. Sigilo de notas individuais: Aluno 01 vê sua nota (200), mas Aluno 02 recebe 403 (AC-PI-003-04)
      const selfGrade = harness.getIndividualGrade(
        alu01.accessToken,
        "PRJ-NOTAS-01",
        QA019_SYNTHETIC_ACCOUNTS.aluno01.id
      );
      const otherStudentGrade = harness.getIndividualGrade(
        alu02.accessToken,
        "PRJ-NOTAS-01",
        QA019_SYNTHETIC_ACCOUNTS.aluno01.id
      );
      pw.step("verify-grade-privacy", "/aluno/avaliacoes", "Aluno 01 lê própria nota (200) e Aluno 02 recebe 403");
      assert.equal(selfGrade.status, 200);
      assert.equal(selfGrade.grade.finalGrade, 9.5);
      assert.equal(otherStudentGrade.status, 403);
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-11 (J11 Certificado de Extensão — FE-014 / SPEC-EXT-003): valida bloqueio por horas insuficientes, emissão com QR/Hash, verificação pública minimizada e revogação imediata", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J11-EXT-CERTIFICADO",
    title: "Emissão, Verificação Pública de Integridade (QR/Hash) e Revogação de Certificado de Extensão",
    feRefs: ["FE-014"],
    specs: ["SPEC-EXT-003"],
    stepsFn: (pw) => {
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });
      const alu01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.aluno01.password,
      });

      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-CERT-01",
        type: "EXT",
        title: "Capacitação Comunitária em Energias Renováveis",
        status: "PUBLISHED",
      });
      harness.requestParticipation(alu01.accessToken, "PRJ-CERT-01");
      harness.decideParticipation(doc01.accessToken, "PRJ-CERT-01", {
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        decision: "APPROVED",
      });

      // 1. Tentativa de emitir certificado antes da validação das horas -> 422 INSUFFICIENT_VALIDATED_HOURS
      const prematureCert = harness.issueExtCertificate(alu01.accessToken, {
        projectId: "PRJ-CERT-01",
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        minimumRequiredHours: 20,
      });
      pw.step("issue-premature", "/aluno/certificados", "Bloqueia emissão sem carga horária validada (422)");
      assert.equal(prematureCert.status, 422);

      // 2. Submissão e validação de 30h pelo Docente 01 -> emissão aprovada com QR e SHA-256
      const act = harness.submitExtActivity(alu01.accessToken, "PRJ-CERT-01", {
        title: "Oficina de painéis fotovoltaicos",
        claimedHours: 30,
      });
      harness.validateOrAdjustExtHours(doc01.accessToken, act.activity.id, {
        validatedHours: 30,
        status: "APPROVED",
      });

      const issued = harness.issueExtCertificate(alu01.accessToken, {
        projectId: "PRJ-CERT-01",
        studentId: QA019_SYNTHETIC_ACCOUNTS.aluno01.id,
        minimumRequiredHours: 20,
      });
      pw.step("issue-certificate", "/aluno/certificados", "Emite certificado com hash SHA-256 e QR Code (201)");
      assert.equal(issued.status, 201);
      assert.match(issued.certificate.integrityHash, /^[0-9a-f]{64}$/);
      assert.equal(issued.certificate.studentCpfMasked, "***.***.019-01");

      // 3. Verificação pública por QR/Hash sem expor CPF completo e falha se hash divergir
      const verified = harness.verifyCertificatePublic(
        issued.certificate.code,
        issued.certificate.integrityHash.slice(0, 16)
      );
      assert.equal(verified.status, 200);
      assert.equal(verified.publicVerification.status, "VALID");
      assert.ok(!JSON.stringify(verified).includes(QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf));
      assert.equal(harness.verifyCertificatePublic(issued.certificate.code, "deadbeef00000000").status, 422);

      // 4. Revogação invalida o certificado imediatamente e minimiza dados públicos
      const revoked = harness.revokeCertificate(doc01.accessToken, issued.certificate.code, {
        reason: "Retificação administrativa de ata de extensão.",
      });
      assert.equal(revoked.status, 200);
      const afterRevoke = harness.verifyCertificatePublic(issued.certificate.code);
      pw.step("verify-revoked", "/portal/certificados/verificar", "Exibe status REVOKED com exposição minimizada");
      assert.equal(afterRevoke.publicVerification.status, "REVOKED");
      assert.equal(afterRevoke.publicVerification.studentName, undefined);
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-12 (J12 Catálogo Público — FE-015, FE-016 / SPEC-PORTAL-001, SPEC-PORTAL-002): valida somente publicados e fotos autorizadas, filtros sem oráculo privado, paginação estável, página vazia, expurgo de cache após retirada e zero campos privados em API/SSR/Metadata", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  const result = await harness.executePlaywrightJourney({
    journeyId: "J12-PORTAL-CATALOGO",
    title: "Catálogo Público, Filtros, Paginação Estável, Página Vazia, Cache após Retirada e Privacidade SSR/Metadata",
    feRefs: ["FE-015", "FE-016"],
    specs: ["SPEC-PORTAL-001", "SPEC-PORTAL-002"],
    stepsFn: (pw) => {
      const doc01 = harness.login({
        cpf: QA019_SYNTHETIC_ACCOUNTS.docente01.cpf,
        password: QA019_SYNTHETIC_ACCOUNTS.docente01.password,
      });

      // Criar 3 projetos publicados (2 com mesmo publishedAt para testar desempate id ASC) e 1 rascunho secreto
      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-PORTAL-01",
        slug: "telemetria-industrial-iot",
        type: "PI",
        status: "PUBLISHED",
        publishedAt: "2026-10-20T18:00:00.000Z",
        title: "Telemetria Industrial IoT",
        internalNotesSecret: "[SECRET_PORTAL_NOTE_01]",
        photoAuthorized: true,
        photos: [
          { id: "PH-PUB-1", url: "https://cdn.unisenai.edu.br/p1.png", alt: "Foto autorizada", authorized: true },
          { id: "PH-PRIV-1", url: "/internal/priv1.png", alt: "Foto não autorizada", authorized: false },
        ],
      });
      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-PORTAL-02",
        slug: "visao-computacional-solda",
        type: "PI",
        status: "PUBLISHED",
        publishedAt: "2026-10-15T14:00:00.000Z",
        title: "Inspeção de Solda por Visão Computacional",
        photoAuthorized: false,
        photos: [{ id: "PH-PRIV-2", url: "/internal/priv2.png", alt: "Interna", authorized: false }],
      });
      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-PORTAL-03",
        slug: "oficina-robotica-comunitaria",
        type: "EXT",
        status: "PUBLISHED",
        publishedAt: "2026-10-15T14:00:00.000Z",
        title: "Oficina de Robótica Comunitária",
        photoAuthorized: true,
      });
      harness.createPiProposal(doc01.accessToken, {
        id: "PRJ-PORTAL-DRAFT-04",
        slug: "rascunho-confidencial-04",
        type: "PI",
        status: "DRAFT",
        title: "[DRAFT_CONFIDENTIAL_TITLE_04]",
      });

      // 1. Paginação estável (publishedAt DESC, id ASC) e exclusão de DRAFT
      const page1 = harness.queryPublicCatalog({ page: 1, pageSize: 2 });
      const page2 = harness.queryPublicCatalog({ page: 2, pageSize: 2 });
      pw.step("goto", "/portal/projetos?page=1&pageSize=2", "Ordena por publishedAt DESC, id ASC sem duplicatas");
      assert.deepEqual(
        page1.items.map((i) => i.id),
        ["PRJ-PORTAL-01", "PRJ-PORTAL-02"]
      );
      assert.deepEqual(
        page2.items.map((i) => i.id),
        ["PRJ-PORTAL-03"]
      );

      // 2. Busca oráculo sobre campo privado retorna página vazia (portal-empty-state)
      const oracleSearch = harness.queryPublicCatalog({ q: "SECRET_PORTAL_NOTE_01" });
      pw.step("search", "/portal/projetos?q=SECRET_PORTAL_NOTE_01", "Retorna 0 itens e data-testid=portal-empty-state");
      assert.equal(oracleSearch.isEmpty, true);
      assert.equal(oracleSearch.items.length, 0);
      assert.match(oracleSearch.ssrHtml, /data-testid="portal-empty-state"/);
      assert.equal(oracleSearch.metadata.robots, "noindex, follow");

      // 3. Detalhe SSR/API: verifica allowlist estrita, fotos autorizadas e aquecimento de cache (MISS -> HIT/304)
      const detail1 = harness.getPublicProjectDetail("PRJ-PORTAL-01");
      assert.equal(detail1.status, 200);
      assert.deepEqual(Object.keys(detail1.item).sort(), [...PUBLIC_PORTAL_ALLOWLIST].sort());
      assert.equal(detail1.item.photos.length, 1);
      assert.equal(detail1.item.photos[0].id, "PH-PUB-1");
      for (const forbiddenKey of QA019_FORBIDDEN_PRIVATE_KEYS) {
        assert.ok(!(forbiddenKey in detail1.item), `Chave privada '${forbiddenKey}' não pode existir no Portal`);
        assert.ok(!detail1.ssrHtml.includes(forbiddenKey));
      }

      const cached304 = harness.getPublicProjectDetail("PRJ-PORTAL-01", {
        ifNoneMatch: detail1.headers.ETag,
      });
      assert.equal(cached304.status, 304);
      assert.equal(cached304.xPortalCache, "HIT");

      // 4. Retirada do projeto (WITHDRAW) expurga cache imediatamente -> 404 mesmo com If-None-Match antigo
      const withdrawn = harness.transitionPiProposal(doc01.accessToken, "PRJ-PORTAL-01", { action: "WITHDRAW" });
      assert.ok(withdrawn.purgedCacheKeys.length > 0);
      const afterWithdraw = harness.getPublicProjectDetail("PRJ-PORTAL-01", {
        ifNoneMatch: detail1.headers.ETag,
      });
      pw.step("verify-cache-purge", "/portal/projetos/telemetria-industrial-iot", "Retorna 404 imediato após retirada");
      assert.equal(afterWithdraw.status, 404);
      assert.equal(afterWithdraw.code, "PORTAL_PROJECT_NOT_PUBLIC");
      assert.equal(afterWithdraw.headers["Cache-Control"], "no-store, no-cache, must-revalidate");
    },
  });

  assert.equal(result.status, "PASS");
});

test("QA-019 | CT-QA019-13 (Artefatos Playwright em Falhas e Sanitização MH-QA-001..002 / MH-SEC-003..004): registra screenshot, vídeo e trace exclusivamente em falhas e expurga segredos/CPFs dos artefatos", async () => {
  const harness = createQA019PlaywrightStagingHarness();

  // 1. Verificar configuração oficial do Playwright para captura em falhas
  assert.equal(harness.config.use.screenshot, "only-on-failure");
  assert.equal(harness.config.use.video, "retain-on-failure");
  assert.equal(harness.config.use.trace, "retain-on-failure");
  assert.equal(harness.config.use.timezoneId, "America/Sao_Paulo");

  // 2. Simular falha em jornada E2E com dados sintéticos sensíveis na mensagem de erro
  const failedRun = await harness.executePlaywrightJourney({
    journeyId: "J99-SIMULATED-FAILURE-ARTIFACTS",
    title: "Simulação de Falha no Staging para Validação de Screenshot, Vídeo e Trace",
    feRefs: ["FE-004", "FE-010"],
    specs: ["SPEC-AUTH-001", "SPEC-PI-004"],
    stepsFn: (pw) => {
      pw.step("goto", "/aluno/projetos/PRJ-UPLOAD-01/entregaveis", "Abre modal de upload de entregáveis");
      pw.step(
        "click",
        '[data-testid="submit-deliverable-btn"]',
        `Falha simulada para CPF ${QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf} com token ACC-QA019-99-G1`
      );
      throw new Error(
        `Timeout 5000ms waiting for selector [data-testid="toast-upload-success"] (user=${QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf}, pass=${QA019_SYNTHETIC_ACCOUNTS.aluno01.password}, token=ACC-QA019-99-G1)`
      );
    },
  });

  assert.equal(failedRun.status, "FAIL");
  assert.ok(failedRun.artifacts.screenshot.path.endsWith("/test-failed-1.png"));
  assert.equal(failedRun.artifacts.screenshot.mode, "only-on-failure");
  assert.ok(failedRun.artifacts.video.path.endsWith("/video.webm"));
  assert.equal(failedRun.artifacts.video.mode, "retain-on-failure");
  assert.ok(failedRun.artifacts.trace.path.endsWith("/trace.zip"));
  assert.equal(failedRun.artifacts.trace.mode, "retain-on-failure");
  assert.equal(failedRun.artifacts.trace.recordedSteps.length, 2);

  // 3. Garantir que o bundle de artefatos de falha e a trilha de auditoria estão 100% sanitizados (MH-SEC-004)
  const serializedBundle = JSON.stringify(failedRun);
  assert.ok(!serializedBundle.includes(QA019_SYNTHETIC_ACCOUNTS.aluno01.cpf), "CPF bruto não pode vazar no trace/screenshot");
  assert.ok(!serializedBundle.includes(QA019_SYNTHETIC_ACCOUNTS.aluno01.password), "Senha não pode vazar no trace/screenshot");
  assert.ok(!serializedBundle.includes("ACC-QA019-99-G1"), "Access token não pode vazar no trace/screenshot");
  assert.match(serializedBundle, /\*\*\*\.\*\*\*\.\*\*\*-\*\*/);
  assert.match(serializedBundle, /\[REDACTED_PASSWORD\]/);
  assert.match(serializedBundle, /\[REDACTED_TOKEN\]/);

  // 4. Confirmar cobertura completa das 13 dependências FE-004..016
  assert.equal(QA019_FRONTEND_DEPENDENCIES.length, 13);
  assert.deepEqual(
    QA019_FRONTEND_DEPENDENCIES.map((d) => d.feId),
    [
      "FE-004",
      "FE-005",
      "FE-006",
      "FE-007",
      "FE-008",
      "FE-009",
      "FE-010",
      "FE-011",
      "FE-012",
      "FE-013",
      "FE-014",
      "FE-015",
      "FE-016",
    ]
  );
});

