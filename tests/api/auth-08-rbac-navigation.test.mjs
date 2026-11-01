import assert from "node:assert/strict";
import test from "node:test";

/**
 * Suíte de validação de contrato e regras de autorização/navegação da issue AUTH-08-QA (plataforma-quality#31)
 * Vinculada à issue principal AUTH-08 (plataforma-governance#21) e às SPECs:
 * - SPEC-AUTH-001 (AC-AUTH-001-01..05)
 * - SPEC-AUTH-002 (Sessão e Logout)
 * - SPEC-AUTH-003 (AC-AUTH-003-01..06)
 * - SPEC-AUTH-004 (AC-AUTH-004-01..03)
 * - SPEC-PI-001 (AC-PI-001-01..15), SPEC-PI-003 (AC-PI-003-01..06), SPEC-PI-004 (AC-PI-004-01..04)
 * - SPEC-EXT-002 (AC-EXT-002-01..04), SPEC-PORTAL-001 (AC-PORTAL-001-01..05)
 *
 * Nota: Dados 100% sintéticos (CPFs fictícios e marcadores sanitizados).
 */

export const SYNTHETIC_ACCOUNTS = {
  alunoAtivo: {
    id: "USR-SINT-01",
    cpf: "000.000.001-01",
    password: "[SYNTHETIC_PASS_ALUNO_01]",
    active: true,
    mustChangePassword: false,
    roles: ["ALUNO"],
    linkedProjects: ["PRJ-PI-01"],
  },
  docenteResponsavel: {
    id: "USR-SINT-02",
    cpf: "000.000.002-02",
    password: "[SYNTHETIC_PASS_DOCENTE_02]",
    active: true,
    mustChangePassword: false,
    roles: ["DOCENTE"],
    ownedProjects: ["PRJ-PI-01"],
  },
  coordenadorAtivo: {
    id: "USR-SINT-03",
    cpf: "000.000.003-03",
    password: "[SYNTHETIC_PASS_COORD_03]",
    active: true,
    mustChangePassword: false,
    roles: ["COORDENACAO"],
    ownedProjects: [],
  },
  multiPerfilDocenteCoord: {
    id: "USR-SINT-04",
    cpf: "000.000.004-04",
    password: "[SYNTHETIC_PASS_MULTI_04]",
    active: true,
    mustChangePassword: false,
    roles: ["DOCENTE", "COORDENACAO"],
    ownedProjects: ["PRJ-PI-01"],
  },
  alunoSenhaRedefinida: {
    id: "USR-SINT-05",
    cpf: "000.000.005-05",
    password: "[SYNTHETIC_TEMP_PASS_05]",
    active: true,
    mustChangePassword: true,
    roles: ["ALUNO"],
    linkedProjects: ["PRJ-PI-01"],
  },
  alunoInativo: {
    id: "USR-SINT-06",
    cpf: "000.000.006-06",
    password: "[SYNTHETIC_PASS_INATIVO_06]",
    active: false,
    mustChangePassword: false,
    roles: ["ALUNO"],
    linkedProjects: [],
  },
};

const MENU_BY_ROLE = {
  ALUNO: ["Início", "Meus Projetos", "Extensão", "Avaliações", "Trocar Senha", "Sair"],
  DOCENTE: [
    "Visão Geral Docente",
    "Projetos Orientados",
    "Solicitações de Participação",
    "Validação de Horas",
    "Avaliações e Rubricas",
    "Avisos",
    "Redefinir Senha de Usuário",
    "Trocar Senha",
    "Sair",
  ],
  COORDENACAO: [
    "Painel da Coordenação",
    "Usuários e Permissões",
    "Importação CSV",
    "Turmas e Alunos",
    "Períodos de Inscrição e Avisos",
    "Atribuição de Avaliadores",
    "Redefinir Senha de Usuário",
    "Trocar Senha",
    "Sair",
  ],
};

const FORBIDDEN_LEGACY_MENUS = ["Meus Convites", "Agendar Banca", "Salas de Banca"];

/**
 * Avaliador determinístico das regras normativas de autenticação, redirecionamento,
 * visibilidade de menus, guarda de rota direta (client + server-side) e encerramento de sessão.
 */
