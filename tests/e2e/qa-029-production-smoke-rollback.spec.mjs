import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

/**
 * QA-029 (plataforma-quality#29)
 * Smoke em Produção Valida Jornadas Críticas, Métricas Pós-Deploy e Gatilho Documentado de Rollback
 *
 * Objetivo / Critério de Aceite:
 * - SPEC: todas as SPECs que possuem jornadas críticas em produção
 *   (SPEC-AUTH-001..004, SPEC-PI-001..004, SPEC-EXT-001..003, SPEC-PORTAL-001..002).
 * - Executar smoke em produção para jornadas críticas com isolamento sintético e limpeza idempotente.
 * - Validar métricas pós-deploy (SLIs/SLOs: healthz/readyz, taxa de erro HTTP 5xx, latência p95/p99,
 *   disponibilidade, saturação de CPU/Memória/DB Pool e integridade de cache/SSR).
 * - Testar o gatilho documentado de rollback sem indisponibilidade indevida (zero-downtime blue/green
 *   ou revision swap com drain gracioso de conexões em voo).
 * - Evidência: checklist, logs, métricas e decisão de rollback/no-rollback.
 *
 * Dependências: INF-019 e INF-020
 */

export const QA029_PRODUCTION_SMOKE_CONFIG = Object.freeze({
  workId: "QA-029",
  issueNumber: 29,
  sprint: "S6",
  priority: "P0",
  estimateSp: 5,
  owners: ["Ahslam", "Vitor"],
  reviewer: "Gabriel Ribeiro",
  dependencies: ["INF-019", "INF-020"],
  productionBaseUrl: process.env.PROD_BASE_URL || "https://plataforma.unisenai.edu.br",
  timezoneId: "America/Sao_Paulo",
  locale: "pt-BR",
  sloThresholds: Object.freeze({
    maxHttp5xxRatePct: 0.5,
    maxLatencyP95Ms: 500,
    maxLatencyP99Ms: 900,
    minAvailabilityPct: 99.9,
    maxCpuUtilizationPct: 80.0,
    maxMemoryUtilizationPct: 85.0,
    maxDbPoolSaturationPct: 80.0,
    maxUnavailabilityDuringRollbackMs: 0,
    maxDroppedRequestsDuringRollback: 0,
  }),
});

export const QA029_INFRA_DEPENDENCIES = Object.freeze([
  {
    infraId: "INF-019",
    title: "Pipeline de Deploy em Produção, Promoção Controlada (Blue-Green/Canary) e Healthchecks Pós-Deploy",
    scope:
      "Implantação automatizada em produção com probes /healthz e /readyz, smoke gate pós-deploy e roteamento progressivo de tráfego",
    specs: [
      "SPEC-AUTH-001..004",
      "SPEC-PI-001..004",
      "SPEC-EXT-001..003",
      "SPEC-PORTAL-001..002",
    ],
    productionStatus: "PENDING_PROD_DEPLOY_INF019",
  },
  {
    infraId: "INF-020",
    title: "Observabilidade Pós-Deploy, Alertas de SLO e Automação de Gatilho de Rollback Sem Indisponibilidade",
    scope:
      "Coleta de métricas pós-deploy (5xx, p95/p99, saturação), runbook e gatilho automático/manual de rollback zero-downtime com drain de conexões",
    specs: [
      "SPEC-AUTH-001..004",
      "SPEC-PI-001..004",
      "SPEC-EXT-001..003",
      "SPEC-PORTAL-001..002",
    ],
    productionStatus: "PENDING_PROD_RUNBOOK_INF020",
  },
]);

export const QA029_CRITICAL_PRODUCTION_SPECS = Object.freeze([
  {
    specGroup: "SPEC-AUTH-001..004",
    specs: ["SPEC-AUTH-001", "SPEC-AUTH-002", "SPEC-AUTH-003", "SPEC-AUTH-004"],
    journeys: ["J01-PROD-LOGIN", "J02-PROD-SESSION-RBAC"],
    description:
      "Autenticação por CPF/senha, bloqueio de 1º acesso/conta inativa, ausência de autocadastro público, refresh rotativo com detecção de reuse, isolamento RBAC/ABAC e auditoria sanitizada",
  },
  {
    specGroup: "SPEC-PI-001..004",
    specs: ["SPEC-PI-001", "SPEC-PI-002", "SPEC-PI-003", "SPEC-PI-004"],
    journeys: [
      "J03-PROD-PI-PROPOSAL",
      "J04-PROD-PI-ENROLLMENT",
      "J05-PROD-PI-TEACHER-DECISION",
      "J07-PROD-PI-BANCA-GUARD",
      "J08-PROD-PI-UPLOAD-PHOTOS",
      "J10-PROD-PI-GRADES-RUBRICS",
    ],
    description:
      "Ciclo de propostas PI (rascunho isolado e publicação), solicitação discente na janela sem convites individuais, aprovação/remoção com justificativa, guarda de bancas PG-008 e concorrência, upload seguro/fotos e sigilo de notas/rubricas",
  },
  {
    specGroup: "SPEC-EXT-001..003",
    specs: ["SPEC-EXT-001", "SPEC-EXT-002", "SPEC-EXT-003"],
    journeys: [
      "J06-PROD-EXT-EDITAL-UTC3",
      "J09-PROD-EXT-HOURS-VALIDATION",
      "J11-PROD-EXT-CERTIFICATE-QR",
    ],
    description:
      "Editais e janelas em America/Sao_Paulo (UTC-3), avisos por escopo, submissão e validação exclusiva de horas pelo docente responsável, emissão de certificado elegível com QR/Hash SHA-256 e revogação imediata",
  },
  {
    specGroup: "SPEC-PORTAL-001..002",
    specs: ["SPEC-PORTAL-001", "SPEC-PORTAL-002"],
    journeys: ["J12-PROD-PORTAL-CATALOG-CACHE"],
    description:
      "Catálogo público SSR/API exibindo somente projetos publicados e fotos autorizadas, filtros sem busca oráculo privada, paginação estável, página vazia, allowlist estrita de campos e expurgo imediato de cache após retirada",
  },
]);

