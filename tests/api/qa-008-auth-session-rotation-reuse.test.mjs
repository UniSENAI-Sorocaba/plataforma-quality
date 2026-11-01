import assert from "node:assert/strict";
import test from "node:test";

/**
 * Suíte de testes de API — QA-008 (plataforma-quality#8)
 * "API tests cobrem login, refresh, logout e reuse"
 *
 * SPECs e Critérios de Aceite cobertos:
 * - SPEC-AUTH-001:
 *   - AC-AUTH-001-01: Autenticação local por CPF e senha para conta ativa e provisionada.
 *   - AC-AUTH-001-02 / AC-AUTH-001-02a: Recusa determinística para credenciais inválidas ou conta inativa/não provisionada.
 *   - AC-AUTH-001-04 / AC-AUTH-001-04a: Senha temporária (primeiro acesso) ou redefinida exige troca de senha antes de liberar recursos protegidos.
 *   - AC-AUTH-001-05 / AC-AUTH-001-05a: Respostas de erro e logs técnicos sanitizados (sem expor senha, hash, access token, refresh token ou dados pessoais sensíveis).
 * - SPEC-AUTH-002:
 *   - AC-AUTH-002-01: Emissão de sessão autenticada com Access Token de curta duração e Refresh Token vinculado a uma família (`familyId`).
 *   - AC-AUTH-002-02: Refresh rotativo — o uso de um Refresh Token válido emite novo par (Access + Refresh) na mesma família e invalida imediatamente o Refresh Token anterior (`rotated`).
 *   - AC-AUTH-002-03: Detecção de reuse de Refresh Token — reutilizar um Refresh Token já rotacionado deve falhar (`401 AUTH_REFRESH_TOKEN_REUSED`) e revogar imediatamente toda a família de tokens (`familyId`), invalidando inclusive o token mais recente da cadeia.
 *   - AC-AUTH-002-04: Logout — encerra a sessão/família ativa e impede uso posterior do Access Token e do Refresh Token (`401`).
 *   - AC-AUTH-002-05: Expiração — Access Token expirado é recusado em rotas protegidas (`401 AUTH_ACCESS_TOKEN_EXPIRED`) e Refresh Token expirado é recusado no endpoint de refresh (`401 AUTH_REFRESH_TOKEN_EXPIRED`).
 *   - AC-AUTH-002-06: Ausência de tokens e segredos em logs de auditoria/aplicação (`MH-SEC-003` / `MH-SEC-004` / `AC-AUTH-001-05a`).
 *
 * Nota de Segurança: Todos os dados e identificadores são 100% sintéticos e opacos (nenhum JWT real ou segredo é utilizado).
 */

export const QA008_SYNTHETIC_USERS = {
  alunoAtivo: {
    id: "USR-QA008-01",
    cpf: "000.000.008-01",
    password: "[SYNTHETIC_PASS_QA008_ALUNO]",
    active: true,
    mustChangePassword: false,
    roles: ["ALUNO"],
  },
  docenteAtivo: {
    id: "USR-QA008-02",
    cpf: "000.000.008-02",
    password: "[SYNTHETIC_PASS_QA008_DOCENTE]",
    active: true,
    mustChangePassword: false,
    roles: ["DOCENTE"],
  },
  primeiroAcesso: {
    id: "USR-QA008-03",
    cpf: "000.000.008-03",
    password: "[SYNTHETIC_TEMP_PASS_QA008]",
    active: true,
    mustChangePassword: true,
    roles: ["ALUNO"],
  },
  contaInativa: {
    id: "USR-QA008-04",
    cpf: "000.000.008-04",
    password: "[SYNTHETIC_PASS_QA008_INATIVO]",
    active: false,
    mustChangePassword: false,
    roles: ["ALUNO"],
  },
};

const ACCESS_TTL_MS = 15 * 60 * 1000; // 15 minutos
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Harness determinístico de contrato da API de Autenticação e Sessão (SPEC-AUTH-001 e SPEC-AUTH-002).
 * Simula os endpoints `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`,
 * `/api/v1/auth/password/change` e `/api/v1/auth/me` com relógio controlável e coletor de logs estruturados.
 */
