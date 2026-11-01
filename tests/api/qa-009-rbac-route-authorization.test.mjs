import assert from "node:assert/strict";
import test from "node:test";

/**
 * Suíte de testes de API e Segurança — QA-009 (plataforma-quality#9)
 * "[QA-009] RBAC cobre allow/deny por perfil e rota"
 *
 * Objetivo e Escopo Normativo:
 * Exercitar allow e deny por perfil, rota, escopo e recurso em SPEC-AUTH-003,
 * cobrindo os impactos transversais de autorização em:
 * - SPEC-AUTH-003 (AC-AUTH-003-01..06: RBAC por função, acúmulo no mesmo CPF, escopo de projeto/recurso, justificativa obrigatória e deny by default)
 * - SPEC-PI-001 (AC-PI-001-01..15: propostas rascunho/publicado, matrícula por solicitação, aprovação/remoção com justificativa, bloqueio de convite legado)
 * - SPEC-PI-002 (AC-PI-002-01..03: acompanhamento de etapas do PI e proibição de agenda/bancas)
 * - SPEC-PI-003 (AC-PI-003-01..06: rubricas/pesos, fechamento/reabertura pelo docente responsável, atribuição de avaliadores pela coordenação, sigilo de notas)
 * - SPEC-PI-004 (AC-PI-004-01..04: arquivos internos restritos a vinculados/responsável e autorização de publicação de fotos)
 * - SPEC-EXT-001 (AC-EXT-001-01..04: janelas de inscrição em UTC-3 pela coordenação e publicação de avisos por escopo)
 * - SPEC-EXT-002 (AC-EXT-002-01..04: submissão de atividades pelo aluno e validação/alteração de horas exclusivamente pelo docente responsável)
 * - SPEC-EXT-003 (AC-EXT-003-01..03: relatórios e consolidação de carga horária de extensão por escopo)
 * - SPEC-PORTAL-001 (AC-PORTAL-001-01..05) e SPEC-PORTAL-002 (AC-PORTAL-002-01..03: exposição pública apenas de projetos publicados e fotos autorizadas, sem vazar rascunhos, notas, horas, arquivos internos ou CPFs)
 *
 * Nota de Segurança (MH-SEC-003 / MH-SEC-004):
 * Todos os dados, CPFs, tokens e recursos são 100% sintéticos e sanitizados.
 */

export const QA009_SYNTHETIC_ACTORS = {
  anonymous: {
    id: null,
    label: "Visitante Anônimo",
    cpf: null,
    token: null,
    active: false,
    mustChangePassword: false,
    roles: [],
  },
  alunoVinculado: {
    id: "USR-QA009-ALUNO-01",
    label: "Aluno Vinculado ao PRJ-PI-01 e Designado Avaliador de PRJ-PI-02",
    cpf: "000.000.009-01",
    password: "[SYNTHETIC_PASS_QA009_ALUNO_01]",
    token: "AT_OPAQUE_QA009_ALUNO_01",
    active: true,
    mustChangePassword: false,
    roles: ["ALUNO"],
    linkedProjects: ["PRJ-PI-01", "PRJ-EXT-01"],
    assignedPeerReviewProjects: ["PRJ-PI-02"],
  },
  alunoOutroProjeto: {
    id: "USR-QA009-ALUNO-02",
    label: "Aluno Vinculado apenas ao PRJ-PI-02 (Sem vínculo com PRJ-PI-01)",
    cpf: "000.000.009-02",
    password: "[SYNTHETIC_PASS_QA009_ALUNO_02]",
    token: "AT_OPAQUE_QA009_ALUNO_02",
    active: true,
    mustChangePassword: false,
    roles: ["ALUNO"],
    linkedProjects: ["PRJ-PI-02"],
    assignedPeerReviewProjects: [],
  },
  docenteResponsavel: {
    id: "USR-QA009-DOCENTE-01",
    label: "Docente Responsável por PRJ-PI-01, PRJ-PI-DRAFT-03 e PRJ-EXT-01",
    cpf: "000.000.009-03",
    password: "[SYNTHETIC_PASS_QA009_DOCENTE_01]",
    token: "AT_OPAQUE_QA009_DOCENTE_01",
    active: true,
    mustChangePassword: false,
    roles: ["DOCENTE"],
    ownedProjects: ["PRJ-PI-01", "PRJ-PI-DRAFT-03", "PRJ-EXT-01"],
  },
  docenteOutroEscopo: {
    id: "USR-QA009-DOCENTE-02",
    label: "Docente Responsável apenas por PRJ-PI-02 (Fora do escopo de PRJ-PI-01)",
    cpf: "000.000.009-04",
    password: "[SYNTHETIC_PASS_QA009_DOCENTE_02]",
    token: "AT_OPAQUE_QA009_DOCENTE_02",
    active: true,
    mustChangePassword: false,
    roles: ["DOCENTE"],
    ownedProjects: ["PRJ-PI-02"],
  },
  coordenacao: {
    id: "USR-QA009-COORD-01",
    label: "Coordenação (Sem responsabilidade docente direta em PRJ-PI-01)",
    cpf: "000.000.009-05",
    password: "[SYNTHETIC_PASS_QA009_COORD_01]",
    token: "AT_OPAQUE_QA009_COORD_01",
    active: true,
    mustChangePassword: false,
    roles: ["COORDENACAO"],
    ownedProjects: [],
  },
  multiPerfilDocenteCoord: {
    id: "USR-QA009-MULTI-01",
    label: "Multi-perfil (Docente Responsável por PRJ-PI-01 + Coordenação no mesmo CPF)",
    cpf: "000.000.009-06",
    password: "[SYNTHETIC_PASS_QA009_MULTI_01]",
    token: "AT_OPAQUE_QA009_MULTI_01",
    active: true,
    mustChangePassword: false,
    roles: ["DOCENTE", "COORDENACAO"],
    ownedProjects: ["PRJ-PI-01", "PRJ-EXT-01"],
  },
  adminNaoAprovado: {
    id: "USR-QA009-ADMIN-01",
    label: "Papel Técnico Administrador (Não aprovado no caderno -> Deny by default)",
    cpf: "000.000.009-07",
    password: "[SYNTHETIC_PASS_QA009_ADMIN_01]",
    token: "AT_OPAQUE_QA009_ADMIN_01",
    active: true,
    mustChangePassword: false,
    roles: ["ADMINISTRADOR"],
    ownedProjects: [],
  },
  primeiroAcessoPendente: {
    id: "USR-QA009-TEMP-01",
    label: "Aluno com Senha Temporária / Redefinida (mustChangePassword=true)",
    cpf: "000.000.009-08",
    password: "[SYNTHETIC_TEMP_PASS_QA009]",
    token: "AT_OPAQUE_QA009_TEMP_01",
    active: true,
    mustChangePassword: true,
    roles: ["ALUNO"],
    linkedProjects: ["PRJ-PI-01"],
  },
  contaInativa: {
    id: "USR-QA009-INATIVO-01",
    label: "Conta Inativada (active=false)",
    cpf: "000.000.009-09",
    password: "[SYNTHETIC_PASS_QA009_INATIVO]",
    token: "AT_OPAQUE_QA009_INATIVO_01",
    active: false,
    mustChangePassword: false,
    roles: ["ALUNO"],
    linkedProjects: ["PRJ-PI-01"],
  },
};