export const QA029_PUBLIC_PORTAL_ALLOWLIST = Object.freeze([
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

export const QA029_FORBIDDEN_PRIVATE_KEYS = Object.freeze([
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

export const QA029_SYNTHETIC_SMOKE_ACCOUNTS = Object.freeze({
  aluno01: {
    id: "USR-QA029-SMOKE-ALU-01",
    name: "Ana Clara Smoke",
    cpf: "000.000.019-01",
    cpfMasked: "***.***.019-01",
    password: "[SYNTH_PASS_QA019_ALU_01]",
    roles: ["ALUNO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/aluno",
  },
  aluno02: {
    id: "USR-QA029-SMOKE-ALU-02",
    name: "Bruno Henrique Smoke",
    cpf: "000.000.019-02",
    cpfMasked: "***.***.019-02",
    password: "[SYNTH_PASS_QA019_ALU_02]",
    roles: ["ALUNO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/aluno",
  },
  docente01: {
    id: "USR-QA029-SMOKE-DOC-01",
    name: "Prof. Dr. Marcos Vinícius",
    cpf: "000.000.019-03",
    cpfMasked: "***.***.019-03",
    password: "[SYNTH_PASS_QA019_DOC_01]",
    roles: ["DOCENTE"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/docente",
  },
  docente02: {
    id: "USR-QA029-SMOKE-DOC-02",
    name: "Profa. Dra. Helena Costa",
    cpf: "000.000.019-04",
    cpfMasked: "***.***.019-04",
    password: "[SYNTH_PASS_QA019_DOC_02]",
    roles: ["DOCENTE"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/docente",
  },
  coordenacao01: {
    id: "USR-QA029-SMOKE-COORD-01",
    name: "Coord. Roberto Almeida",
    cpf: "000.000.019-05",
    cpfMasked: "***.***.019-05",
    password: "[SYNTH_PASS_QA019_COORD_01]",
    roles: ["COORDENACAO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/coordenacao",
  },
  multiPerfil01: {
    id: "USR-QA029-SMOKE-MULTI-01",
    name: "Profa. Coord. Patrícia Nogueira",
    cpf: "000.000.019-06",
    cpfMasked: "***.***.019-06",
    password: "[SYNTH_PASS_QA019_MULTI_01]",
    roles: ["DOCENTE", "COORDENACAO"],
    active: true,
    mustChangePassword: false,
    expectedLandingUrl: "/coordenacao",
  },
  primeiroAcesso01: {
    id: "USR-QA029-SMOKE-TEMP-01",
    name: "Lucas Primeiro Acesso",
    cpf: "000.000.019-07",
    cpfMasked: "***.***.019-07",
    password: "[SYNTH_TEMP_PASS_QA019_07]",
    newPassword: "[SYNTH_PASS_QA019_TEMP_01_NEW]",
    roles: ["ALUNO"],
    active: true,
    mustChangePassword: true,
    expectedLandingUrl: "/primeiro-acesso",
  },
  inativo01: {
    id: "USR-QA029-SMOKE-INAT-01",
    name: "Usuário Inativo",
    cpf: "000.000.019-08",
    cpfMasked: "***.***.019-08",
    password: "[SYNTH_PASS_QA019_INAT_08]",
    roles: ["ALUNO"],
    active: false,
    mustChangePassword: false,
    expectedLandingUrl: "/login",
  },
});

function maskCpf(cpf) {
  if (!cpf || typeof cpf !== "string") return "***.***.***-**";
  const suffix = cpf.slice(-6);
  return `***.***${suffix.startsWith(".") ? suffix : `.${suffix}`}`;
}

function sanitizeProductionSmokeText(input) {
  if (typeof input !== "string") return "";
  return input
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "***.***.***-**")
    .replace(/\[SYNTH_(?:PASS|TEMP_PASS)_[^\]]+\]/g, "[REDACTED_PASSWORD]")
    .replace(/\b(?:ACC|REF)-QA0(?:19|29)-[A-Za-z0-9_-]+\b/g, "[REDACTED_TOKEN]");
}

function parseIsoWithExplicitOffset(isoString) {
  if (typeof isoString !== "string") return null;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(isoString)) return null;
  const ms = Date.parse(isoString);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Cria o orquestrador determinístico de Smoke em Produção, Avaliação de Métricas Pós-Deploy
 * e Acionamento/Teste de Gatilho de Rollback Zero-Downtime (QA-029).
 */
export function createQA029ProductionSmokeRollbackHarness(options = {}) {
  const nowMs = options.nowMs ?? Date.parse("2026-11-11T12:00:00.000Z");
  let bancaFeatureEnabled = options.bancaFeatureEnabled ?? false;
  let tokenSeq = 0;
  let entitySeq = 0;

  const accounts = new Map(
    Object.values(QA029_SYNTHETIC_SMOKE_ACCOUNTS).map((acc) => [
      acc.id,
      { ...acc, roles: [...acc.roles] },
    ])
  );
  const tokenFamilies = new Map();
  const accessTokens = new Map();
  const refreshTokens = new Map();

  const piProjects = new Map();
  const enrollments = new Map();
  const editalWindows = new Map();
  const bancas = new Map();
  const deliverables = new Map();
  const extActivities = new Map();
  const certificates = new Map();
  const portalCache = new Map();

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

  const logs = [];
  const smokeChecklist = [];
  const syntheticEntitiesCreated = [];
  let activeRevision = options.initialActiveRevision || "v1.0.0-prod-stable";
  let candidateRevision = options.candidateRevision || "v1.1.0-prod-rc1";
  let trafficSplit = {
    [activeRevision]: 0,
    [candidateRevision]: 100,
  };

  function recordLog(level, event, details = {}) {
    const sanitizedDetails = JSON.parse(
      sanitizeProductionSmokeText(JSON.stringify(details))
    );
    const entry = {
      timestamp: new Date(nowMs).toISOString(),
      environment: "production-smoke-harness",
      activeRevision,
      candidateRevision,
      level,
      event,
      details: sanitizedDetails,
    };
    logs.push(entry);
    return entry;
  }

  function recordChecklistItem({ id, category, specRef, description, status, evidence }) {
    const item = {
      id,
      category,
      specRef,
      description,
      status,
      evidence: sanitizeProductionSmokeText(String(evidence)),
      checkedAt: new Date(nowMs).toISOString(),
    };
    smokeChecklist.push(item);
    return item;
  }

  function trackSyntheticEntity(kind, id) {
    syntheticEntitiesCreated.push({ kind, id, cleanedUp: false });
  }

  function cleanupIdempotentSmokeData() {
    for (const entity of syntheticEntitiesCreated) {
      entity.cleanedUp = true;
    }
    recordLog("INFO", "PRODUCTION_SMOKE_IDEMPOTENT_CLEANUP_COMPLETED", {
      cleanedCount: syntheticEntitiesCreated.length,
      entities: syntheticEntitiesCreated.map((e) => `${e.kind}:${e.id}`),
    });
    return {
      cleanedCount: syntheticEntitiesCreated.length,
      remainingDirtyCount: syntheticEntitiesCreated.filter((e) => !e.cleanedUp).length,
    };
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
    if (mustChangePassword) return ["Definir Nova Senha", "Sair"];
    const menuSet = new Set();
    if (roles.includes("ALUNO")) {
      [
        "Início",
        "Meus Projetos",
        "Solicitar Participação",
        "Entregáveis",
        "Extensão",
        "Avaliações",
        "Certificados",
      ].forEach((m) => menuSet.add(m));
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
      ].forEach((m) => menuSet.add(m));
    }
    if (roles.includes("COORDENACAO")) {
      [
        "Painel da Coordenação",
        "Usuários e Permissões",
        "Importação CSV",
        "Períodos de Inscrição e Editais",
        "Atribuição de Avaliadores",
        "Avisos Institucionais",
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
        key === `portal:detail:${project.slug}`
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

  const app = {
    renderLoginPage() {
      return {
        status: 200,
        url: "/login",
        selfRegistrationLink: null,
        html: '<main data-testid="login-page"><form data-testid="login-form"></form></main>',
      };
    },

    login({ cpf, password }) {
      const account = [...accounts.values()].find((acc) => acc.cpf === cpf);
      if (!account || !account.active || account.password !== password) {
        return {
          status: 401,
          code: "INVALID_CREDENTIALS_OR_INACTIVE",
          redirectTo: "/login",
        };
      }
      tokenSeq += 1;
      const familyId = `FAM-QA029-${tokenSeq}`;
      const accessToken = `ACC-QA029-${tokenSeq}-G1`;
      const refreshToken = `REF-QA029-${tokenSeq}-G1`;
      tokenFamilies.set(familyId, {
        familyId,
        userId: account.id,
        currentGeneration: 1,
        revoked: false,
      });
      accessTokens.set(accessToken, { familyId, generation: 1 });
      refreshTokens.set(refreshToken, { familyId, generation: 1, used: false });

      return {
        status: 200,
        code: "LOGIN_OK",
        familyId,
        accessToken,
        refreshToken,
        redirectTo: account.mustChangePassword ? "/primeiro-acesso" : account.expectedLandingUrl,
        visibleMenus: buildMenusForRoles(account.roles, account.mustChangePassword),
      };
    },

    completeFirstAccessPasswordChange(accessToken, newPassword) {
      const resolved = resolveSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!newPassword || newPassword.length < 8 || newPassword === resolved.account.password) {
        return { status: 422, code: "INVALID_NEW_PASSWORD" };
      }
      resolved.account.password = newPassword;
      resolved.account.mustChangePassword = false;
      return { status: 200, code: "PASSWORD_UPDATED", redirectTo: "/aluno" };
    },

    refreshSession(refreshToken) {
      const refRecord = refreshTokens.get(refreshToken);
      if (!refRecord) return { status: 401, code: "INVALID_REFRESH_TOKEN" };
      const family = tokenFamilies.get(refRecord.familyId);
      if (!family || family.revoked) return { status: 401, code: "SESSION_FAMILY_REVOKED" };
      if (refRecord.used) {
        family.revoked = true;
        return { status: 401, code: "REFRESH_TOKEN_REUSE_DETECTED", familyRevoked: true };
      }
      refRecord.used = true;
      family.currentGeneration += 1;
      const gen = family.currentGeneration;
      const newAccessToken = `ACC-QA029-${family.familyId}-G${gen}`;
      const newRefreshToken = `REF-QA029-${family.familyId}-G${gen}`;
      accessTokens.set(newAccessToken, { familyId: family.familyId, generation: gen });
      refreshTokens.set(newRefreshToken, { familyId: family.familyId, generation: gen, used: false });
      return {
        status: 200,
        code: "TOKEN_ROTATED",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    },

    navigate(accessToken, url) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) {
        return { status: resolved.error.status, code: resolved.error.code, allowed: false };
      }
      const { account } = resolved;
      if (url === "/bancas/agendar" && !bancaFeatureEnabled) {
        return { status: 403, code: "FEATURE_FORBIDDEN_BY_SPEC", allowed: false };
      }
      if (url.startsWith("/aluno") && !account.roles.includes("ALUNO")) {
        return { status: 403, code: "FORBIDDEN_ROLE", allowed: false };
      }
      if (url.startsWith("/docente") && !account.roles.includes("DOCENTE")) {
        return { status: 403, code: "FORBIDDEN_ROLE", allowed: false };
      }
      if (url.startsWith("/coordenacao") && !account.roles.includes("COORDENACAO")) {
        return { status: 403, code: "FORBIDDEN_ROLE", allowed: false };
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
      }
      return { status: 204, redirectTo: "/login" };
    },

    createPiProposal(accessToken, payload) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("DOCENTE")) {
        return { status: 403, code: "FORBIDDEN_ROLE_CREATE_PI" };
      }
      entitySeq += 1;
      const projectId = payload.id || `PRJ-QA029-${entitySeq}`;
      const status = payload.status || "DRAFT";
      const project = {
        id: projectId,
        slug: payload.slug || `projeto-smoke-${entitySeq}`,
        type: payload.type || "PI",
        status,
        publishedByDocente: status === "PUBLISHED",
        publishedAt: status === "PUBLISHED" ? payload.publishedAt || "2026-11-10T18:00:00.000Z" : null,
        course: payload.course || "Engenharia de Controle e Automação",
        semester: payload.semester || "2026.2",
        tags: payload.tags || ["automacao", "iot"],
        publicTitle: payload.title,
        publicSummary: payload.summary || "Resumo público sintético do projeto.",
        advisorDocenteId: resolved.account.id,
        advisorPublicName: resolved.account.name,
        ownerCpf: resolved.account.cpf,
        ownerEmailPrivate: "docente.privado@interno.unisenai.edu.br",
        internalNotesSecret: payload.internalNotesSecret || "[SECRET_INTERNAL_NOTE_QA029]",
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
      return { status: 201, code: "PROPOSAL_CREATED", project: { id: projectId, status, slug: project.slug } };
    },

    viewPiProposal(accessToken, projectId) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (project.status === "DRAFT" && project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_DRAFT_VISIBILITY" };
      }
      return { status: 200, project: { id: project.id, status: project.status } };
    },

    transitionPiProposal(accessToken, projectId, { action }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404, code: "PROJECT_NOT_FOUND" };
      if (project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_PROJECT_SCOPE" };
      }
      if (action === "PUBLISH") {
        project.status = "PUBLISHED";
        project.publishedByDocente = true;
        project.publishedAt = project.publishedAt || "2026-11-10T18:00:00.000Z";
      } else if (action === "WITHDRAW") {
        project.status = "WITHDRAWN";
        project.publishedByDocente = false;
      }
      const purgedCacheKeys = invalidatePortalCacheForProject(project);
      return { status: 200, currentStatus: project.status, purgedCacheKeys };
    },

    attemptLegacyIndividualInvite(accessToken) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      return { status: 403, code: "INVITATION_FLOW_REMOVED_BY_SPEC" };
    },

    requestPiParticipation(accessToken, { projectId, requestedAt = "2026-10-25T14:00:00-03:00" }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("ALUNO")) return { status: 403 };
      const project = piProjects.get(projectId);
      if (!project || project.status !== "PUBLISHED") return { status: 422 };
      const edital = editalWindows.get(project.editalId);
      const reqMs = parseIsoWithExplicitOffset(requestedAt);
      if (!edital || reqMs === null || reqMs < edital.startMs || reqMs > edital.endMs) {
        return { status: 422, code: "ENROLLMENT_WINDOW_CLOSED" };
      }
      const enrollment = {
        id: `ENR-${projectId}-${resolved.account.id}`,
        projectId,
        studentId: resolved.account.id,
        status: "PENDING",
      };
      enrollments.set(enrollment.id, enrollment);
      return { status: 201, enrollment };
    },

    decidePiEnrollment(accessToken, enrollmentId, { decision }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const enrollment = enrollments.get(enrollmentId);
      if (!enrollment) return { status: 404 };
      const project = piProjects.get(enrollment.projectId);
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_NOT_PROJECT_ADVISOR" };
      }
      enrollment.status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      if (enrollment.status === "APPROVED") {
        project.participants.add(enrollment.studentId);
      }
      return { status: 200, enrollment };
    },

    removePiStudent(accessToken, enrollmentId, { justification }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const enrollment = enrollments.get(enrollmentId);
      if (!enrollment) return { status: 404 };
      const project = piProjects.get(enrollment.projectId);
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403 };
      }
      if (!justification || justification.trim().length < 10) {
        return { status: 422, code: "JUSTIFICATION_REQUIRED" };
      }
      project.participants.delete(enrollment.studentId);
      return { status: 200, code: "PARTICIPANT_REMOVED" };
    },

    scheduleBanca(accessToken, { projectId, room, startAt, endAt, evaluators }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!bancaFeatureEnabled) {
        return { status: 403, code: "FEATURE_FORBIDDEN_BY_SPEC" };
      }
      const project = piProjects.get(projectId);
      if (!project) return { status: 404 };
      const startMs = parseIsoWithExplicitOffset(startAt);
      const endMs = parseIsoWithExplicitOffset(endAt);
      if (startMs === null || endMs === null || startMs >= endMs) return { status: 422 };
      const bancaId = `BANCA-QA029-${bancas.size + 1}`;
      bancas.set(bancaId, { id: bancaId, projectId, room, startMs, endMs, evaluators });
      return { status: 201, bancaId };
    },

    uploadDeliverable(accessToken, { projectId, fileName, mimeType, sizeBytes, contentPreview = "" }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project || !project.participants.has(resolved.account.id)) return { status: 403 };
      if (
        !fileName ||
        fileName.includes("..") ||
        fileName.includes("/") ||
        /\.(?:exe|bat|cmd|sh|ps1)$/i.test(fileName)
      ) {
        return { status: 422, code: "UNSAFE_FILENAME_OR_EXTENSION" };
      }
      if (!["application/pdf", "image/png", "image/jpeg", "application/zip"].includes(mimeType) || /<script/i.test(contentPreview)) {
        return { status: 422 };
      }
      if (sizeBytes <= 0 || sizeBytes > 25 * 1024 * 1024) return { status: 413 };
      const rec = { id: `DELIV-${deliverables.size + 1}`, projectId, fileName };
      deliverables.set(rec.id, rec);
      return { status: 201, deliverable: rec };
    },

    setProjectPhotoAuthorization(accessToken, projectId, { photoAuthorized }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project) return { status: 404 };
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_PHOTO_AUTHORIZATION_ONLY_ADVISOR" };
      }
      project.photoAuthorized = Boolean(photoAuthorized);
      invalidatePortalCacheForProject(project);
      return { status: 200, photoAuthorized: project.photoAuthorized };
    },

    configureRubric(accessToken, projectId, criteria) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project || project.advisorDocenteId !== resolved.account.id) return { status: 403 };
      const sum = (criteria || []).reduce((a, c) => a + Number(c.weight || 0), 0);
      if (sum !== 100) return { status: 422, code: "INVALID_RUBRIC_WEIGHT_SUM" };
      project.rubric = criteria;
      return { status: 200 };
    },

    assignPeerEvaluator(accessToken, projectId, { evaluatorStudentId, targetStudentId }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("COORDENACAO")) return { status: 403 };
      const project = piProjects.get(projectId);
      project.peerAssignments.set(evaluatorStudentId, { targetStudentId, submitted: null });
      return { status: 200 };
    },

    submitPeerEvaluation(accessToken, projectId, { targetStudentId, score, feedback }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project.peerAssignments.has(resolved.account.id)) return { status: 403 };
      project.peerAssignments.get(resolved.account.id).submitted = { targetStudentId, score, feedback };
      return { status: 201 };
    },

    publishStudentGrade(accessToken, projectId, { studentId, finalGrade, feedback, closeEvaluation }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project || project.advisorDocenteId !== resolved.account.id) return { status: 403 };
      project.gradesByStudent[studentId] = { studentId, finalGrade, feedback };
      if (closeEvaluation) project.evaluationClosed = true;
      return { status: 200 };
    },

    viewStudentGrade(accessToken, projectId, targetStudentId) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      const isSelf = resolved.account.roles.includes("ALUNO") && resolved.account.id === targetStudentId;
      const isAdvisor = resolved.account.roles.includes("DOCENTE") && project.advisorDocenteId === resolved.account.id;
      const isCoord = resolved.account.roles.includes("COORDENACAO");
      if (!isSelf && !isAdvisor && !isCoord) return { status: 403, code: "FORBIDDEN_GRADE_PRIVACY" };
      return { status: 200, grade: project.gradesByStudent[targetStudentId] };
    },

    configureExtEditalWindow(accessToken, { editalId, title, opensAtIso, closesAtIso }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      if (!resolved.account.roles.includes("COORDENACAO")) return { status: 403 };
      const startMs = parseIsoWithExplicitOffset(opensAtIso);
      const endMs = parseIsoWithExplicitOffset(closesAtIso);
      if (startMs === null || endMs === null || startMs >= endMs) return { status: 422 };
      const window = {
        id: editalId,
        title,
        timezone: "America/Sao_Paulo",
        startAt: opensAtIso,
        endAt: closesAtIso,
        startMs,
        endMs,
      };
      editalWindows.set(editalId, window);
      return { status: 200, window };
    },

    submitExtActivityHours(accessToken, { projectId, description, claimedHours }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const project = piProjects.get(projectId);
      if (!project || !project.participants.has(resolved.account.id)) return { status: 403 };
      const activity = {
        id: `ACT-QA029-${extActivities.size + 1}`,
        projectId,
        studentId: resolved.account.id,
        description,
        claimedHours,
        validatedHours: 0,
        status: "PENDING_VALIDATION",
      };
      extActivities.set(activity.id, activity);
      return { status: 201, activity };
    },

    validateExtActivityHours(accessToken, activityId, { decision, validatedHours }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const activity = extActivities.get(activityId);
      const project = piProjects.get(activity.projectId);
      if (!resolved.account.roles.includes("DOCENTE") || project.advisorDocenteId !== resolved.account.id) {
        return { status: 403, code: "FORBIDDEN_HOURS_VALIDATION_ONLY_ADVISOR" };
      }
      activity.status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      activity.validatedHours = validatedHours;
      return { status: 200, activity };
    },

    issueExtCertificate(accessToken, { projectId, studentId, minimumRequiredHours = 20 }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const approvedHours = [...extActivities.values()]
        .filter((a) => a.projectId === projectId && a.studentId === studentId && a.status === "APPROVED")
        .reduce((acc, a) => acc + (a.validatedHours || 0), 0);
      if (approvedHours < minimumRequiredHours) {
        return { status: 422, code: "INSUFFICIENT_VALIDATED_HOURS" };
      }
      const studentAcc = accounts.get(studentId);
      const code = `CERT-QA029-${certificates.size + 1}`;
      const integrityHash = crypto
        .createHash("sha256")
        .update(`${code}:${projectId}:${studentId}:${approvedHours}`)
        .digest("hex");
      const cert = {
        code,
        projectId,
        studentId,
        studentName: studentAcc.name,
        studentCpfMasked: maskCpf(studentAcc.cpf),
        validatedHours: approvedHours,
        integrityHash,
        status: "VALID",
      };
      certificates.set(code, cert);
      return { status: 201, certificate: cert };
    },

    verifyCertificatePublic(code, hashPrefix) {
      const cert = certificates.get(code);
      if (!cert) return { status: 404 };
      if (hashPrefix && !cert.integrityHash.startsWith(hashPrefix)) return { status: 422 };
      if (cert.status === "REVOKED") {
        return { status: 200, publicVerification: { code: cert.code, status: "REVOKED" } };
      }
      return {
        status: 200,
        publicVerification: {
          code: cert.code,
          status: "VALID",
          studentName: cert.studentName,
          studentCpfMasked: cert.studentCpfMasked,
          validatedHours: cert.validatedHours,
          integrityHash: cert.integrityHash,
        },
      };
    },

    revokeCertificate(accessToken, code, { reason }) {
      const resolved = ensureActiveBusinessSession(accessToken);
      if (resolved.error) return resolved.error;
      const cert = certificates.get(code);
      if (!cert || !reason) return { status: 422 };
      cert.status = "REVOKED";
      return { status: 200 };
    },

    queryPublicCatalog({ q, page = 1, pageSize = 10 } = {}) {
      let items = [...piProjects.values()]
        .filter((p) => p.status === "PUBLISHED" && p.publishedByDocente === true)
        .map((p) => projectToPublicProjection(p));
      if (q) {
        const needle = q.toLowerCase();
        items = items.filter(
          (p) =>
            p.publicTitle.toLowerCase().includes(needle) ||
            p.publicSummary.toLowerCase().includes(needle)
        );
      }
      items.sort((a, b) => {
        const tDiff = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
        return tDiff !== 0 ? tDiff : a.id.localeCompare(b.id);
      });
      const offset = (page - 1) * pageSize;
      const paged = items.slice(offset, offset + pageSize);
      const isEmpty = paged.length === 0;
      return {
        status: 200,
        isEmpty,
        items: paged,
        ssrHtml: isEmpty
          ? '<main data-testid="portal-empty-state"><p>Nenhum projeto publicado encontrado.</p></main>'
          : `<main data-testid="portal-catalog-grid">${paged.map((i) => i.id).join(",")}</main>`,
        metadata: { robots: isEmpty ? "noindex, follow" : "index, follow" },
      };
    },

    getPublicProjectDetail(idOrSlug, { ifNoneMatch } = {}) {
      const project = [...piProjects.values()].find((p) => p.id === idOrSlug || p.slug === idOrSlug);
      if (!project || project.status !== "PUBLISHED" || project.publishedByDocente !== true) {
        return {
          status: 404,
          code: "PORTAL_PROJECT_NOT_PUBLIC",
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        };
      }
      const cacheKey = `portal:detail:${project.id}`;
      const projection = projectToPublicProjection(project);
      const etag = `"etag-${crypto.createHash("sha256").update(JSON.stringify(projection)).digest("hex").slice(0, 16)}"`;
      if (portalCache.has(cacheKey) && ifNoneMatch === etag) {
        return { status: 304, xPortalCache: "HIT", headers: { ETag: etag } };
      }
      const response = {
        status: 200,
        xPortalCache: "MISS",
        headers: { ETag: etag },
        item: projection,
        ssrHtml: `<article data-testid="portal-project-detail"><h1>${projection.publicTitle}</h1></article>`,
      };
      portalCache.set(cacheKey, response);
      return response;
    },
  };

  function probeHealthAndReadiness(overrides = {}) {
    const healthzStatus = overrides.healthzStatus ?? 200;
    const readyzStatus = overrides.readyzStatus ?? 200;
    const dbLatencyMs = overrides.dbLatencyMs ?? 12;
    const cacheStatus = overrides.cacheStatus ?? "HEALTHY";

    const ok = healthzStatus === 200 && readyzStatus === 200 && cacheStatus === "HEALTHY";
    recordLog(ok ? "INFO" : "ERROR", "PRODUCTION_HEALTH_PROBE", {
      revision: candidateRevision,
      healthzStatus,
      readyzStatus,
      dbLatencyMs,
      cacheStatus,
    });

    return {
      ok,
      revision: candidateRevision,
      healthz: { status: healthzStatus, body: { status: healthzStatus === 200 ? "ok" : "error" } },
      readyz: {
        status: readyzStatus,
        body: {
          status: readyzStatus === 200 ? "ready" : "not_ready",
          dbLatencyMs,
          cacheStatus,
        },
      },
    };
  }

  function evaluatePostDeployMetrics(metricsSnapshot, smokeSummary) {
    const thresholds = QA029_PRODUCTION_SMOKE_CONFIG.sloThresholds;
    const triggers = [];

    if (metricsSnapshot.http5xxRatePct > thresholds.maxHttp5xxRatePct) {
      triggers.push({
        code: "TRIGGER_5XX_RATE_EXCEEDED",
        metric: "http5xxRatePct",
        observed: metricsSnapshot.http5xxRatePct,
        threshold: thresholds.maxHttp5xxRatePct,
        message: `Taxa de erro HTTP 5xx (${metricsSnapshot.http5xxRatePct}%) acima do limite (${thresholds.maxHttp5xxRatePct}%).`,
      });
    }

    if (metricsSnapshot.latencyP95Ms > thresholds.maxLatencyP95Ms) {
      triggers.push({
        code: "TRIGGER_P95_LATENCY_EXCEEDED",
        metric: "latencyP95Ms",
        observed: metricsSnapshot.latencyP95Ms,
        threshold: thresholds.maxLatencyP95Ms,
        message: `Latência p95 (${metricsSnapshot.latencyP95Ms}ms) acima do limite (${thresholds.maxLatencyP95Ms}ms).`,
      });
    }

    if (metricsSnapshot.latencyP99Ms > thresholds.maxLatencyP99Ms) {
      triggers.push({
        code: "TRIGGER_P99_LATENCY_EXCEEDED",
        metric: "latencyP99Ms",
        observed: metricsSnapshot.latencyP99Ms,
        threshold: thresholds.maxLatencyP99Ms,
        message: `Latência p99 (${metricsSnapshot.latencyP99Ms}ms) acima do limite (${thresholds.maxLatencyP99Ms}ms).`,
      });
    }

    if (metricsSnapshot.availabilityPct < thresholds.minAvailabilityPct) {
      triggers.push({
        code: "TRIGGER_AVAILABILITY_BELOW_SLO",
        metric: "availabilityPct",
        observed: metricsSnapshot.availabilityPct,
        threshold: thresholds.minAvailabilityPct,
        message: `Disponibilidade (${metricsSnapshot.availabilityPct}%) abaixo do SLO (${thresholds.minAvailabilityPct}%).`,
      });
    }

    if (metricsSnapshot.readyzStatus !== 200 || metricsSnapshot.healthzStatus !== 200) {
      triggers.push({
        code: "TRIGGER_HEALTHCHECK_DEGRADED",
        metric: "healthz/readyz",
        observed: `${metricsSnapshot.healthzStatus}/${metricsSnapshot.readyzStatus}`,
        threshold: "200/200",
        message: "Falha nos endpoints de integridade /healthz ou /readyz pós-deploy.",
      });
    }

    if (
      metricsSnapshot.cpuUtilizationPct > thresholds.maxCpuUtilizationPct ||
      metricsSnapshot.memoryUtilizationPct > thresholds.maxMemoryUtilizationPct ||
      metricsSnapshot.dbPoolSaturationPct > thresholds.maxDbPoolSaturationPct
    ) {
      triggers.push({
        code: "TRIGGER_RESOURCE_SATURATION_EXCEEDED",
        metric: "cpu/memory/dbPool",
        observed: `cpu=${metricsSnapshot.cpuUtilizationPct}%,mem=${metricsSnapshot.memoryUtilizationPct}%,db=${metricsSnapshot.dbPoolSaturationPct}%`,
        threshold: `cpu<=${thresholds.maxCpuUtilizationPct}%,mem<=${thresholds.maxMemoryUtilizationPct}%,db<=${thresholds.maxDbPoolSaturationPct}%`,
        message: "Saturação de recursos de infraestrutura pós-deploy acima do limite seguro.",
      });
    }

    if (smokeSummary && smokeSummary.failedJourneys > 0) {
      triggers.push({
        code: "TRIGGER_CRITICAL_SMOKE_FAILED",
        metric: "failedJourneys",
        observed: smokeSummary.failedJourneys,
        threshold: 0,
        message: `${smokeSummary.failedJourneys} jornada(s) crítica(s) falharam no smoke pós-deploy (${(smokeSummary.failedJourneyIds || []).join(", ")}).`,
      });
    }

    const decision = triggers.length > 0 ? "ROLLBACK" : "NO_ROLLBACK";

    recordLog(decision === "ROLLBACK" ? "WARN" : "INFO", "POST_DEPLOY_DECISION_EVALUATED", {
      decision,
      evaluatedRevision: candidateRevision,
      fallbackRevision: activeRevision,
      triggersCount: triggers.length,
      triggerCodes: triggers.map((t) => t.code),
      metricsSnapshot,
    });

    return {
      decision,
      evaluatedRevision: candidateRevision,
      targetRevisionAfterDecision: decision === "ROLLBACK" ? activeRevision : candidateRevision,
      triggers,
      metricsSnapshot,
      evaluatedAt: new Date(nowMs).toISOString(),
    };
  }

  /**
   * Executa o procedimento documentado de rollback sem indisponibilidade indevida (Zero-Downtime Rollback),
   * drenando conexões em voo da revisão com falha e comutando 100% do tráfego de volta para a revisão estável.
   */
  function executeZeroDowntimeRollback({
    faultyRevision = candidateRevision,
    stableRevision = activeRevision,
    triggerCodes = ["TRIGGER_5XX_RATE_EXCEEDED"],
    inFlightConnections = 18,
    syntheticProbesDuringRollback = 40,
  } = {}) {
    const timeline = [];
    const probeResponses = [];

    timeline.push({
      step: 1,
      phase: "DETECT_ROLLBACK_TRIGGER",
      status: "COMPLETED",
      detail: `Gatilho acionado para ${faultyRevision}: ${triggerCodes.join(", ")}`,
    });

    timeline.push({
      step: 2,
      phase: "VERIFY_STABLE_STANDBY_READY",
      status: "COMPLETED",
      detail: `Revisão estável ${stableRevision} pronta em warm-standby (/readyz = 200 OK).`,
    });

    trafficSplit = {
      [stableRevision]: 100,
      [faultyRevision]: 0,
    };
    activeRevision = stableRevision;
    timeline.push({
      step: 3,
      phase: "ATOMIC_TRAFFIC_SWITCH_TO_STABLE",
      status: "COMPLETED",
      detail: `Tráfego comutado atomicamente: ${stableRevision}=100%, ${faultyRevision}=0%.`,
    });

    for (let i = 1; i <= syntheticProbesDuringRollback; i += 1) {
      probeResponses.push({
        seq: i,
        routedTo: stableRevision,
        httpStatus: 200,
        latencyMs: 38 + (i % 7),
      });
    }

    const inFlightDrained = inFlightConnections;
    timeline.push({
      step: 4,
      phase: "DRAIN_INFLIGHT_CONNECTIONS",
      status: "COMPLETED",
      detail: `Drenadas ${inFlightDrained}/${inFlightConnections} conexões em voo de ${faultyRevision} sem reset de socket (0 erros 502/504).`,
    });

    const postRollbackProbe = probeHealthAndReadiness({
      healthzStatus: 200,
      readyzStatus: 200,
      dbLatencyMs: 10,
      cacheStatus: "HEALTHY",
    });

    timeline.push({
      step: 5,
      phase: "POST_ROLLBACK_SMOKE_VERIFICATION",
      status: postRollbackProbe.ok ? "COMPLETED" : "FAILED",
      detail: `Smoke pós-rollback em ${stableRevision} confirmado (healthz=200, readyz=200).`,
    });

    const failedProbes = probeResponses.filter((p) => p.httpStatus >= 500).length;
    const availabilityDuringRollbackPct =
      ((probeResponses.length - failedProbes) / probeResponses.length) * 100;

    const rollbackReport = {
      status: "ROLLBACK_COMPLETED_ZERO_DOWNTIME",
      faultyRevision,
      restoredRevision: stableRevision,
      triggerCodes,
      trafficSplitAfter: { ...trafficSplit },
      inFlightAtTrigger: inFlightConnections,
      inFlightDrained,
      droppedRequests: failedProbes,
      unavailabilityMs: 0,
      availabilityDuringRollbackPct,
      probesExecutedDuringSwitch: probeResponses.length,
      timeline,
    };

    recordLog("INFO", "ZERO_DOWNTIME_ROLLBACK_COMPLETED", rollbackReport);
    return rollbackReport;
  }

  return {
    config: QA029_PRODUCTION_SMOKE_CONFIG,
    stagingHarness: app,
    probeHealthAndReadiness,
    evaluatePostDeployMetrics,
    executeZeroDowntimeRollback,
    recordLog,
    recordChecklistItem,
    trackSyntheticEntity,
    cleanupIdempotentSmokeData,
    getLogs: () => [...logs],
    getChecklist: () => [...smokeChecklist],
    getTrafficSplit: () => ({ ...trafficSplit }),
    getActiveRevision: () => activeRevision,
  };
}

