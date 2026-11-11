import assert from "node:assert/strict";
import test from "node:test";

/**
 * Cenários E2E da jornada autenticada por perfil — AUTH-08-QA (plataforma-quality#31)
 *
 * Percorre para cada conta fictícia:
 * 1. Login com CPF provisionado e senha sintética
 * 2. Redirecionamento automático para a tela inicial do perfil
 * 3. Conferência de menus visíveis (permitidos) e menus ocultos (proibidos/legados)
 * 4. Tentativa de abrir diretamente por URL (link direto) uma rota de outro perfil
 * 5. Logout e tentativa de reabrir rota autenticada após encerramento da sessão
 */

const SYNTHETIC_JOURNEY_ACCOUNTS = {
  alunoAtivo: {
    id: "USR-SINT-01",
    cpf: "000.000.001-01",
    password: "[SYNTHETIC_PASS_ALUNO_01]",
    role: "ALUNO",
    expectedLandingUrl: "/aluno",
    visibleMenus: ["Início", "Meus Projetos", "Extensão", "Avaliações", "Trocar Senha", "Sair"],
  },
  docenteResponsavel: {
    id: "USR-SINT-02",
    cpf: "000.000.002-02",
    password: "[SYNTHETIC_PASS_DOCENTE_02]",
    role: "DOCENTE",
    expectedLandingUrl: "/docente",
    visibleMenus: [
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
  },
  coordenadorAtivo: {
    id: "USR-SINT-03",
    cpf: "000.000.003-03",
    password: "[SYNTHETIC_PASS_COORD_03]",
    role: "COORDENACAO",
    expectedLandingUrl: "/coordenacao",
    visibleMenus: [
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
  },
};

function createE2EJourneyNavigator() {
  const sessions = new Map();
  let seq = 0;

  return {
    login(cpf, password) {
      const acc = Object.values(SYNTHETIC_JOURNEY_ACCOUNTS).find(
        (item) => item.cpf === cpf && item.password === password
      );
      if (!acc) {
        return { status: 401, redirectTo: "/login", visibleMenus: [] };
      }
      seq += 1;
      const sessionId = `E2E-SESS-${seq}`;
      sessions.set(sessionId, acc);
      return {
        status: 200,
        sessionId,
        redirectTo: acc.expectedLandingUrl,
        visibleMenus: [...acc.visibleMenus],
      };
    },
    accessRoute(sessionId, url) {
      const acc = sessions.get(sessionId);
      if (!acc) {
        return { status: 401, allowed: false, redirectTo: "/login" };
      }
      if (url === acc.expectedLandingUrl) {
        return { status: 200, allowed: true, redirectTo: null };
      }
      return { status: 403, allowed: false, redirectTo: "/acesso-negado" };
    },
    logout(sessionId) {
      sessions.delete(sessionId);
      return { status: 204, redirectTo: "/login" };
    },
  };
}

export const E2E_PROFILE_JOURNEYS = [
  {
    journeyId: "E2E-AUTH08-01",
    profile: "Aluno Ativo",
    account: SYNTHETIC_JOURNEY_ACCOUNTS.alunoAtivo,
    expectedLandingUrl: "/aluno",
    expectedVisibleMenus: ["Início", "Meus Projetos", "Extensão"],
    expectedHiddenMenus: [
      "Importação CSV",
      "Usuários e Permissões",
      "Validação de Horas",
      "Solicitações de Participação",
      "Meus Convites",
      "Agendar Banca",
    ],
    forbiddenDirectRoutes: ["/docente", "/coordenacao", "/admin"],
  },
  {
    journeyId: "E2E-AUTH08-02",
    profile: "Professor / Docente",
    account: SYNTHETIC_JOURNEY_ACCOUNTS.docenteResponsavel,
    expectedLandingUrl: "/docente",
    expectedVisibleMenus: [
      "Visão Geral Docente",
      "Projetos Orientados",
      "Solicitações de Participação",
      "Validação de Horas",
    ],
    expectedHiddenMenus: [
      "Importação CSV",
      "Usuários e Permissões",
      "Turmas e Alunos",
      "Meus Projetos",
      "Meus Convites",
      "Agendar Banca",
    ],
    forbiddenDirectRoutes: ["/coordenacao", "/aluno", "/admin"],
  },
  {
    journeyId: "E2E-AUTH08-03",
    profile: "Coordenador (Coordenação)",
    account: SYNTHETIC_JOURNEY_ACCOUNTS.coordenadorAtivo,
    expectedLandingUrl: "/coordenacao",
    expectedVisibleMenus: [
      "Painel da Coordenação",
      "Usuários e Permissões",
      "Importação CSV",
      "Turmas e Alunos",
      "Períodos de Inscrição e Avisos",
      "Atribuição de Avaliadores",
    ],
    expectedHiddenMenus: ["Meus Projetos", "Validação de Horas", "Meus Convites", "Agendar Banca"],
    forbiddenDirectRoutes: ["/aluno", "/docente", "/admin"],
  },
];

for (const journey of E2E_PROFILE_JOURNEYS) {
  test(`${journey.journeyId} (${journey.profile}): percorre login -> redirecionamento -> menus -> bloqueio de link direto -> logout`, () => {
    const harness = createE2EJourneyNavigator();

    // Passo 1 e 2: Login e Redirecionamento
    const session = harness.login(journey.account.cpf, journey.account.password);
    assert.equal(session.status, 200);
    assert.equal(session.redirectTo, journey.expectedLandingUrl);

    // Passo 3: Navegação — menus visíveis vs. menus ocultos
    for (const visibleMenu of journey.expectedVisibleMenus) {
      assert.ok(
        session.visibleMenus.includes(visibleMenu),
        `Menu esperado '${visibleMenu}' deveria estar visível para ${journey.profile}`
      );
    }
    for (const hiddenMenu of journey.expectedHiddenMenus) {
      assert.ok(
        !session.visibleMenus.includes(hiddenMenu),
        `Menu proibido '${hiddenMenu}' deve permanecer oculto para ${journey.profile}`
      );
    }

    // Passo 4: Link direto para área proibida (esconder o menu sozinho não basta)
    for (const forbiddenUrl of journey.forbiddenDirectRoutes) {
      const directAttempt = harness.accessRoute(session.sessionId, forbiddenUrl);
      assert.equal(
        directAttempt.status,
        403,
        `Acesso por link direto a '${forbiddenUrl}' pelo perfil '${journey.profile}' deve ser recusado com 403`
      );
      assert.equal(directAttempt.allowed, false);
    }

    // Passo 5: Logout e tentativa de reabrir a página inicial sem sessão válida
    const logoutRes = harness.logout(session.sessionId);
    assert.equal(logoutRes.status, 204);
    assert.equal(logoutRes.redirectTo, "/login");

    const postLogoutAttempt = harness.accessRoute(session.sessionId, journey.expectedLandingUrl);
    assert.equal(postLogoutAttempt.status, 401);
    assert.equal(postLogoutAttempt.redirectTo, "/login");
  });
}