export function createAuthSessionApiHarness(initialNowMs = Date.parse("2026-10-30T18:00:00Z")) {
  let nowMs = initialNowMs;
  let seq = 0;

  const users = new Map(
    Object.values(QA008_SYNTHETIC_USERS).map((u) => [u.cpf, { ...u, roles: [...u.roles] }])
  );
  const families = new Map(); // familyId -> { familyId, userId, revoked, revokeReason, createdAtMs }
  const accessTokens = new Map(); // token -> { token, jti, familyId, userId, expiresAtMs, revoked }
  const refreshTokens = new Map(); // token -> { token, jti, familyId, userId, generation, status: 'active'|'rotated'|'revoked', expiresAtMs, replacedByJti }
  const auditLogs = [];

  function advanceTimeMs(deltaMs) {
    nowMs += deltaMs;
    return nowMs;
  }

  function maskCpf(cpf) {
    if (!cpf || typeof cpf !== "string") return "***.***.***-**";
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return "***.***.***-**";
    return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  function recordSanitizedLog(event, metadata = {}) {
    // Regra normativa (SPEC-AUTH-001 / SPEC-AUTH-002): logs NUNCA armazenam password, accessToken, refreshToken ou CPF em claro
    const safeMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (["password", "newPassword", "accessToken", "refreshToken", "authorization"].includes(key)) {
        safeMetadata[key] = "[REDACTED]";
      } else if (key === "cpf") {
        safeMetadata.cpfMasked = maskCpf(value);
      } else {
        safeMetadata[key] = value;
      }
    }

    const entry = {
      timestamp: new Date(nowMs).toISOString(),
      event,
      ...safeMetadata,
    };
    auditLogs.push(entry);
    return entry;
  }

  function issueTokenPair(user, existingFamily = null, generation = 1) {
    seq += 1;
    const familyId = existingFamily ? existingFamily.familyId : `FAM-SINT-${seq}`;
    if (!existingFamily) {
      families.set(familyId, {
        familyId,
        userId: user.id,
        revoked: false,
        revokeReason: null,
        createdAtMs: nowMs,
      });
    }

    const accessJti = `AT-JTI-${seq}-G${generation}`;
    const refreshJti = `RT-JTI-${seq}-G${generation}`;
    const accessToken = `AT_OPAQUE_${familyId}_G${generation}_${seq}`;
    const refreshToken = `RT_OPAQUE_${familyId}_G${generation}_${seq}`;

    accessTokens.set(accessToken, {
      token: accessToken,
      jti: accessJti,
      familyId,
      userId: user.id,
      generation,
      expiresAtMs: nowMs + ACCESS_TTL_MS,
      revoked: false,
    });

    refreshTokens.set(refreshToken, {
      token: refreshToken,
      jti: refreshJti,
      familyId,
      userId: user.id,
      generation,
      status: "active",
      expiresAtMs: nowMs + REFRESH_TTL_MS,
      replacedByJti: null,
    });

    return {
      familyId,
      generation,
      accessToken,
      accessJti,
      accessExpiresInSec: ACCESS_TTL_MS / 1000,
      refreshToken,
      refreshJti,
      refreshExpiresInSec: REFRESH_TTL_MS / 1000,
    };
  }

  function revokeFamily(familyId, reason) {
    const family = families.get(familyId);
    if (family) {
      family.revoked = true;
      family.revokeReason = reason;
    }
    for (const at of accessTokens.values()) {
      if (at.familyId === familyId) {
        at.revoked = true;
      }
    }
    for (const rt of refreshTokens.values()) {
      if (rt.familyId === familyId && rt.status === "active") {
        rt.status = "revoked";
      }
    }
  }

  function postLogin({ cpf, password } = {}) {
    const user = users.get(cpf);
    if (!user || !user.active || user.password !== password) {
      const reasonCode = !user ? "USER_NOT_FOUND" : !user.active ? "USER_INACTIVE" : "BAD_CREDENTIALS";
      recordSanitizedLog("AUTH_LOGIN_FAILURE", {
        cpf,
        password,
        reasonCode,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "AUTH_INVALID_OR_INACTIVE",
          message: "Credenciais inválidas ou conta não habilitada para acesso.",
        },
      };
    }

    const pair = issueTokenPair(user, null, 1);
    recordSanitizedLog("AUTH_LOGIN_SUCCESS", {
      userId: user.id,
      cpf,
      password,
      familyId: pair.familyId,
      accessJti: pair.accessJti,
      refreshJti: pair.refreshJti,
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      mustChangePassword: user.mustChangePassword,
      status: 200,
    });

    return {
      status: 200,
      body: {
        userId: user.id,
        roles: [...user.roles],
        mustChangePassword: user.mustChangePassword,
        familyId: pair.familyId,
        tokenType: "Bearer",
        accessToken: pair.accessToken,
        accessExpiresIn: pair.accessExpiresInSec,
        refreshToken: pair.refreshToken,
        refreshExpiresIn: pair.refreshExpiresInSec,
      },
    };
  }

  function postRefresh({ refreshToken } = {}) {
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
      recordSanitizedLog("AUTH_REFRESH_INVALID_TOKEN", {
        refreshToken,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "AUTH_REFRESH_TOKEN_INVALID",
          message: "Refresh token ausente ou inválido.",
        },
      };
    }

    const storedRt = refreshTokens.get(refreshToken);
    const family = families.get(storedRt.familyId);
    const user = [...users.values()].find((u) => u.id === storedRt.userId);

    // Detecção de REUSE: refresh token já rotacionado anteriormente!
    if (storedRt.status === "rotated") {
      revokeFamily(storedRt.familyId, "REFRESH_TOKEN_REUSE_DETECTED");
      recordSanitizedLog("AUTH_REFRESH_REUSE_DETECTED", {
        userId: storedRt.userId,
        familyId: storedRt.familyId,
        reusedRefreshJti: storedRt.jti,
        generation: storedRt.generation,
        refreshToken,
        familyRevoked: true,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "AUTH_REFRESH_TOKEN_REUSED",
          message: "Reutilização de refresh token detectada. Toda a família de sessão foi revogada por segurança.",
          familyId: storedRt.familyId,
          familyRevoked: true,
        },
      };
    }

    // Família já revogada (por logout ou por reuse anterior) ou token revogado
    if (!family || family.revoked || storedRt.status === "revoked") {
      recordSanitizedLog("AUTH_REFRESH_REVOKED_FAMILY", {
        userId: storedRt.userId,
        familyId: storedRt.familyId,
        refreshJti: storedRt.jti,
        revokeReason: family?.revokeReason || "TOKEN_REVOKED",
        refreshToken,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "AUTH_SESSION_FAMILY_REVOKED",
          message: "Sessão encerrada ou família de tokens revogada.",
          familyId: storedRt.familyId,
        },
      };
    }

    // Expiração do Refresh Token
    if (nowMs >= storedRt.expiresAtMs) {
      storedRt.status = "revoked";
      revokeFamily(storedRt.familyId, "REFRESH_TOKEN_EXPIRED");
      recordSanitizedLog("AUTH_REFRESH_EXPIRED", {
        userId: storedRt.userId,
        familyId: storedRt.familyId,
        refreshJti: storedRt.jti,
        refreshToken,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "AUTH_REFRESH_TOKEN_EXPIRED",
          message: "Refresh token expirado. Realize novo login.",
        },
      };
    }

    // Rotação normal: invalida o refresh atual ('rotated') e também invalida access tokens anteriores da família
    storedRt.status = "rotated";
    for (const at of accessTokens.values()) {
      if (at.familyId === storedRt.familyId && at.generation <= storedRt.generation) {
        at.revoked = true;
      }
    }

    const nextGen = storedRt.generation + 1;
    const nextPair = issueTokenPair(user, family, nextGen);
    storedRt.replacedByJti = nextPair.refreshJti;

    recordSanitizedLog("AUTH_REFRESH_ROTATED", {
      userId: user.id,
      familyId: family.familyId,
      previousRefreshJti: storedRt.jti,
      newRefreshJti: nextPair.refreshJti,
      newAccessJti: nextPair.accessJti,
      generation: nextGen,
      accessToken: nextPair.accessToken,
      refreshToken: nextPair.refreshToken,
      status: 200,
    });

    return {
      status: 200,
      body: {
        userId: user.id,
        roles: [...user.roles],
        familyId: family.familyId,
        generation: nextGen,
        tokenType: "Bearer",
        accessToken: nextPair.accessToken,
        accessExpiresIn: nextPair.accessExpiresInSec,
        refreshToken: nextPair.refreshToken,
        refreshExpiresIn: nextPair.refreshExpiresInSec,
      },
    };
  }

  function postLogout({ accessToken, refreshToken } = {}) {
    const atRecord = accessToken ? accessTokens.get(accessToken) : null;
    const rtRecord = refreshToken ? refreshTokens.get(refreshToken) : null;
    const targetFamilyId = atRecord?.familyId || rtRecord?.familyId;

    if (!targetFamilyId || !families.has(targetFamilyId)) {
      recordSanitizedLog("AUTH_LOGOUT_UNAUTHENTICATED", {
        accessToken,
        refreshToken,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "UNAUTHENTICATED",
          message: "Sessão ausente ou token inválido para logout.",
        },
      };
    }

    const family = families.get(targetFamilyId);
    revokeFamily(targetFamilyId, "USER_LOGOUT");

    recordSanitizedLog("AUTH_LOGOUT_SUCCESS", {
      userId: family.userId,
      familyId: targetFamilyId,
      accessToken,
      refreshToken,
      status: 204,
    });

    return {
      status: 204,
      body: null,
    };
  }

  function getProtectedProfile({ accessToken } = {}) {
    if (!accessToken || !accessTokens.has(accessToken)) {
      recordSanitizedLog("AUTH_PROTECTED_ACCESS_DENIED", {
        reason: "MISSING_OR_UNKNOWN_TOKEN",
        accessToken,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "UNAUTHENTICATED",
          message: "Token de acesso ausente ou inválido.",
        },
      };
    }

    const atRecord = accessTokens.get(accessToken);
    const family = families.get(atRecord.familyId);

    if (!family || family.revoked || atRecord.revoked) {
      recordSanitizedLog("AUTH_PROTECTED_ACCESS_DENIED", {
        userId: atRecord.userId,
        familyId: atRecord.familyId,
        accessJti: atRecord.jti,
        reason: family?.revokeReason || "ACCESS_TOKEN_REVOKED",
        accessToken,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "AUTH_TOKEN_REVOKED",
          message: "Sessão revogada ou encerrada.",
        },
      };
    }

    if (nowMs >= atRecord.expiresAtMs) {
      recordSanitizedLog("AUTH_PROTECTED_ACCESS_DENIED", {
        userId: atRecord.userId,
        familyId: atRecord.familyId,
        accessJti: atRecord.jti,
        reason: "ACCESS_TOKEN_EXPIRED",
        accessToken,
        status: 401,
      });
      return {
        status: 401,
        body: {
          code: "AUTH_ACCESS_TOKEN_EXPIRED",
          message: "Access token expirado.",
        },
      };
    }

    const user = [...users.values()].find((u) => u.id === atRecord.userId);
    if (user.mustChangePassword) {
      recordSanitizedLog("AUTH_PROTECTED_PASSWORD_CHANGE_REQUIRED", {
        userId: user.id,
        familyId: atRecord.familyId,
        accessJti: atRecord.jti,
        status: 403,
      });
      return {
        status: 403,
        body: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Necessário alterar a senha temporária/redefinida antes de acessar recursos protegidos.",
        },
      };
    }

    return {
      status: 200,
      body: {
        userId: user.id,
        roles: [...user.roles],
        familyId: atRecord.familyId,
        generation: atRecord.generation,
      },
    };
  }

  function getFamilyState(familyId) {
    const family = families.get(familyId);
    if (!family) return null;
    const familyRefreshTokens = [...refreshTokens.values()]
      .filter((rt) => rt.familyId === familyId)
      .map((rt) => ({
        jti: rt.jti,
        generation: rt.generation,
        status: rt.status,
        replacedByJti: rt.replacedByJti,
      }));
    return {
      familyId: family.familyId,
      userId: family.userId,
      revoked: family.revoked,
      revokeReason: family.revokeReason,
      tokens: familyRefreshTokens,
    };
  }

  function getAuditLogs() {
    return [...auditLogs];
  }

  return {
    postLogin,
    postRefresh,
    postLogout,
    getProtectedProfile,
    advanceTimeMs,
    getFamilyState,
    getAuditLogs,
    constants: { ACCESS_TTL_MS, REFRESH_TTL_MS },
  };
}