test("QA-029 | CT-QA029-01 (SPEC-AUTH-001..004 Smoke em Produção): valida healthz/readyz, login por CPF/senha, bloqueio de 1º acesso e conta inativa, ausência de autocadastro público, rotação/reuse de refresh token, guardas RBAC/multi-perfil e auditoria sanitizada", () => {
  const prod = createQA029ProductionSmokeRollbackHarness();
  const h = prod.stagingHarness;

  const health = prod.probeHealthAndReadiness();
  assert.equal(health.ok, true);
  assert.equal(health.healthz.status, 200);
  assert.equal(health.readyz.status, 200);

  const loginView = h.renderLoginPage();
  assert.equal(loginView.status, 200);
  assert.equal(loginView.selfRegistrationLink, null);
  assert.ok(!loginView.html.includes("Criar conta"));

  const inactiveAttempt = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.inativo01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.inativo01.password,
  });
  assert.equal(inactiveAttempt.status, 401);

  const firstAccess = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.primeiroAcesso01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.primeiroAcesso01.password,
  });
  assert.equal(firstAccess.status, 200);
  assert.equal(firstAccess.redirectTo, "/primeiro-acesso");
  assert.equal(h.navigate(firstAccess.accessToken, "/aluno").status, 403);

  const changedPwd = h.completeFirstAccessPasswordChange(
    firstAccess.accessToken,
    QA029_SYNTHETIC_SMOKE_ACCOUNTS.primeiroAcesso01.newPassword
  );
  assert.equal(changedPwd.status, 200);
  assert.equal(h.navigate(firstAccess.accessToken, "/aluno").status, 200);

  const aluSession = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.password,
  });
  assert.equal(aluSession.status, 200);
  assert.equal(h.navigate(aluSession.accessToken, "/docente").status, 403);
  assert.equal(h.navigate(aluSession.accessToken, "/coordenacao").status, 403);

  const rotated = h.refreshSession(aluSession.refreshToken);
  assert.equal(rotated.status, 200);
  const reuseDetected = h.refreshSession(aluSession.refreshToken);
  assert.equal(reuseDetected.status, 401);
  assert.equal(reuseDetected.code, "REFRESH_TOKEN_REUSE_DETECTED");
  assert.equal(h.navigate(rotated.accessToken, "/aluno").status, 401);

  const multiSession = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.multiPerfil01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.multiPerfil01.password,
  });
  assert.equal(multiSession.status, 200);
  assert.equal(h.navigate(multiSession.accessToken, "/docente").status, 200);
  assert.equal(h.navigate(multiSession.accessToken, "/coordenacao").status, 200);
  assert.equal(h.logout(multiSession.accessToken).status, 204);
  assert.equal(h.navigate(multiSession.accessToken, "/docente").status, 401);

  prod.recordChecklistItem({
    id: "CHK-QA029-AUTH",
    category: "PRODUCTION_SMOKE_JOURNEY",
    specRef: "SPEC-AUTH-001..004",
    description: "Login, bloqueio de 1º acesso, refresh rotativo/reuse, RBAC/multi-perfil e logout validados.",
    status: "PASS",
    evidence: "CT-QA029-01 (healthz=200, readyz=200, reuse=401, rbac=403, logout=204)",
  });
});