export const QA009_SYNTHETIC_RESOURCES = {
  projects: {
    "PRJ-PI-01": {
      id: "PRJ-PI-01",
      type: "PI",
      status: "PUBLISHED",
      publicTitle: "Sistema IoT de Eficiência Energética Industrial",
      internalNotesSecret: "[INTERNAL_ONLY_SECRET_NOTES_PRJ_01]",
      ownerDocenteId: "USR-QA009-DOCENTE-01",
      coOwners: ["USR-QA009-MULTI-01"],
      participants: ["USR-QA009-ALUNO-01"],
      enrollmentWindowOpen: true,
      evaluationFinalized: false,
      photoAuthorized: true,
      photos: [
        { id: "PHOTO-01", url: "/public/media/prj-pi-01-prototipo.jpg", authorized: true },
        { id: "PHOTO-02-UNAUTH", url: "/internal/media/prj-pi-01-rascunho.jpg", authorized: false },
      ],
      internalFiles: [
        { id: "FILE-INT-01", name: "arquitetura-interna-pi01.pdf", classification: "INTERNAL_PROJECT" },
      ],
      gradesByStudent: {
        "USR-QA009-ALUNO-01": { finalGrade: 9.5, feedback: "Excelente entrega técnica." },
      },
    },
    "PRJ-PI-02": {
      id: "PRJ-PI-02",
      type: "PI",
      status: "PUBLISHED",
      publicTitle: "Automação de Linha de Montagem com Visão Computacional",
      internalNotesSecret: "[INTERNAL_ONLY_SECRET_NOTES_PRJ_02]",
      ownerDocenteId: "USR-QA009-DOCENTE-02",
      coOwners: [],
      participants: ["USR-QA009-ALUNO-02"],
      enrollmentWindowOpen: true,
      evaluationFinalized: false,
      photoAuthorized: false,
      photos: [{ id: "PHOTO-03-UNAUTH", url: "/internal/media/prj-pi-02-equipe.jpg", authorized: false }],
      internalFiles: [
        { id: "FILE-INT-02", name: "relatorio-restrito-pi02.pdf", classification: "INTERNAL_PROJECT" },
      ],
      gradesByStudent: {
        "USR-QA009-ALUNO-02": { finalGrade: 8.8, feedback: "Bom desempenho no sprint." },
      },
    },
    "PRJ-PI-DRAFT-03": {
      id: "PRJ-PI-DRAFT-03",
      type: "PI",
      status: "DRAFT",
      publicTitle: "[CONFIDENTIAL_DRAFT_TITLE_DO_NOT_LEAK]",
      internalNotesSecret: "[DRAFT_SECRET_SPECIFICATION_03]",
      ownerDocenteId: "USR-QA009-DOCENTE-01",
      coOwners: [],
      participants: [],
      enrollmentWindowOpen: false,
      evaluationFinalized: false,
      photoAuthorized: false,
      photos: [],
      internalFiles: [],
      gradesByStudent: {},
    },
    "PRJ-EXT-01": {
      id: "PRJ-EXT-01",
      type: "EXT",
      status: "PUBLISHED",
      publicTitle: "Oficina de Robótica Educacional para Escolas Públicas",
      ownerDocenteId: "USR-QA009-DOCENTE-01",
      coOwners: ["USR-QA009-MULTI-01"],
      participants: ["USR-QA009-ALUNO-01"],
      enrollmentWindowOpen: true,
      hoursByStudent: {
        "USR-QA009-ALUNO-01": { submittedHours: 20, validatedHours: 16, status: "VALIDATED" },
      },
    },
  },
};

/**
 * Cria o avaliador server-side determinístico de autorização RBAC + ABAC (escopo/recurso)
 * para validação das regras normativas de SPEC-AUTH-003 e seus impactos em
 * SPEC-PI-001..004, SPEC-EXT-001..003 e SPEC-PORTAL-001..002.
 */