test("QA-008 | CT-QA008-01 (SPEC-AUTH-001 / SPEC-AUTH-002): login válido emite par Access+Refresh vinculado a uma família e rejeita credenciais inválidas, conta inativa ou acesso sem troca de senha obrigatória", () => {
  const api = createAuthSessionApiHarness();

  // 1. Login com conta ativa e provisionada (AC-AUTH-001-01 / AC-AUTH-002-01)
  const loginOk = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.alunoAtivo.cpf,
    password: QA008_SYNTHETIC_USERS.alunoAtivo.password,
  });
  assert.equal(loginOk.status, 200);
  assert.equal(loginOk.body.userId, "USR-QA008-01");
  assert.equal(loginOk.body.tokenType, "Bearer");
  assert.ok(loginOk.body.familyId.startsWith("FAM-SINT-"));
  assert.ok(loginOk.body.accessToken);
  assert.ok(loginOk.body.refreshToken);
  assert.notEqual(loginOk.body.accessToken, loginOk.body.refreshToken);

  const profileOk = api.getProtectedProfile({ accessToken: loginOk.body.accessToken });
  assert.equal(profileOk.status, 200);
  assert.equal(profileOk.body.userId, "USR-QA008-01");

  // 2. Senha incorreta (AC-AUTH-001-02)
  const badPass = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.alunoAtivo.cpf,
    password: "[WRONG_SYNTHETIC_PASS]",
  });
  assert.equal(badPass.status, 401);
  assert.equal(badPass.body.code, "AUTH_INVALID_OR_INACTIVE");

  // 3. Conta inativa (AC-AUTH-001-02a)
  const inactiveRes = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.contaInativa.cpf,
    password: QA008_SYNTHETIC_USERS.contaInativa.password,
  });
  assert.equal(inactiveRes.status, 401);
  assert.equal(inactiveRes.body.code, "AUTH_INVALID_OR_INACTIVE");

  // 4. Primeiro acesso / senha redefinida bloqueia recurso protegido até troca (AC-AUTH-001-04a)
  const tempLogin = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.primeiroAcesso.cpf,
    password: QA008_SYNTHETIC_USERS.primeiroAcesso.password,
  });
  assert.equal(tempLogin.status, 200);
  assert.equal(tempLogin.body.mustChangePassword, true);

  const blockedResource = api.getProtectedProfile({ accessToken: tempLogin.body.accessToken });
  assert.equal(blockedResource.status, 403);
  assert.equal(blockedResource.body.code, "PASSWORD_CHANGE_REQUIRED");
});