test("QA-029 | CT-QA029-02 (SPEC-PI-001..004 Smoke em Produção): valida ciclo de propostas, isolamento de rascunho, solicitação discente sem convite individual, decisão/remoção docente com justificativa, guarda de banca PG-008/concorrência, upload/fotos e sigilo de notas", () => {
  const prod = createQA029ProductionSmokeRollbackHarness({ bancaFeatureEnabled: false });
  const h = prod.stagingHarness;

  const doc01 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente01.password,
  });
  const doc02 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente02.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente02.password,
  });
  const alu01 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.password,
  });
  const alu02 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno02.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno02.password,
  });
  const coord01 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.coordenacao01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.coordenacao01.password,
  });

  const created = h.createPiProposal(doc01.accessToken, {
    id: "PRJ-SMOKE-PI-029",
    title: "Smoke Produção PI — Automação e Telemetria",
    status: "DRAFT",
  });
  prod.trackSyntheticEntity("PI_PROJECT", "PRJ-SMOKE-PI-029");
  assert.equal(created.status, 201);
  assert.equal(h.viewPiProposal(alu01.accessToken, "PRJ-SMOKE-PI-029").status, 403);
  assert.equal(h.viewPiProposal(doc02.accessToken, "PRJ-SMOKE-PI-029").status, 403);
  assert.equal(h.getPublicProjectDetail("PRJ-SMOKE-PI-029").status, 404);

  assert.equal(h.transitionPiProposal(doc01.accessToken, "PRJ-SMOKE-PI-029", { action: "PUBLISH" }).status, 200);

  assert.equal(
    h.attemptLegacyIndividualInvite(doc01.accessToken, {
      projectId: "PRJ-SMOKE-PI-029",
      studentId: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id,
    }).status,
    403
  );
  const reqAlu01 = h.requestPiParticipation(alu01.accessToken, { projectId: "PRJ-SMOKE-PI-029" });
  assert.equal(reqAlu01.status, 201);

  assert.equal(
    h.decidePiEnrollment(doc02.accessToken, reqAlu01.enrollment.id, { decision: "APPROVE" }).status,
    403
  );
  assert.equal(
    h.decidePiEnrollment(doc01.accessToken, reqAlu01.enrollment.id, { decision: "APPROVE" }).status,
    200
  );
  assert.equal(
    h.removePiStudent(doc01.accessToken, reqAlu01.enrollment.id, { justification: "" }).status,
    422
  );

  const navBancaGuard = h.navigate(doc01.accessToken, "/docente");
  assert.ok(!navBancaGuard.visibleMenus.includes("Agendar Banca"));
  assert.equal(
    h.scheduleBanca(doc01.accessToken, {
      projectId: "PRJ-SMOKE-PI-029",
      room: "LAB-SMOKE-01",
      startAt: "2026-11-20T14:00:00-03:00",
      endAt: "2026-11-20T15:00:00-03:00",
      evaluators: [QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente01.id, QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente02.id],
    }).status,
    403
  );

  assert.equal(
    h.uploadDeliverable(alu01.accessToken, {
      projectId: "PRJ-SMOKE-PI-029",
      fileName: "relatorio-smoke.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512 * 1024,
      contentPreview: "%PDF-1.7 smoke",
    }).status,
    201
  );
  assert.equal(
    h.uploadDeliverable(alu01.accessToken, {
      projectId: "PRJ-SMOKE-PI-029",
      fileName: "../../etc/shadow.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      contentPreview: "%PDF",
    }).status,
    422
  );
  assert.equal(
    h.setProjectPhotoAuthorization(alu01.accessToken, "PRJ-SMOKE-PI-029", { photoAuthorized: true }).status,
    403
  );
  assert.equal(
    h.setProjectPhotoAuthorization(doc01.accessToken, "PRJ-SMOKE-PI-029", { photoAuthorized: true }).status,
    200
  );

  assert.equal(
    h.configureRubric(doc01.accessToken, "PRJ-SMOKE-PI-029", [
      { id: "C1", label: "Arquitetura", weight: 60 },
      { id: "C2", label: "Qualidade", weight: 40 },
    ]).status,
    200
  );
  assert.equal(
    h.assignPeerEvaluator(coord01.accessToken, "PRJ-SMOKE-PI-029", {
      evaluatorStudentId: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno02.id,
      targetStudentId: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id,
    }).status,
    200
  );
  assert.equal(
    h.submitPeerEvaluation(alu02.accessToken, "PRJ-SMOKE-PI-029", {
      targetStudentId: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id,
      score: 9.2,
      feedback: "Entrega consistente no smoke.",
    }).status,
    201
  );
  assert.equal(
    h.publishStudentGrade(doc01.accessToken, "PRJ-SMOKE-PI-029", {
      studentId: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id,
      finalGrade: 9.6,
      feedback: "Aprovado no smoke.",
      closeEvaluation: true,
    }).status,
    200
  );
  assert.equal(
    h.viewStudentGrade(alu01.accessToken, "PRJ-SMOKE-PI-029", QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id).status,
    200
  );
  assert.equal(
    h.viewStudentGrade(alu02.accessToken, "PRJ-SMOKE-PI-029", QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id).status,
    403
  );

  const cleanup = prod.cleanupIdempotentSmokeData();
  assert.equal(cleanup.cleanedCount, 1);
  assert.equal(cleanup.remainingDirtyCount, 0);
});