export function createRbacScopeAuthorizationHarness() {
  const actorsByToken = new Map(
    Object.values(QA009_SYNTHETIC_ACTORS)
      .filter((a) => a.token)
      .map((a) => [a.token, a])
  );

  const projects = structuredClone(QA009_SYNTHETIC_RESOURCES.projects);
  const auditTrail = [];

  function maskCpf(cpf) {
    if (!cpf || typeof cpf !== "string") return null;
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return "***.***.***-**";
    return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  function recordAudit({ actor, method, path, resourceId = null, decision, status, code }) {
    auditTrail.push({
      timestamp: "2026-11-01T17:40:00.000Z",
      actorId: actor?.id || "ANONYMOUS",
      actorRoles: actor?.roles ? [...actor.roles] : [],
      cpfMasked: maskCpf(actor?.cpf),
      token: actor?.token ? "[REDACTED]" : null,
      method,
      path,
      resourceId,
      decision,
      status,
      code,
    });
  }

  function buildError(actor, req, status, code, message) {
    recordAudit({
      actor,
      method: req.method,
      path: req.path,
      resourceId: req.resourceId || null,
      decision: "DENY",
      status,
      code,
    });
    return {
      status,
      decision: "DENY",
      body: {
        code,
        message,
        path: req.path,
      },
    };
  }

  function buildSuccess(actor, req, status, code, data) {
    recordAudit({
      actor,
      method: req.method,
      path: req.path,
      resourceId: req.resourceId || null,
      decision: "ALLOW",
      status,
      code,
    });
    return {
      status,
      decision: "ALLOW",
      body: {
        code,
        data,
      },
    };
  }

  function isProjectOwner(actor, project) {
    if (!actor || !project || !actor.roles.includes("DOCENTE")) return false;
    return project.ownerDocenteId === actor.id || (project.coOwners || []).includes(actor.id);
  }

  function isProjectParticipant(actor, project) {
    if (!actor || !project || !actor.roles.includes("ALUNO")) return false;
    return (project.participants || []).includes(actor.id);
  }

  /**
   * Processa uma requisição HTTP simulada aplicando estritamente autorização server-side.
   * Qualquer header de cliente tentando forçar perfil (ex.: headers["x-client-role"]) é ignorado.
   */
  function request(req) {
    const { method, path, token = null, resourceId = null, body = {} } = req;

    // 1. Rotas Públicas do Portal (SPEC-PORTAL-001 / SPEC-PORTAL-002)
    if (path.startsWith("/api/v1/portal/")) {
      const actor = token ? actorsByToken.get(token) || null : null;

      // Bloqueia qualquer tentativa de mutação ou acesso a sub-recurso interno pelo Portal Público
      if (method !== "GET" || path.endsWith("/internal-files") || path.endsWith("/grades")) {
        return buildError(
          actor,
          req,
          403,
          "PORTAL_READONLY_PUBLIC_SCOPE",
          "O Portal Público permite apenas leitura de dados públicos autorizados."
        );
      }

      if (path === "/api/v1/portal/projects") {
        const publicList = Object.values(projects)
          .filter((p) => p.status === "PUBLISHED")
          .map((p) => ({
            id: p.id,
            type: p.type,
            publicTitle: p.publicTitle,
            photos: (p.photos || []).filter((ph) => p.photoAuthorized && ph.authorized).map((ph) => ph.url),
          }));
        return buildSuccess(actor, req, 200, "PORTAL_PUBLIC_LIST_OK", { projects: publicList });
      }

      if (path.startsWith("/api/v1/portal/projects/")) {
        const proj = projects[resourceId];
        // Projetos em rascunho (DRAFT) ou inexistentes não podem ser revelados no Portal Público (AC-PORTAL-001-02 / AC-PI-001-02)
        if (!proj || proj.status !== "PUBLISHED") {
          return buildError(
            actor,
            req,
            404,
            "PORTAL_PROJECT_NOT_PUBLIC",
            "Projeto não encontrado ou não publicado no catálogo público."
          );
        }

        return buildSuccess(actor, req, 200, "PORTAL_PUBLIC_DETAIL_OK", {
          id: proj.id,
          type: proj.type,
          publicTitle: proj.publicTitle,
          photos: (proj.photos || []).filter((ph) => proj.photoAuthorized && ph.authorized).map((ph) => ph.url),
        });
      }
    }

    // 2. Autenticação Server-Side Obrigatória para Rotas Protegidas (SPEC-AUTH-001 / SPEC-AUTH-002)
    const actor = token ? actorsByToken.get(token) : null;
    if (!actor || !actor.active) {
      return buildError(
        actor,
        req,
        401,
        "UNAUTHENTICATED_OR_INACTIVE",
        "Sessão ausente, token inválido ou conta inativa."
      );
    }

    // 3. Guarda de Troca Obrigatória de Senha Temporária/Redefinida (AC-AUTH-001-04a)
    if (actor.mustChangePassword && path !== "/api/v1/auth/password/change") {
      return buildError(
        actor,
        req,
        403,
        "PASSWORD_CHANGE_REQUIRED",
        "Necessário definir nova senha antes de acessar rotas ou recursos protegidos."
      );
    }

    // 4. Negação por padrão para papéis não aprovados no Caderno (AC-AUTH-003-06)
    const approvedRoles = ["ALUNO", "DOCENTE", "COORDENACAO"];
    const hasApprovedRole = actor.roles.some((r) => approvedRoles.includes(r));
    if (!hasApprovedRole) {
      return buildError(
        actor,
        req,
        403,
        "FORBIDDEN_UNAPPROVED_ROLE",
        "Negação por padrão: perfil sem atribuição normativa aprovada."
      );
    }

    // 5. Rotas Removidas por Decisão de Produto (SPEC-PI-001 convites / SPEC-PI-002 bancas / SPEC-AUTH-001 autocadastro)
    if (
      path.endsWith("/invitations") ||
      path.startsWith("/api/v1/pi/bancas") ||
      path === "/api/v1/auth/self-register"
    ) {
      return buildError(
        actor,
        req,
        403,
        "FEATURE_FORBIDDEN_BY_SPEC",
        "Operação proibida pela especificação (fluxo de convites individuais, bancas ou autocadastro desabilitado)."
      );
    }

    // =========================================================================
    // 6. DOMÍNIO AUTH & GESTÃO DE CONTAS / TURMAS (SPEC-AUTH-001 / SPEC-AUTH-003)
    // =========================================================================
    if (
      path === "/api/v1/users/import-csv" ||
      path === "/api/v1/users/roles" ||
      path === "/api/v1/users/inactivate" ||
      path === "/api/v1/classes/inactivate"
    ) {
      if (!actor.roles.includes("COORDENACAO")) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_ROLE_COORDENACAO_ONLY",
          "Operação exclusiva do perfil Coordenação."
        );
      }
      return buildSuccess(actor, req, 200, "COORDENACAO_ADMIN_ACTION_OK", { executedBy: actor.id });
    }

    if (path === "/api/v1/users/reset-password") {
      if (!actor.roles.includes("COORDENACAO") && !actor.roles.includes("DOCENTE")) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PASSWORD_RESET",
          "Apenas Docente ou Coordenação podem redefinir senha de usuário."
        );
      }
      return buildSuccess(actor, req, 200, "PASSWORD_RESET_ISSUED", { mustChangePassword: true });
    }

    // =========================================================================
    // 7. DOMÍNIO PROJETOS INTEGRADORES — SPEC-PI-001, PI-002, PI-003, PI-004
    // =========================================================================

    // 7.1 Criar proposta de projeto PI (AC-PI-001-01 / AC-AUTH-003-02)
    if (method === "POST" && path === "/api/v1/pi/projects") {
      if (!actor.roles.includes("DOCENTE")) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_ROLE_DOCENTE_ONLY",
          "Apenas Docentes podem criar propostas de Projetos Integradores."
        );
      }
      return buildSuccess(actor, req, 201, "PI_PROJECT_CREATED", {
        ownerDocenteId: actor.id,
        status: body.status || "DRAFT",
      });
    }

    // 7.2 Editar, Reabrir ou Arquivar projeto PI (AC-PI-001-05..08 / AC-AUTH-003-03)
    if (
      (method === "PATCH" || method === "POST") &&
      (path === `/api/v1/pi/projects/${resourceId}` ||
        path === `/api/v1/pi/projects/${resourceId}/reopen` ||
        path === `/api/v1/pi/projects/${resourceId}/archive`)
    ) {
      const proj = projects[resourceId];
      if (!actor.roles.includes("DOCENTE")) {
        return buildError(actor, req, 403, "FORBIDDEN_ROLE_DOCENTE_ONLY", "Ação restrita ao perfil Docente.");
      }
      if (!proj || !isProjectOwner(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PROJECT_SCOPE",
          "Acesso negado: você não é o docente responsável por este projeto."
        );
      }
      return buildSuccess(actor, req, 200, "PI_PROJECT_MUTATED", { projectId: proj.id });
    }

    // 7.3 Leitura de projeto PI em rascunho (AC-PI-001-02 / AC-PI-001-07)
    if (method === "GET" && path === `/api/v1/pi/projects/${resourceId}`) {
      const proj = projects[resourceId];
      if (!proj) {
        return buildError(actor, req, 404, "PROJECT_NOT_FOUND", "Projeto não encontrado.");
      }
      if (proj.status === "DRAFT" && !isProjectOwner(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_DRAFT_PROJECT_READ",
          "Projetos em rascunho são visíveis apenas ao docente responsável."
        );
      }
      return buildSuccess(actor, req, 200, "PI_PROJECT_READ_OK", {
        id: proj.id,
        status: proj.status,
        publicTitle: proj.publicTitle,
      });
    }

    // 7.4 Solicitar participação em projeto PI (AC-PI-001-09 / AC-AUTH-003-05)
    if (method === "POST" && path === `/api/v1/pi/projects/${resourceId}/enrollments`) {
      const proj = projects[resourceId];
      if (!actor.roles.includes("ALUNO")) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_ROLE_ALUNO_ONLY",
          "Apenas Alunos podem solicitar participação em projetos."
        );
      }
      if (!proj || proj.status !== "PUBLISHED" || !proj.enrollmentWindowOpen) {
        return buildError(
          actor,
          req,
          403,
          "ENROLLMENT_NOT_AVAILABLE",
          "Projeto não está disponível para inscrição na janela atual."
        );
      }
      return buildSuccess(actor, req, 201, "ENROLLMENT_REQUESTED", {
        projectId: proj.id,
        studentId: actor.id,
        status: "PENDING_APPROVAL",
      });
    }

    // 7.5 Aprovar/negar solicitação de participação em projeto PI (AC-PI-001-10 / AC-AUTH-003-03)
    if (method === "PATCH" && path === `/api/v1/pi/projects/${resourceId}/enrollments/decide`) {
      const proj = projects[resourceId];
      if (!actor.roles.includes("DOCENTE")) {
        return buildError(actor, req, 403, "FORBIDDEN_ROLE_DOCENTE_ONLY", "Ação restrita ao perfil Docente.");
      }
      if (!proj || !isProjectOwner(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PROJECT_SCOPE",
          "Apenas o docente responsável pelo projeto pode aprovar ou negar solicitações."
        );
      }
      return buildSuccess(actor, req, 200, "ENROLLMENT_DECIDED", {
        projectId: proj.id,
        decision: body.decision || "APPROVED",
      });
    }

    // 7.6 Remover participante do projeto PI com justificativa obrigatória (AC-AUTH-003-04 / AC-PI-001-13)
    if (method === "DELETE" && path === `/api/v1/pi/projects/${resourceId}/participants`) {
      const proj = projects[resourceId];
      if (!actor.roles.includes("DOCENTE")) {
        return buildError(actor, req, 403, "FORBIDDEN_ROLE_DOCENTE_ONLY", "Ação restrita ao perfil Docente.");
      }
      if (!proj || !isProjectOwner(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PROJECT_SCOPE",
          "Apenas o docente responsável pode remover participantes deste projeto."
        );
      }
      if (!body.justification || typeof body.justification !== "string" || !body.justification.trim()) {
        return buildError(
          actor,
          req,
          422,
          "JUSTIFICATION_REQUIRED",
          "A remoção de participante exige justificativa obrigatória registrada."
        );
      }
      return buildSuccess(actor, req, 200, "PARTICIPANT_REMOVED", {
        projectId: proj.id,
        removedStudentId: body.studentId,
      });
    }

    // 7.7 Submeter entregável / etapa de acompanhamento de PI (SPEC-PI-001 / SPEC-PI-002)
    if (method === "POST" && path === `/api/v1/pi/projects/${resourceId}/deliverables`) {
      const proj = projects[resourceId];
      if (!actor.roles.includes("ALUNO")) {
        return buildError(actor, req, 403, "FORBIDDEN_ROLE_ALUNO_ONLY", "Apenas Alunos enviam entregáveis.");
      }
      if (!proj || !isProjectParticipant(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PROJECT_PARTICIPANT_ONLY",
          "Aluno não está vinculado a este projeto para envio de entregáveis."
        );
      }
      if (proj.evaluationFinalized) {
        return buildError(
          actor,
          req,
          403,
          "EVALUATION_ALREADY_CLOSED",
          "Não é permitido alterar entregáveis após finalização da avaliação."
        );
      }
      return buildSuccess(actor, req, 201, "DELIVERABLE_SUBMITTED", { projectId: proj.id });
    }

    // 7.8 Rubricas, Pesos, Fechamento e Reabertura de Avaliação PI (SPEC-PI-003: AC-PI-003-01..03)
    if (
      method === "POST" &&
      (path === `/api/v1/pi/projects/${resourceId}/rubric` ||
        path === `/api/v1/pi/projects/${resourceId}/evaluations/finalize` ||
        path === `/api/v1/pi/projects/${resourceId}/evaluations/reopen`)
    ) {
      const proj = projects[resourceId];
      if (!actor.roles.includes("DOCENTE")) {
        return buildError(actor, req, 403, "FORBIDDEN_ROLE_DOCENTE_ONLY", "Ação restrita ao perfil Docente.");
      }
      if (!proj || !isProjectOwner(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PROJECT_SCOPE",
          "Apenas o docente responsável pode gerir rubricas e avaliações deste projeto."
        );
      }
      return buildSuccess(actor, req, 200, "PI_EVALUATION_MANAGED", { projectId: proj.id });
    }

    // 7.9 Atribuir avaliadores discentes de PI (SPEC-PI-003: AC-PI-003-06 — exclusivo Coordenação)
    if (method === "POST" && path === "/api/v1/pi/peer-evaluations/assign") {
      if (!actor.roles.includes("COORDENACAO")) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_ROLE_COORDENACAO_ONLY",
          "Apenas a Coordenação pode atribuir quais alunos avaliam cada projeto e a data."
        );
      }
      return buildSuccess(actor, req, 200, "PEER_EVALUATOR_ASSIGNED", {
        evaluatorStudentId: body.studentId,
        targetProjectId: body.projectId,
      });
    }

    // 7.10 Submeter avaliação entre pares de PI (SPEC-PI-003: AC-PI-003-06)
    if (method === "POST" && path === `/api/v1/pi/projects/${resourceId}/peer-evaluations`) {
      if (!actor.roles.includes("ALUNO")) {
        return buildError(actor, req, 403, "FORBIDDEN_ROLE_ALUNO_ONLY", "Ação restrita a Aluno avaliador.");
      }
      const assigned = (actor.assignedPeerReviewProjects || []).includes(resourceId);
      if (!assigned) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PEER_REVIEW_NOT_ASSIGNED",
          "Aluno não foi designado pela Coordenação para avaliar este projeto."
        );
      }
      return buildSuccess(actor, req, 201, "PEER_EVALUATION_RECORDED", { projectId: resourceId });
    }

    // 7.11 Consultar notas individuais de PI (SPEC-PI-003: AC-PI-003-04)
    if (method === "GET" && path === `/api/v1/pi/projects/${resourceId}/grades`) {
      const proj = projects[resourceId];
      const targetStudentId = body.studentId || actor.id;
      const isOwnStudentGrade =
        actor.roles.includes("ALUNO") &&
        isProjectParticipant(actor, proj) &&
        targetStudentId === actor.id;
      const isResponsibleDocente = isProjectOwner(actor, proj);
      const isCoord = actor.roles.includes("COORDENACAO");

      if (!isOwnStudentGrade && !isResponsibleDocente && !isCoord) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_GRADE_READ",
          "Acesso negado às notas individuais solicitadas."
        );
      }
      return buildSuccess(actor, req, 200, "GRADE_READ_OK", {
        projectId: resourceId,
        studentId: targetStudentId,
        grade: proj?.gradesByStudent?.[targetStudentId] || null,
      });
    }

    // 7.12 Consultar arquivos internos de projeto PI (SPEC-PI-004: AC-PI-004-01)
    if (method === "GET" && path === `/api/v1/pi/projects/${resourceId}/files/internal`) {
      const proj = projects[resourceId];
      const allowed =
        isProjectParticipant(actor, proj) ||
        isProjectOwner(actor, proj) ||
        actor.roles.includes("COORDENACAO");

      if (!allowed) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_INTERNAL_FILES_READ",
          "Acesso negado aos arquivos internos deste projeto."
        );
      }
      return buildSuccess(actor, req, 200, "INTERNAL_FILES_READ_OK", {
        projectId: proj.id,
        files: proj.internalFiles,
      });
    }

    // 7.13 Autorizar publicação de fotos do projeto PI (SPEC-PI-004: AC-PI-004-04)
    if (method === "PATCH" && path === `/api/v1/pi/projects/${resourceId}/photos/authorization`) {
      const proj = projects[resourceId];
      if (!isProjectOwner(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_PHOTO_AUTHORIZATION",
          "Apenas o docente responsável pode autorizar a publicação de fotos do projeto."
        );
      }
      return buildSuccess(actor, req, 200, "PHOTO_PUBLICATION_AUTHORIZED", {
        projectId: proj.id,
        photoAuthorized: Boolean(body.photoAuthorized),
      });
    }

    // =========================================================================
    // 8. DOMÍNIO EXTENSÃO — SPEC-EXT-001, SPEC-EXT-002 e SPEC-EXT-003
    // =========================================================================

    // 8.1 Definir/alterar calendário de janelas de inscrição em UTC-3 (SPEC-EXT-001)
    if (method === "PUT" && path === "/api/v1/ext/enrollment-windows") {
      if (!actor.roles.includes("COORDENACAO")) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_ROLE_COORDENACAO_ONLY",
          "Apenas a Coordenação pode definir períodos globais de inscrição (UTC-3)."
        );
      }
      return buildSuccess(actor, req, 200, "EXT_WINDOW_UPDATED", { timezone: "America/Sao_Paulo (UTC-3)" });
    }

    // 8.2 Publicar avisos de Extensão (SPEC-EXT-001: global pela Coordenação ou de projeto pelo Docente responsável)
    if (method === "POST" && path === "/api/v1/ext/notices") {
      if (actor.roles.includes("COORDENACAO") && !resourceId) {
        return buildSuccess(actor, req, 201, "EXT_GLOBAL_NOTICE_PUBLISHED", { scope: "GLOBAL" });
      }
      const proj = resourceId ? projects[resourceId] : null;
      if (actor.roles.includes("DOCENTE") && proj && isProjectOwner(actor, proj)) {
        return buildSuccess(actor, req, 201, "EXT_PROJECT_NOTICE_PUBLISHED", {
          scope: "PROJECT",
          projectId: proj.id,
        });
      }
      return buildError(
        actor,
        req,
        403,
        "FORBIDDEN_NOTICE_PUBLISH",
        "Sem permissão para publicar aviso no escopo informado."
      );
    }

    // 8.3 Submeter atividade/horas de Extensão pelo Aluno vinculado (SPEC-EXT-002: AC-EXT-002-01)
    if (method === "POST" && path === `/api/v1/ext/projects/${resourceId}/activities`) {
      const proj = projects[resourceId];
      if (!actor.roles.includes("ALUNO") || !isProjectParticipant(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_EXT_ACTIVITY_SUBMISSION",
          "Apenas alunos vinculados ao projeto de extensão podem submeter atividades e horas."
        );
      }
      return buildSuccess(actor, req, 201, "EXT_ACTIVITY_SUBMITTED", {
        projectId: proj.id,
        studentId: actor.id,
      });
    }

    // 8.4 Validar/alterar horas e prazos de Extensão (SPEC-EXT-002: AC-EXT-002-03..04 — exclusivo Docente Responsável)
    if (method === "PATCH" && path === `/api/v1/ext/projects/${resourceId}/hours/validate`) {
      const proj = projects[resourceId];
      if (!isProjectOwner(actor, proj)) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_EXT_HOURS_VALIDATION",
          "Apenas o docente responsável pelo projeto pode validar ou alterar horas e prazos."
        );
      }
      return buildSuccess(actor, req, 200, "EXT_HOURS_VALIDATED", {
        projectId: proj.id,
        validatedBy: actor.id,
      });
    }

    // 8.5 Consultar relatório consolidado de carga horária de Extensão (SPEC-EXT-003)
    if (method === "GET" && path === `/api/v1/ext/projects/${resourceId}/hours/report`) {
      const proj = projects[resourceId];
      const targetStudentId = body.studentId || actor.id;
      const isOwnStudent =
        actor.roles.includes("ALUNO") &&
        isProjectParticipant(actor, proj) &&
        targetStudentId === actor.id;
      const isOwner = isProjectOwner(actor, proj);
      const isCoord = actor.roles.includes("COORDENACAO");

      if (!isOwnStudent && !isOwner && !isCoord) {
        return buildError(
          actor,
          req,
          403,
          "FORBIDDEN_EXT_REPORT_SCOPE",
          "Acesso negado ao relatório de horas fora do seu escopo."
        );
      }
      return buildSuccess(actor, req, 200, "EXT_HOURS_REPORT_OK", {
        projectId: resourceId,
        studentId: targetStudentId,
        summary: proj?.hoursByStudent?.[targetStudentId] || null,
      });
    }

    // 9. Fallback: Negação por padrão para qualquer rota ou método não mapeado (AC-AUTH-003-06)
    return buildError(
      actor,
      req,
      403,
      "DEFAULT_DENY_UNMAPPED_ACTION",
      "Negação por padrão (AC-AUTH-003-06): rota ou ação sem permissão explícita."
    );
  }

  function getAuditTrail() {
    return [...auditTrail];
  }

  return { request, getAuditTrail };
}