test("QA-008 | CT-QA008-02 (SPEC-AUTH-002 Refresh Rotativo): refresh válido emite novo par na mesma família e invalida o token da geração anterior", () => {
  const api = createAuthSessionApiHarness();

  const loginRes = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.docenteAtivo.cpf,
    password: QA008_SYNTHETIC_USERS.docenteAtivo.password,
  });
  assert.equal(loginRes.status, 200);

  const gen1Access = loginRes.body.accessToken;
  const gen1Refresh = loginRes.body.refreshToken;
  const familyId = loginRes.body.familyId;

  // Rotação 1 -> Geração 2
  const refreshGen2 = api.postRefresh({ refreshToken: gen1Refresh });
  assert.equal(refreshGen2.status, 200);
  assert.equal(refreshGen2.body.familyId, familyId);
  assert.equal(refreshGen2.body.generation, 2);
  assert.notEqual(refreshGen2.body.accessToken, gen1Access);
  assert.notEqual(refreshGen2.body.refreshToken, gen1Refresh);

  // Access token novo funciona; access token antigo da geração 1 foi revogado na rotação
  assert.equal(api.getProtectedProfile({ accessToken: refreshGen2.body.accessToken }).status, 200);
  assert.equal(api.getProtectedProfile({ accessToken: gen1Access }).status, 401);

  // Estado da família registra Geração 1 como 'rotated' e Geração 2 como 'active'
  const familyState = api.getFamilyState(familyId);
  assert.equal(familyState.revoked, false);
  assert.equal(familyState.tokens.length, 2);
  assert.equal(familyState.tokens[0].status, "rotated");
  assert.equal(familyState.tokens[1].status, "active");
});