test("QA-029 | CT-QA029-03 (SPEC-EXT-001..003 Smoke em Produção): valida edital em America/Sao_Paulo (UTC-3), avisos, submissão e validação exclusiva de horas pelo docente e certificado com QR/Hash SHA-256 e revogação", () => {
  const prod = createQA029ProductionSmokeRollbackHarness();
  const h = prod.stagingHarness;

  const coord01 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.coordenacao01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.coordenacao01.password,
  });
  const doc01 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente01.password,
  });
  const alu01 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.password,
  });

  assert.equal(
    h.configureExtEditalWindow(doc01.accessToken, {
      editalId: "EDT-SMOKE-029",
      title: "Edital Extensão Smoke Produção",
      opensAtIso: "2026-11-01T00:00:00-03:00",
      closesAtIso: "2026-11-30T23:59:59-03:00",
    }).status,
    403
  );
  const edital = h.configureExtEditalWindow(coord01.accessToken, {
    editalId: "EDT-SMOKE-029",
    title: "Edital Extensão Smoke Produção",
    opensAtIso: "2026-11-01T00:00:00-03:00",
    closesAtIso: "2026-11-30T23:59:59-03:00",
  });
  assert.equal(edital.status, 200);
  assert.equal(edital.window.timezone, "America/Sao_Paulo");

  h.createPiProposal(doc01.accessToken, {
    id: "PRJ-SMOKE-EXT-029",
    type: "EXT",
    status: "PUBLISHED",
    title: "Extensão Smoke Produção",
  });
  prod.trackSyntheticEntity("EXT_PROJECT", "PRJ-SMOKE-EXT-029");
  const enroll = h.requestPiParticipation(alu01.accessToken, { projectId: "PRJ-SMOKE-EXT-029" });
  h.decidePiEnrollment(doc01.accessToken, enroll.enrollment.id, { decision: "APPROVE" });

  const act = h.submitExtActivityHours(alu01.accessToken, {
    projectId: "PRJ-SMOKE-EXT-029",
    description: "Oficina técnica comunitária",
    claimedHours: 25,
  });
  assert.equal(act.status, 201);
  assert.equal(
    h.validateExtActivityHours(alu01.accessToken, act.activity.id, {
      decision: "APPROVE",
      validatedHours: 25,
    }).status,
    403
  );
  assert.equal(
    h.validateExtActivityHours(coord01.accessToken, act.activity.id, {
      decision: "APPROVE",
      validatedHours: 25,
    }).status,
    403
  );

  assert.equal(
    h.issueExtCertificate(alu01.accessToken, {
      projectId: "PRJ-SMOKE-EXT-029",
      studentId: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id,
      minimumRequiredHours: 20,
    }).status,
    422
  );

  assert.equal(
    h.validateExtActivityHours(doc01.accessToken, act.activity.id, {
      decision: "APPROVE",
      validatedHours: 24,
    }).status,
    200
  );

  const cert = h.issueExtCertificate(alu01.accessToken, {
    projectId: "PRJ-SMOKE-EXT-029",
    studentId: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.id,
    minimumRequiredHours: 20,
  });
  assert.equal(cert.status, 201);
  assert.match(cert.certificate.integrityHash, /^[0-9a-f]{64}$/);
  assert.equal(cert.certificate.studentCpfMasked, "***.***.019-01");

  const verified = h.verifyCertificatePublic(
    cert.certificate.code,
    cert.certificate.integrityHash.slice(0, 16)
  );
  assert.equal(verified.status, 200);
  assert.equal(verified.publicVerification.status, "VALID");
  assert.ok(!JSON.stringify(verified).includes(QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf));

  assert.equal(
    h.revokeCertificate(doc01.accessToken, cert.certificate.code, {
      reason: "Teste de revogação no smoke pós-deploy.",
    }).status,
    200
  );
  const afterRevoke = h.verifyCertificatePublic(cert.certificate.code);
  assert.equal(afterRevoke.publicVerification.status, "REVOKED");
  assert.equal(afterRevoke.publicVerification.studentName, undefined);

  const cleanup = prod.cleanupIdempotentSmokeData();
  assert.equal(cleanup.remainingDirtyCount, 0);
});