test("QA-009 | CT-QA009-01 (SPEC-AUTH-003): isolamento vertical de papéis, acúmulo no mesmo CPF (Multi-perfil) e negação por padrão (Admin não aprovado, Primeiro Acesso e Conta Inativa)", () => {
  const api = createRbacScopeAuthorizationHarness();

  // 1. Coordenação executa importação CSV e inativação (ALLOW 200)
  const coordCsv = api.request({
    method: "POST",
    path: "/api/v1/users/import-csv",
    token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
  });
  assert.equal(coordCsv.status, 200);
  assert.equal(coordCsv.decision, "ALLOW");

  // 2. Docente e Aluno tentam importar CSV ou inativar turma -> DENY 403
  for (const actor of [QA009_SYNTHETIC_ACTORS.docenteResponsavel, QA009_SYNTHETIC_ACTORS.alunoVinculado]) {
    const deniedCsv = api.request({
      method: "POST",
      path: "/api/v1/users/import-csv",
      token: actor.token,
    });
    assert.equal(deniedCsv.status, 403);
    assert.equal(deniedCsv.decision, "DENY");
    assert.equal(deniedCsv.body.code, "FORBIDDEN_ROLE_COORDENACAO_ONLY");
  }

  // 3. Multi-perfil (Docente + Coordenação no mesmo CPF — AC-AUTH-003-01):
  // acumula permissões de Coordenação e de Docente responsável por PRJ-PI-01, mas é negado em rota exclusiva de Aluno
  const multiCoordOk = api.request({
    method: "POST",
    path: "/api/v1/users/import-csv",
    token: QA009_SYNTHETIC_ACTORS.multiPerfilDocenteCoord.token,
  });
  assert.equal(multiCoordOk.status, 200);

  const multiDocenteOwnOk = api.request({
    method: "PATCH",
    path: "/api/v1/pi/projects/PRJ-PI-01",
    resourceId: "PRJ-PI-01",
    token: QA009_SYNTHETIC_ACTORS.multiPerfilDocenteCoord.token,
  });
  assert.equal(multiDocenteOwnOk.status, 200);

  const multiDocenteForeignDeny = api.request({
    method: "PATCH",
    path: "/api/v1/pi/projects/PRJ-PI-02",
    resourceId: "PRJ-PI-02",
    token: QA009_SYNTHETIC_ACTORS.multiPerfilDocenteCoord.token,
  });
  assert.equal(multiDocenteForeignDeny.status, 403);
  assert.equal(multiDocenteForeignDeny.body.code, "FORBIDDEN_PROJECT_SCOPE");

  const multiAsStudentDeny = api.request({
    method: "POST",
    path: "/api/v1/pi/projects/PRJ-PI-01/deliverables",
    resourceId: "PRJ-PI-01",
    token: QA009_SYNTHETIC_ACTORS.multiPerfilDocenteCoord.token,
  });
  assert.equal(multiAsStudentDeny.status, 403);

  // 4. Papel Técnico Administrador sem escopo aprovado no caderno -> Deny by Default (AC-AUTH-003-06)
  const unapprovedAdmin = api.request({
    method: "POST",
    path: "/api/v1/users/import-csv",
    token: QA009_SYNTHETIC_ACTORS.adminNaoAprovado.token,
  });
  assert.equal(unapprovedAdmin.status, 403);
  assert.equal(unapprovedAdmin.body.code, "FORBIDDEN_UNAPPROVED_ROLE");

  // 5. Primeiro acesso / senha redefinida bloqueia rotas de negócio com 403 PASSWORD_CHANGE_REQUIRED (AC-AUTH-001-04a)
  const tempPassBlocked = api.request({
    method: "GET",
    path: "/api/v1/pi/projects/PRJ-PI-01/files/internal",
    resourceId: "PRJ-PI-01",
    token: QA009_SYNTHETIC_ACTORS.primeiroAcessoPendente.token,
  });
  assert.equal(tempPassBlocked.status, 403);
  assert.equal(tempPassBlocked.body.code, "PASSWORD_CHANGE_REQUIRED");

  // 6. Conta inativa ou sem token -> 401 UNAUTHENTICATED_OR_INACTIVE
  const inactiveBlocked = api.request({
    method: "GET",
    path: "/api/v1/pi/projects/PRJ-PI-01",
    resourceId: "PRJ-PI-01",
    token: QA009_SYNTHETIC_ACTORS.contaInativa.token,
  });
  assert.equal(inactiveBlocked.status, 401);
});