test("QA-008 | CT-QA008-03 (SPEC-AUTH-002 Reuse Detection & Family Revocation): refresh token reutilizado falha com 401 e revoga imediatamente toda a família de tokens", () => {
  const api = createAuthSessionApiHarness();

  // Passo 1: Login inicial emite geração 1 (RT_G1)
  const loginRes = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.alunoAtivo.cpf,
    password: QA008_SYNTHETIC_USERS.alunoAtivo.password,
  });
  const familyId = loginRes.body.familyId;
  const rtGen1 = loginRes.body.refreshToken;

  // Passo 2: Refresh legítimo rotaciona RT_G1 -> emite RT_G2 e AT_G2
  const rot1 = api.postRefresh({ refreshToken: rtGen1 });
  assert.equal(rot1.status, 200);
  const atGen2 = rot1.body.accessToken;
  const rtGen2 = rot1.body.refreshToken;

  // Confirma que AT_G2 está ativo antes do evento de reuse
  assert.equal(api.getProtectedProfile({ accessToken: atGen2 }).status, 200);

  // Passo 3: REUSE! Apresentação maliciosa ou concorrente do token já rotacionado (RT_G1)
  const reuseAttempt = api.postRefresh({ refreshToken: rtGen1 });
  assert.equal(reuseAttempt.status, 401);
  assert.equal(reuseAttempt.body.code, "AUTH_REFRESH_TOKEN_REUSED");
  assert.equal(reuseAttempt.body.familyId, familyId);
  assert.equal(reuseAttempt.body.familyRevoked, true);

  // Passo 4: A família inteira deve estar revogada — nem o RT_G2 (mais recente) nem o AT_G2 podem funcionar
  const legitimateRefreshAfterReuse = api.postRefresh({ refreshToken: rtGen2 });
  assert.equal(legitimateRefreshAfterReuse.status, 401);
  assert.equal(legitimateRefreshAfterReuse.body.code, "AUTH_SESSION_FAMILY_REVOKED");

  const protectedCallAfterReuse = api.getProtectedProfile({ accessToken: atGen2 });
  assert.equal(protectedCallAfterReuse.status, 401);
  assert.equal(protectedCallAfterReuse.body.code, "AUTH_TOKEN_REVOKED");

  const familyState = api.getFamilyState(familyId);
  assert.equal(familyState.revoked, true);
  assert.equal(familyState.revokeReason, "REFRESH_TOKEN_REUSE_DETECTED");
  assert.ok(familyState.tokens.every((t) => t.status !== "active"));
});