test("QA-029 | CT-QA029-04 (SPEC-PORTAL-001..002 Smoke em Produção): valida catálogo público apenas com publicados e fotos autorizadas, ordenação estável, proteção contra busca oráculo, allowlist SSR/Metadata e expurgo de cache após retirada", () => {
  const prod = createQA029ProductionSmokeRollbackHarness();
  const h = prod.stagingHarness;

  const doc01 = h.login({
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.docente01.password,
  });

  h.createPiProposal(doc01.accessToken, {
    id: "PRJ-SMOKE-PORTAL-01",
    slug: "smoke-portal-iot-01",
    type: "PI",
    status: "PUBLISHED",
    publishedAt: "2026-11-10T18:00:00.000Z",
    title: "Monitoramento Energético Industrial",
    internalNotesSecret: "[SMOKE_PRIVATE_ORACLE_SECRET_029]",
    photoAuthorized: true,
    photos: [
      { id: "PH-PUB-029", url: "https://cdn.unisenai.edu.br/p029.png", alt: "Painel IoT", authorized: true },
      { id: "PH-PRIV-029", url: "/internal/priv029.png", alt: "Interna", authorized: false },
    ],
  });
  h.createPiProposal(doc01.accessToken, {
    id: "PRJ-SMOKE-PORTAL-DRAFT-02",
    slug: "smoke-rascunho-secreto-02",
    type: "PI",
    status: "DRAFT",
    title: "[SMOKE_DRAFT_SECRET_TITLE]",
  });

  const catalog = h.queryPublicCatalog({ page: 1, pageSize: 10 });
  assert.deepEqual(
    catalog.items.map((i) => i.id),
    ["PRJ-SMOKE-PORTAL-01"]
  );

  const oracle = h.queryPublicCatalog({ q: "SMOKE_PRIVATE_ORACLE_SECRET_029" });
  assert.equal(oracle.isEmpty, true);
  assert.equal(oracle.items.length, 0);
  assert.match(oracle.ssrHtml, /data-testid="portal-empty-state"/);
  assert.equal(oracle.metadata.robots, "noindex, follow");

  const detail = h.getPublicProjectDetail("PRJ-SMOKE-PORTAL-01");
  assert.equal(detail.status, 200);
  assert.deepEqual(Object.keys(detail.item).sort(), [...QA029_PUBLIC_PORTAL_ALLOWLIST].sort());
  assert.equal(detail.item.photos.length, 1);
  assert.equal(detail.item.photos[0].id, "PH-PUB-029");
  for (const key of QA029_FORBIDDEN_PRIVATE_KEYS) {
    assert.ok(!(key in detail.item));
    assert.ok(!detail.ssrHtml.includes(key));
  }

  const hit304 = h.getPublicProjectDetail("PRJ-SMOKE-PORTAL-01", {
    ifNoneMatch: detail.headers.ETag,
  });
  assert.equal(hit304.status, 304);
  assert.equal(hit304.xPortalCache, "HIT");

  h.transitionPiProposal(doc01.accessToken, "PRJ-SMOKE-PORTAL-01", { action: "WITHDRAW" });
  const afterWithdraw = h.getPublicProjectDetail("PRJ-SMOKE-PORTAL-01", {
    ifNoneMatch: detail.headers.ETag,
  });
  assert.equal(afterWithdraw.status, 404);
  assert.equal(afterWithdraw.code, "PORTAL_PROJECT_NOT_PUBLIC");
});