test("QA-009 | CT-QA009-02 (SPEC-PI-001 e SPEC-PI-002): ciclo de propostas, rascunho privado, matrícula, remoção com justificativa obrigatória e bloqueio de convites/bancas", () => {
  const api = createRbacScopeAuthorizationHarness();

  // 1. Docente cria proposta (ALLOW 201); Aluno e Coordenação pura tentam criar -> DENY 403
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
      body: { status: "DRAFT" },
    }).status,
    201
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects",
      token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
    }).status,
    403
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects",
      token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
    }).status,
    403
  );

  // 2. Projeto em rascunho (PRJ-PI-DRAFT-03) visível apenas ao Docente responsável (AC-PI-001-02)
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/pi/projects/PRJ-PI-DRAFT-03",
      resourceId: "PRJ-PI-DRAFT-03",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    200
  );
  for (const unauthorizedActor of [
    QA009_SYNTHETIC_ACTORS.docenteOutroEscopo,
    QA009_SYNTHETIC_ACTORS.alunoVinculado,
    QA009_SYNTHETIC_ACTORS.coordenacao,
  ]) {
    const draftDeny = api.request({
      method: "GET",
      path: "/api/v1/pi/projects/PRJ-PI-DRAFT-03",
      resourceId: "PRJ-PI-DRAFT-03",
      token: unauthorizedActor.token,
    });
    assert.equal(draftDeny.status, 403);
    assert.equal(draftDeny.body.code, "FORBIDDEN_DRAFT_PROJECT_READ");
  }

  // 3. Solicitação de participação pelo Aluno em projeto publicado (ALLOW 201) vs projeto rascunho (DENY 403)
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-01/enrollments",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
    }).status,
    201
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-DRAFT-03/enrollments",
      resourceId: "PRJ-PI-DRAFT-03",
      token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
    }).status,
    403
  );

  // 4. Aprovação de matrícula e remoção de participante:
  // Docente responsável aprova (200); outro Docente ou Coordenação recebe 403
  assert.equal(
    api.request({
      method: "PATCH",
      path: "/api/v1/pi/projects/PRJ-PI-01/enrollments/decide",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
      body: { decision: "APPROVED" },
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "PATCH",
      path: "/api/v1/pi/projects/PRJ-PI-01/enrollments/decide",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteOutroEscopo.token,
    }).status,
    403
  );

  // Remoção sem justificativa -> 422 JUSTIFICATION_REQUIRED (AC-AUTH-003-04 / AC-PI-001-13)
  const removeNoJust = api.request({
    method: "DELETE",
    path: "/api/v1/pi/projects/PRJ-PI-01/participants",
    resourceId: "PRJ-PI-01",
    token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    body: { studentId: "USR-QA009-ALUNO-01", justification: "   " },
  });
  assert.equal(removeNoJust.status, 422);
  assert.equal(removeNoJust.body.code, "JUSTIFICATION_REQUIRED");

  // Remoção com justificativa pelo Docente responsável -> ALLOW 200
  const removeWithJust = api.request({
    method: "DELETE",
    path: "/api/v1/pi/projects/PRJ-PI-01/participants",
    resourceId: "PRJ-PI-01",
    token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    body: {
      studentId: "USR-QA009-ALUNO-01",
      justification: "Transferência de turma solicitada pela secretaria acadêmica.",
    },
  });
  assert.equal(removeWithJust.status, 200);

  // 5. Fluxos proibidos por SPEC: convite individual (SPEC-PI-001) e agendamento de banca (SPEC-PI-002) -> 403
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-01/invitations",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    403
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/bancas/schedule",
      token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
    }).status,
    403
  );
});