export function createNormativeAuthNavigationHarness() {
  const activeSessions = new Map();
  let sessionCounter = 0;

  function login(cpf, password) {
    const account = Object.values(SYNTHETIC_ACCOUNTS).find((acc) => acc.cpf === cpf);
    if (!account || !account.active || account.password !== password) {
      return {
        status: 401,
        redirectTo: "/login",
        body: {
          code: "AUTH_INVALID_OR_INACTIVE",
          message: "Credenciais inválidas ou conta não habilitada para acesso.",
        },
      };
    }

    sessionCounter += 1;
    const sessionId = `SESS-SINT-${sessionCounter}`;
    activeSessions.set(sessionId, {
      accountId: account.id,
      roles: [...account.roles],
      mustChangePassword: account.mustChangePassword,
      linkedProjects: account.linkedProjects || [],
      ownedProjects: account.ownedProjects || [],
    });

    if (account.mustChangePassword) {
      return {
        status: 200,
        sessionId,
        redirectTo: "/primeiro-acesso",
        visibleMenus: ["Trocar Senha Obrigatória", "Sair"],
        pendingRuleWarning: null,
      };
    }

    let redirectTo = "/aluno";
    let pendingRuleWarning = null;
    if (account.roles.length > 1) {
      redirectTo = "/docente";
      pendingRuleWarning =
        "WARN [AC-AUTH-003-01 / AUTH-08-FE-02]: Regra de destino inicial para acúmulo de funções aguarda confirmação do PO.";
    } else if (account.roles.includes("COORDENACAO")) {
      redirectTo = "/coordenacao";
      pendingRuleWarning =
        "WARN [AUTH-08-FE-06]: Path canônico da tela inicial da Coordenação aguarda confirmação entre PO/Frontend.";
    } else if (account.roles.includes("DOCENTE")) {
      redirectTo = "/docente";
    }

    const menuSet = new Set();
    for (const role of account.roles) {
      for (const item of MENU_BY_ROLE[role] || []) {
        menuSet.add(item);
      }
    }

    return {
      status: 200,
      sessionId,
      redirectTo,
      visibleMenus: [...menuSet],
      pendingRuleWarning,
    };
  }

  function accessRoute(sessionId, route, options = {}) {
    const session = activeSessions.get(sessionId);
    if (!session) {
      if (route === "/catalogo" || route === "/login") {
        return { status: 200, allowed: true, redirectTo: null, body: { publicView: true } };
      }
      return {
        status: 401,
        allowed: false,
        redirectTo: "/login",
        body: { code: "UNAUTHENTICATED", message: "Sessão ausente, expirada ou encerrada." },
      };
    }

    if (session.mustChangePassword && route !== "/primeiro-acesso" && route !== "/logout") {
      return {
        status: 403,
        allowed: false,
        redirectTo: "/primeiro-acesso",
        body: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Necessário definir nova senha antes de acessar áreas protegidas.",
        },
      };
    }

    // Regras de rota direta por perfil (esconder o menu não basta — AC-AUTH-003-06)
    if (route.startsWith("/coordenacao") || route === "/api/users/import-csv" || route === "/api/users/inactivate") {
      if (!session.roles.includes("COORDENACAO")) {
        return {
          status: 403,
          allowed: false,
          redirectTo: "/acesso-negado",
          body: { code: "FORBIDDEN_ROLE", message: "Acesso restrito ao perfil Coordenação." },
        };
      }
      return { status: 200, allowed: true, redirectTo: null, body: { area: "COORDENACAO" } };
    }

    if (route.startsWith("/admin")) {
      return {
        status: 403,
        allowed: false,
        redirectTo: "/acesso-negado",
        body: {
          code: "FORBIDDEN_UNAPPROVED_ROLE",
          message: "Papel Administrador não possui escopo aprovado no caderno (negação por padrão — AC-AUTH-003-06).",
        },
      };
    }

    if (route.startsWith("/docente") || route.startsWith("/api/projects/manage")) {
      if (!session.roles.includes("DOCENTE")) {
        return {
          status: 403,
          allowed: false,
          redirectTo: "/acesso-negado",
          body: { code: "FORBIDDEN_ROLE", message: "Acesso restrito ao perfil Docente." },
        };
      }
      if (options.projectId && !session.ownedProjects.includes(options.projectId)) {
        return {
          status: 403,
          allowed: false,
          redirectTo: "/acesso-negado",
          body: {
            code: "FORBIDDEN_PROJECT_SCOPE",
            message: "Operação negada: docente não é responsável por este projeto.",
          },
        };
      }
      if (options.action === "REMOVE_PARTICIPANT" && (!options.justification || !options.justification.trim())) {
        return {
          status: 422,
          allowed: false,
          redirectTo: null,
          body: {
            code: "JUSTIFICATION_REQUIRED",
            message: "Justificativa obrigatória para remover participante do projeto.",
          },
        };
      }
      return { status: 200, allowed: true, redirectTo: null, body: { area: "DOCENTE" } };
    }

    if (route.startsWith("/aluno")) {
      if (!session.roles.includes("ALUNO")) {
        return {
          status: 403,
          allowed: false,
          redirectTo: "/acesso-negado",
          body: { code: "FORBIDDEN_ROLE", message: "Acesso restrito ao perfil Aluno." },
        };
      }
      if (options.projectId && !session.linkedProjects.includes(options.projectId)) {
        return {
          status: 403,
          allowed: false,
          redirectTo: "/acesso-negado",
          body: {
            code: "FORBIDDEN_PROJECT_READ",
            message: "Acesso negado a arquivos ou avaliações individuais de outro projeto.",
          },
        };
      }
      return { status: 200, allowed: true, redirectTo: null, body: { area: "ALUNO" } };
    }

    return { status: 404, allowed: false, redirectTo: null, body: { code: "NOT_FOUND" } };
  }

  function logout(sessionId) {
    activeSessions.delete(sessionId);
    return { status: 204, redirectTo: "/login" };
  }

  return { login, accessRoute, logout };
}