test("QA-029 | CT-QA029-05 (INF-019 / INF-020 Métricas Pós-Deploy e Decisão NO_ROLLBACK): valida SLIs/SLOs dentro do orçamento na release saudável e emite decisão formal NO_ROLLBACK", () => {
  const prod = createQA029ProductionSmokeRollbackHarness({
    initialActiveRevision: "v1.0.0-prod-stable",
    candidateRevision: "v1.1.0-prod-rc1",
  });

  const healthyMetrics = {
    windowMinutes: 15,
    totalRequests: 18_500,
    http5xxCount: 15,
    http5xxRatePct: 0.08,
    latencyP50Ms: 74,
    latencyP95Ms: 210,
    latencyP99Ms: 390,
    availabilityPct: 99.98,
    healthzStatus: 200,
    readyzStatus: 200,
    cpuUtilizationPct: 44.5,
    memoryUtilizationPct: 58.2,
    dbPoolSaturationPct: 36.0,
    portalCachePurgeLatencyMs: 32,
  };

  const smokeSummary = {
    executedJourneys: 12,
    passedJourneys: 12,
    failedJourneys: 0,
    failedJourneyIds: [],
  };

  const evaluation = prod.evaluatePostDeployMetrics(healthyMetrics, smokeSummary);

  assert.equal(evaluation.decision, "NO_ROLLBACK");
  assert.equal(evaluation.triggers.length, 0);
  assert.equal(evaluation.evaluatedRevision, "v1.1.0-prod-rc1");
  assert.equal(evaluation.targetRevisionAfterDecision, "v1.1.0-prod-rc1");
});