test("QA-009 | CT-QA009-03 (SPEC-PI-003 e SPEC-PI-004): rubricas, avaliações entre pares, sigilo de notas individuais, arquivos internos e autorização de fotos", () => {
  const api = createRbacScopeAuthorizationHarness();

  // 1. Criar rubrica e finalizar avaliação em PRJ-PI-01: ALLOW para Docente Responsável; DENY para outro Docente, Coordenação e Aluno
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-01/rubric",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-01/evaluations/finalize",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteOutroEscopo.token,
    }).status,
    403
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-01/evaluations/finalize",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
    }).status,
    403
  );

  // 2. Atribuir avaliador discente: ALLOW apenas para Coordenação (AC-PI-003-06)
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/peer-evaluations/assign",
      token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
      body: { studentId: "USR-QA009-ALUNO-01", projectId: "PRJ-PI-02" },
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/peer-evaluations/assign",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    403
  );

  // 3. Enviar avaliação entre pares: ALLOW para Aluno 01 designado em PRJ-PI-02; DENY para Aluno 02 não designado em PRJ-PI-01
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-02/peer-evaluations",
      resourceId: "PRJ-PI-02",
      token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
    }).status,
    201
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/pi/projects/PRJ-PI-01/peer-evaluations",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
    }).status,
    403
  );

  // 4. Consulta a notas individuais (AC-PI-003-04):
  // Aluno 01 consulta própria nota em PRJ-PI-01 (200); Aluno 02 tenta ler nota do Aluno 01 (403); Docente 02 tenta ler (403)
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/pi/projects/PRJ-PI-01/grades",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
      body: { studentId: "USR-QA009-ALUNO-01" },
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/pi/projects/PRJ-PI-01/grades",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
      body: { studentId: "USR-QA009-ALUNO-01" },
    }).status,
    403
  );
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/pi/projects/PRJ-PI-01/grades",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteOutroEscopo.token,
      body: { studentId: "USR-QA009-ALUNO-01" },
    }).status,
    403
  );

  // 5. Arquivos internos (SPEC-PI-004: AC-PI-004-01) e autorização de fotos (AC-PI-004-04)
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/pi/projects/PRJ-PI-01/files/internal",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/pi/projects/PRJ-PI-01/files/internal",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
    }).status,
    403
  );
  assert.equal(
    api.request({
      method: "PATCH",
      path: "/api/v1/pi/projects/PRJ-PI-01/photos/authorization",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
      body: { photoAuthorized: true },
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "PATCH",
      path: "/api/v1/pi/projects/PRJ-PI-01/photos/authorization",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
      body: { photoAuthorized: true },
    }).status,
    403
  );
});