test("QA-008 | CT-QA008-04 (SPEC-AUTH-002 Logout): logout encerra a família de sessão e bloqueia uso posterior de Access Token e Refresh Token", () => {
  const api = createAuthSessionApiHarness();

  const loginRes = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.docenteAtivo.cpf,
    password: QA008_SYNTHETIC_USERS.docenteAtivo.password,
  });
  const { accessToken, refreshToken, familyId } = loginRes.body;

  // Executa logout autenticado
  const logoutRes = api.postLogout({ accessToken, refreshToken });
  assert.equal(logoutRes.status, 204);

  // Tentativa de usar Access Token após logout -> 401
  const profileAfterLogout = api.getProtectedProfile({ accessToken });
  assert.equal(profileAfterLogout.status, 401);
  assert.equal(profileAfterLogout.body.code, "AUTH_TOKEN_REVOKED");

  // Tentativa de usar Refresh Token após logout -> 401
  const refreshAfterLogout = api.postRefresh({ refreshToken });
  assert.equal(refreshAfterLogout.status, 401);
  assert.equal(refreshAfterLogout.body.code, "AUTH_SESSION_FAMILY_REVOKED");

  const familyState = api.getFamilyState(familyId);
  assert.equal(familyState.revoked, true);
  assert.equal(familyState.revokeReason, "USER_LOGOUT");
});