test("AUTH-08-QA | Cenário 1 (Aluno): login redireciona à área do aluno, exibe apenas menus permitidos e bloqueia link direto a /docente e /coordenacao", () => {
  const app = createNormativeAuthNavigationHarness();
  const loginRes = app.login(SYNTHETIC_ACCOUNTS.alunoAtivo.cpf, SYNTHETIC_ACCOUNTS.alunoAtivo.password);

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.redirectTo, "/aluno");
  assert.ok(loginRes.visibleMenus.includes("Início"));
  assert.ok(loginRes.visibleMenus.includes("Meus Projetos"));
  assert.ok(loginRes.visibleMenus.includes("Extensão"));
  assert.ok(!loginRes.visibleMenus.includes("Importação CSV"));
  assert.ok(!loginRes.visibleMenus.includes("Validação de Horas"));
  for (const legacyMenu of FORBIDDEN_LEGACY_MENUS) {
    assert.ok(!loginRes.visibleMenus.includes(legacyMenu));
  }

  // Acesso permitido à sua área e projeto vinculado
  const allowedOwnArea = app.accessRoute(loginRes.sessionId, "/aluno", { projectId: "PRJ-PI-01" });
  assert.equal(allowedOwnArea.status, 200);

  // Tentativa de entrar por link direto em área proibida (Docente, Coordenação, Admin e projeto alheio)
  const directDocente = app.accessRoute(loginRes.sessionId, "/docente");
  assert.equal(directDocente.status, 403);
  assert.equal(directDocente.allowed, false);

  const directCoord = app.accessRoute(loginRes.sessionId, "/coordenacao/usuarios");
  assert.equal(directCoord.status, 403);

  const directCsvApi = app.accessRoute(loginRes.sessionId, "/api/users/import-csv");
  assert.equal(directCsvApi.status, 403);

  const directOtherProject = app.accessRoute(loginRes.sessionId, "/aluno/projetos", { projectId: "PRJ-PI-02" });
  assert.equal(directOtherProject.status, 403);

  // Logout encerra a sessão e impede reutilização por link direto
  const logoutRes = app.logout(loginRes.sessionId);
  assert.equal(logoutRes.status, 204);

  const afterLogout = app.accessRoute(loginRes.sessionId, "/aluno");
  assert.equal(afterLogout.status, 401);
  assert.equal(afterLogout.redirectTo, "/login");
});

test("AUTH-08-QA | Cenário 2 (Docente): login redireciona para /docente, bloqueia link direto a /coordenacao e isola escopo de projetos", () => {
  const app = createNormativeAuthNavigationHarness();
  const loginRes = app.login(
    SYNTHETIC_ACCOUNTS.docenteResponsavel.cpf,
    SYNTHETIC_ACCOUNTS.docenteResponsavel.password
  );

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.redirectTo, "/docente");
  assert.ok(loginRes.visibleMenus.includes("Projetos Orientados"));
  assert.ok(loginRes.visibleMenus.includes("Solicitações de Participação"));
  assert.ok(loginRes.visibleMenus.includes("Validação de Horas"));
  assert.ok(!loginRes.visibleMenus.includes("Importação CSV"));
  assert.ok(!loginRes.visibleMenus.includes("Turmas e Alunos"));

  // Acesso ao projeto sob sua responsabilidade
  const ownProject = app.accessRoute(loginRes.sessionId, "/docente/projetos", { projectId: "PRJ-PI-01" });
  assert.equal(ownProject.status, 200);

  // Tentativa de alterar projeto de outro docente (AC-AUTH-003-03 / AC-PI-001-07)
  const foreignProject = app.accessRoute(loginRes.sessionId, "/docente/projetos", { projectId: "PRJ-PI-02" });
  assert.equal(foreignProject.status, 403);
  assert.equal(foreignProject.body.code, "FORBIDDEN_PROJECT_SCOPE");

  // Tentativa de remover participante sem justificativa (AC-AUTH-003-04)
  const removeWithoutJustification = app.accessRoute(loginRes.sessionId, "/api/projects/manage", {
    projectId: "PRJ-PI-01",
    action: "REMOVE_PARTICIPANT",
    justification: "   ",
  });
  assert.equal(removeWithoutJustification.status, 422);

  // Tentativa de abrir link direto de Coordenação ou importar CSV (AC-AUTH-003-02)
  const directCoord = app.accessRoute(loginRes.sessionId, "/coordenacao");
  assert.equal(directCoord.status, 403);
});