test("QA-009 | CT-QA009-04 (SPEC-EXT-001, SPEC-EXT-002 e SPEC-EXT-003): janelas de inscrição, avisos, submissão de atividades, validação exclusiva de horas e relatórios", () => {
  const api = createRbacScopeAuthorizationHarness();

  // 1. Períodos de inscrição em UTC-3 (SPEC-EXT-001): exclusivo Coordenação
  assert.equal(
    api.request({
      method: "PUT",
      path: "/api/v1/ext/enrollment-windows",
      token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "PUT",
      path: "/api/v1/ext/enrollment-windows",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    403
  );

  // 2. Avisos de Extensão: Coordenação publica global (201); Docente 01 publica em PRJ-EXT-01 (201), mas falha em PRJ-PI-02 alheio (403)
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/ext/notices",
      token: QA009_SYNTHETIC_ACTORS.coordenacao.token,
    }).status,
    201
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/ext/notices",
      resourceId: "PRJ-EXT-01",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    201
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/ext/notices",
      resourceId: "PRJ-EXT-01",
      token: QA009_SYNTHETIC_ACTORS.docenteOutroEscopo.token,
    }).status,
    403
  );

  // 3. Submissão de horas/atividades (SPEC-EXT-002: AC-EXT-002-01): Aluno vinculado (201) vs Aluno não vinculado (403)
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/ext/projects/PRJ-EXT-01/activities",
      resourceId: "PRJ-EXT-01",
      token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
    }).status,
    201
  );
  assert.equal(
    api.request({
      method: "POST",
      path: "/api/v1/ext/projects/PRJ-EXT-01/activities",
      resourceId: "PRJ-EXT-01",
      token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
    }).status,
    403
  );

  // 4. Validação/alteração de horas (AC-EXT-002-03..04): EXCLUSIVO Docente responsável (200);
  // Coordenação sem responsabilidade docente, outro Docente e Aluno recebem 403
  assert.equal(
    api.request({
      method: "PATCH",
      path: "/api/v1/ext/projects/PRJ-EXT-01/hours/validate",
      resourceId: "PRJ-EXT-01",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    200
  );
  for (const deniedActor of [
    QA009_SYNTHETIC_ACTORS.coordenacao,
    QA009_SYNTHETIC_ACTORS.docenteOutroEscopo,
    QA009_SYNTHETIC_ACTORS.alunoVinculado,
  ]) {
    assert.equal(
      api.request({
        method: "PATCH",
        path: "/api/v1/ext/projects/PRJ-EXT-01/hours/validate",
        resourceId: "PRJ-EXT-01",
        token: deniedActor.token,
      }).status,
      403
    );
  }

  // 5. Relatório de carga horária (SPEC-EXT-003): Aluno vinculado lê o próprio (200); Aluno alheio recebe 403
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/ext/projects/PRJ-EXT-01/hours/report",
      resourceId: "PRJ-EXT-01",
      token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
      body: { studentId: "USR-QA009-ALUNO-01" },
    }).status,
    200
  );
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/ext/projects/PRJ-EXT-01/hours/report",
      resourceId: "PRJ-EXT-01",
      token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
      body: { studentId: "USR-QA009-ALUNO-01" },
    }).status,
    403
  );
});