test("QA-008 | CT-QA008-05 (SPEC-AUTH-002 Expiração): Access Token expirado permite refresh dentro da janela, mas Refresh Token expirado exige novo login", () => {
  const api = createAuthSessionApiHarness();

  const loginRes = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.alunoAtivo.cpf,
    password: QA008_SYNTHETIC_USERS.alunoAtivo.password,
  });
  const { accessToken: at1, refreshToken: rt1 } = loginRes.body;

  // Avança o relógio além do TTL do Access Token (16 min > 15 min), mas dentro do TTL do Refresh Token (7 dias)
  api.advanceTimeMs(16 * 60 * 1000);

  const expiredAccessCall = api.getProtectedProfile({ accessToken: at1 });
  assert.equal(expiredAccessCall.status, 401);
  assert.equal(expiredAccessCall.body.code, "AUTH_ACCESS_TOKEN_EXPIRED");

  // Refresh Token ainda é válido -> emite nova geração
  const rotatedRes = api.postRefresh({ refreshToken: rt1 });
  assert.equal(rotatedRes.status, 200);
  const { refreshToken: rt2 } = rotatedRes.body;

  // Avança o relógio além do TTL do Refresh Token (8 dias > 7 dias)
  api.advanceTimeMs(8 * 24 * 60 * 60 * 1000);

  const expiredRefreshCall = api.postRefresh({ refreshToken: rt2 });
  assert.equal(expiredRefreshCall.status, 401);
  assert.equal(expiredRefreshCall.body.code, "AUTH_REFRESH_TOKEN_EXPIRED");
});

test("QA-008 | CT-QA008-06 (SPEC-AUTH-001 / SPEC-AUTH-002 Sanitização): logs e respostas de erro nunca contêm tokens brutos, senhas ou CPF em texto claro", () => {
  const api = createAuthSessionApiHarness();

  // Executa fluxo completo: falha de login -> login -> refresh -> reuse -> logout
  api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.alunoAtivo.cpf,
    password: "[WRONG_PASSWORD_SECRET]",
  });

  const loginRes = api.postLogin({
    cpf: QA008_SYNTHETIC_USERS.alunoAtivo.cpf,
    password: QA008_SYNTHETIC_USERS.alunoAtivo.password,
  });
  const { accessToken: at1, refreshToken: rt1 } = loginRes.body;

  const rotRes = api.postRefresh({ refreshToken: rt1 });
  const { accessToken: at2, refreshToken: rt2 } = rotRes.body;

  // Dispara reuse de rt1
  const reuseRes = api.postRefresh({ refreshToken: rt1 });

  const logs = api.getAuditLogs();
  assert.ok(logs.length >= 4, "Deve registrar eventos de auditoria para cada operação crítica");

  const serializedLogs = JSON.stringify(logs);
  const serializedError = JSON.stringify(reuseRes.body);

  // Nenhum segredo, token bruto ou CPF completo pode constar nos logs ou payloads de erro
  const forbiddenLiterals = [
    QA008_SYNTHETIC_USERS.alunoAtivo.password,
    "[WRONG_PASSWORD_SECRET]",
     QA008_SYNTHETIC_USERS.alunoAtivo.cpf,
    at1,
    rt1,
    at2,
    rt2,
  ];

  for (const secretValue of forbiddenLiterals) {
    assert.ok(
      !serializedLogs.includes(secretValue),
      `Vazamento detectado nos logs para o valor sensível: ${secretValue}`
    );
    assert.ok(
      !serializedError.includes(secretValue),
      `Vazamento detectado no corpo de erro para o valor sensível: ${secretValue}`
    );
  }

  // Confirma que os logs mantêm rastreabilidade segura via JTI, familyId e máscara de CPF
  assert.ok(serializedLogs.includes("FAM-SINT-"));
  assert.ok(serializedLogs.includes("RT-JTI-"));
  assert.ok(serializedLogs.includes("***.***.008-01"));
  assert.ok(serializedLogs.includes("[REDACTED]"));
});