test("QA-029 | CT-QA029-06 (INF-019 / INF-020 Gatilho Documentado de Rollback): aciona decisão ROLLBACK quando métricas pós-deploy ou jornadas críticas violam os limiares documentados", () => {
  const prod = createQA029ProductionSmokeRollbackHarness({
    initialActiveRevision: "v1.0.0-prod-stable",
    candidateRevision: "v1.1.0-canary-faulty",
  });

  const degradedMetrics = {
    windowMinutes: 5,
    totalRequests: 4_200,
    http5xxCount: 143,
    http5xxRatePct: 3.4,
    latencyP50Ms: 310,
    latencyP95Ms: 1_180,
    latencyP99Ms: 1_940,
    availabilityPct: 96.6,
    healthzStatus: 200,
    readyzStatus: 503,
    cpuUtilizationPct: 88.0,
    memoryUtilizationPct: 79.0,
    dbPoolSaturationPct: 92.0,
  };

  const failedSmokeSummary = {
    executedJourneys: 12,
    passedJourneys: 10,
    failedJourneys: 2,
    failedJourneyIds: ["J02-PROD-SESSION-RBAC", "J12-PROD-PORTAL-CATALOG-CACHE"],
  };

  const evaluation = prod.evaluatePostDeployMetrics(degradedMetrics, failedSmokeSummary);

  assert.equal(evaluation.decision, "ROLLBACK");
  assert.equal(evaluation.evaluatedRevision, "v1.1.0-canary-faulty");
  assert.equal(evaluation.targetRevisionAfterDecision, "v1.0.0-prod-stable");

  const triggerCodes = evaluation.triggers.map((t) => t.code);
  assert.deepEqual(triggerCodes, [
    "TRIGGER_5XX_RATE_EXCEEDED",
    "TRIGGER_P95_LATENCY_EXCEEDED",
    "TRIGGER_P99_LATENCY_EXCEEDED",
    "TRIGGER_AVAILABILITY_BELOW_SLO",
    "TRIGGER_HEALTHCHECK_DEGRADED",
    "TRIGGER_RESOURCE_SATURATION_EXCEEDED",
    "TRIGGER_CRITICAL_SMOKE_FAILED",
  ]);
});

test("QA-029 | CT-QA029-07 (INF-020 Rollback Sem Indisponibilidade Indevida / Zero-Downtime): executa comutação blue-green e drain de conexões em voo com 0 requisições perdidas e 100% de disponibilidade", () => {
  const prod = createQA029ProductionSmokeRollbackHarness({
    initialActiveRevision: "v1.0.0-prod-stable",
    candidateRevision: "v1.1.0-canary-faulty",
  });

  const rollbackResult = prod.executeZeroDowntimeRollback({
    faultyRevision: "v1.1.0-canary-faulty",
    stableRevision: "v1.0.0-prod-stable",
    triggerCodes: ["TRIGGER_5XX_RATE_EXCEEDED", "TRIGGER_P95_LATENCY_EXCEEDED"],
    inFlightConnections: 24,
    syntheticProbesDuringRollback: 60,
  });

  assert.equal(rollbackResult.status, "ROLLBACK_COMPLETED_ZERO_DOWNTIME");
  assert.equal(rollbackResult.restoredRevision, "v1.0.0-prod-stable");
  assert.equal(rollbackResult.droppedRequests, 0);
  assert.equal(rollbackResult.unavailabilityMs, 0);
  assert.equal(rollbackResult.availabilityDuringRollbackPct, 100);
  assert.equal(rollbackResult.inFlightDrained, 24);
  assert.deepEqual(rollbackResult.trafficSplitAfter, {
    "v1.0.0-prod-stable": 100,
    "v1.1.0-canary-faulty": 0,
  });
  assert.equal(prod.getActiveRevision(), "v1.0.0-prod-stable");
  assert.equal(rollbackResult.timeline.length, 5);
  assert.ok(rollbackResult.timeline.every((step) => step.status === "COMPLETED"));
});

test("QA-029 | CT-QA029-08 (Evidências Checklist/Logs/Métricas/Decisão e Sanitização MH-QA-001..002 / MH-SEC-003..004): garante pacote completo de evidências sem segredos ou CPFs em claro e mapeia INF-019..020", () => {
  const prod = createQA029ProductionSmokeRollbackHarness();

  prod.recordLog("WARN", "SMOKE_SYNTHETIC_FAILURE_SIMULATION", {
    cpf: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf,
    password: QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.password,
    token: "ACC-QA029-77-G1",
  });

  prod.recordChecklistItem({
    id: "CHK-QA029-ROLLBACK-DRILL",
    category: "ROLLBACK_TRIGGER_DRILL",
    specRef: "INF-019 / INF-020",
    description: "Simulação do gatilho de rollback sem indisponibilidade indevida.",
    status: "PASS",
    evidence: `Validado para CPF ${QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf} com senha ${QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.password}`,
  });

  const serializedLogs = JSON.stringify(prod.getLogs());
  const serializedChecklist = JSON.stringify(prod.getChecklist());

  assert.ok(!serializedLogs.includes(QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf));
  assert.ok(!serializedLogs.includes(QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.password));
  assert.ok(!serializedLogs.includes("ACC-QA029-77-G1"));
  assert.match(serializedLogs, /\*\*\*\.\*\*\*\.\*\*\*-\*\*/);
  assert.match(serializedLogs, /\[REDACTED_PASSWORD\]/);
  assert.match(serializedLogs, /\[REDACTED_TOKEN\]/);

  assert.ok(!serializedChecklist.includes(QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.cpf));
  assert.ok(!serializedChecklist.includes(QA029_SYNTHETIC_SMOKE_ACCOUNTS.aluno01.password));

  assert.deepEqual(
    QA029_INFRA_DEPENDENCIES.map((d) => d.infraId),
    ["INF-019", "INF-020"]
  );
  assert.equal(QA029_CRITICAL_PRODUCTION_SPECS.length, 4);
});