test("QA-009 | CT-QA009-05 (SPEC-PORTAL-001 e SPEC-PORTAL-002): catálogo público exibe apenas projetos publicados e fotos autorizadas, ocultando rascunhos, notas e arquivos internos", () => {
  const api = createRbacScopeAuthorizationHarness();

  // 1. Listagem pública por visitante anônimo: retorna apenas PUBLISHED, sem rascunhos e sem fotos não autorizadas
  const listRes = api.request({
    method: "GET",
    path: "/api/v1/portal/projects",
    token: null,
  });
  assert.equal(listRes.status, 200);
  const projectIds = listRes.body.data.projects.map((p) => p.id);
  assert.ok(projectIds.includes("PRJ-PI-01"));
  assert.ok(projectIds.includes("PRJ-PI-02"));
  assert.ok(!projectIds.includes("PRJ-PI-DRAFT-03"), "Projetos em DRAFT jamais devem aparecer no Portal Público");

  // Fotos no portal: PRJ-PI-01 exibe apenas a foto autorizada; PRJ-PI-02 (photoAuthorized=false) não exibe nenhuma
  const prj01Public = listRes.body.data.projects.find((p) => p.id === "PRJ-PI-01");
  const prj02Public = listRes.body.data.projects.find((p) => p.id === "PRJ-PI-02");
  assert.deepEqual(prj01Public.photos, ["/public/media/prj-pi-01-prototipo.jpg"]);
  assert.deepEqual(prj02Public.photos, []);

  // 2. Tentativa de acessar projeto DRAFT por ID direto no Portal Público -> 404 sem vazar título confidencial
  const draftDirect = api.request({
    method: "GET",
    path: "/api/v1/portal/projects/PRJ-PI-DRAFT-03",
    resourceId: "PRJ-PI-DRAFT-03",
    token: null,
  });
  assert.equal(draftDirect.status, 404);
  assert.equal(draftDirect.body.code, "PORTAL_PROJECT_NOT_PUBLIC");
  assert.ok(!JSON.stringify(draftDirect.body).includes("[CONFIDENTIAL_DRAFT_TITLE_DO_NOT_LEAK]"));

  // 3. Tentativa de acessar arquivos internos ou mutar projeto via rota do portal -> 403
  assert.equal(
    api.request({
      method: "GET",
      path: "/api/v1/portal/projects/PRJ-PI-01/internal-files",
      resourceId: "PRJ-PI-01",
      token: null,
    }).status,
    403
  );
  assert.equal(
    api.request({
      method: "PATCH",
      path: "/api/v1/portal/projects/PRJ-PI-01",
      resourceId: "PRJ-PI-01",
      token: QA009_SYNTHETIC_ACTORS.docenteResponsavel.token,
    }).status,
    403
  );
});

test("QA-009 | CT-QA009-06 (Segurança Server-Side e Sanitização de Erros): ignora headers forjados pelo cliente e garante zero vazamento em respostas de erro e logs", () => {
  const api = createRbacScopeAuthorizationHarness();

  // 1. Tentativa de bypass enviando headers forjados no cliente com token de Aluno
  const spoofedAttempt = api.request({
    method: "POST",
    path: "/api/v1/users/import-csv",
    token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
    headers: {
      "x-user-role": "COORDENACAO",
      "x-bypass-rbac": "true",
    },
  });
  assert.equal(spoofedAttempt.status, 403);
  assert.equal(spoofedAttempt.decision, "DENY");

  // 2. Tentativa de leitura de rascunho e arquivos internos por usuário não autorizado
  const deniedDraft = api.request({
    method: "GET",
    path: "/api/v1/pi/projects/PRJ-PI-DRAFT-03",
    resourceId: "PRJ-PI-DRAFT-03",
    token: QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
  });
  const deniedInternal = api.request({
    method: "GET",
    path: "/api/v1/pi/projects/PRJ-PI-01/files/internal",
    resourceId: "PRJ-PI-01",
    token: QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
  });

  const errorPayloads = JSON.stringify([spoofedAttempt.body, deniedDraft.body, deniedInternal.body]);
  const auditLogs = JSON.stringify(api.getAuditTrail());

  // Nenhuma resposta de erro ou trilha de auditoria pode conter segredos, tokens brutos, CPFs completos ou dados confidenciais do recurso negado
  const forbiddenSecretsAndLeaks = [
    QA009_SYNTHETIC_ACTORS.alunoVinculado.password,
    QA009_SYNTHETIC_ACTORS.alunoVinculado.cpf,
    QA009_SYNTHETIC_ACTORS.alunoVinculado.token,
    QA009_SYNTHETIC_ACTORS.alunoOutroProjeto.token,
    "[CONFIDENTIAL_DRAFT_TITLE_DO_NOT_LEAK]",
    "[DRAFT_SECRET_SPECIFICATION_03]",
    "[INTERNAL_ONLY_SECRET_NOTES_PRJ_01]",
    "arquitetura-interna-pi01.pdf",
  ];

  for (const sensitiveItem of forbiddenSecretsAndLeaks) {
    assert.ok(
      !errorPayloads.includes(sensitiveItem),
      `Vazamento em payload de erro para o item sensível: ${sensitiveItem}`
    );
    assert.ok(
      !auditLogs.includes(sensitiveItem),
      `Vazamento na trilha de auditoria para o item sensível: ${sensitiveItem}`
    );
  }

  // Confirma mascaramento de CPF e redaction de token nos logs
  assert.ok(auditLogs.includes("***.***.009-01"));
  assert.ok(auditLogs.includes("[REDACTED]"));
});