test("AUTH-08-QA | Cenário 3 (Coordenação): acessa gestão e CSV, mas recebe 403 ao tentar acessar área exclusiva de Aluno ou Docente sem acúmulo", () => {
  const app = createNormativeAuthNavigationHarness();
  const loginRes = app.login(SYNTHETIC_ACCOUNTS.coordenadorAtivo.cpf, SYNTHETIC_ACCOUNTS.coordenadorAtivo.password);

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.redirectTo, "/coordenacao");
  assert.ok(loginRes.visibleMenus.includes("Importação CSV"));
  assert.ok(loginRes.visibleMenus.includes("Usuários e Permissões"));
  assert.ok(!loginRes.visibleMenus.includes("Meus Projetos"));
  assert.ok(!loginRes.visibleMenus.includes("Validação de Horas"));

  const allowedCsv = app.accessRoute(loginRes.sessionId, "/api/users/import-csv");
  assert.equal(allowedCsv.status, 200);

  const directDocente = app.accessRoute(loginRes.sessionId, "/docente");
  assert.equal(directDocente.status, 403);

  const directAluno = app.accessRoute(loginRes.sessionId, "/aluno");
  assert.equal(directAluno.status, 403);
});

test("AUTH-08-QA | Cenário 4 (Multi-perfil AC-AUTH-003-01): acumula menus e permissões de Docente e Coordenação no mesmo CPF e nega perfil não atribuído", () => {
  const app = createNormativeAuthNavigationHarness();
  const loginRes = app.login(
    SYNTHETIC_ACCOUNTS.multiPerfilDocenteCoord.cpf,
    SYNTHETIC_ACCOUNTS.multiPerfilDocenteCoord.password
  );

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.visibleMenus.includes("Importação CSV"));
  assert.ok(loginRes.visibleMenus.includes("Validação de Horas"));
  assert.ok(!loginRes.visibleMenus.includes("Meus Projetos"));

  assert.equal(app.accessRoute(loginRes.sessionId, "/coordenacao").status, 200);
  assert.equal(app.accessRoute(loginRes.sessionId, "/docente", { projectId: "PRJ-PI-01" }).status, 200);
  assert.equal(app.accessRoute(loginRes.sessionId, "/aluno").status, 403);
});

test("AUTH-08-QA | Cenário 5 (Primeiro acesso / senha redefinida AC-AUTH-001-04a): bloqueia acesso direto a rotas protegidas antes da troca de senha", () => {
  const app = createNormativeAuthNavigationHarness();
  const loginRes = app.login(
    SYNTHETIC_ACCOUNTS.alunoSenhaRedefinida.cpf,
    SYNTHETIC_ACCOUNTS.alunoSenhaRedefinida.password
  );

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.redirectTo, "/primeiro-acesso");

  const bypassAttempt = app.accessRoute(loginRes.sessionId, "/aluno");
  assert.equal(bypassAttempt.status, 403);
  assert.equal(bypassAttempt.redirectTo, "/primeiro-acesso");
});

test("AUTH-08-QA | Cenário 6 (Conta inativa/desconhecida e Sanitização AC-AUTH-001-02a / AC-AUTH-001-05a): nega login sem vazar segredos ou CPF", () => {
  const app = createNormativeAuthNavigationHarness();
  const inactiveRes = app.login(SYNTHETIC_ACCOUNTS.alunoInativo.cpf, SYNTHETIC_ACCOUNTS.alunoInativo.password);

  assert.equal(inactiveRes.status, 401);
  const serialized = JSON.stringify(inactiveRes.body);
  assert.ok(!serialized.includes(SYNTHETIC_ACCOUNTS.alunoInativo.cpf));
  assert.ok(!serialized.includes(SYNTHETIC_ACCOUNTS.alunoInativo.password));
});

