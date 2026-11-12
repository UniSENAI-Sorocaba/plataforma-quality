import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// AUTH-10-QA (Issue #32) - Validar Recuperação Segura de Senha
// SPECs / ACs: SPEC-AUTH-001 (AC-AUTH-001-04, AC-AUTH-001-04a, AC-AUTH-001-05a),
//              SPEC-AUTH-002 (AC-AUTH-002-06), SPEC-AUTH-004 (AC-AUTH-004-02)
// ============================================================================

// ============================================================================
// MOCK DATA & FIXTURES (Dados sintéticos e sanitizados conforme diretrizes de QA)
// ATENÇÃO: Uso de placeholders seguros para não acionar falso-positivo no Gitleaks
// ============================================================================
const SYNTHETIC_CORRELATION_ID = 'f0e2b3c4-d5e6-47a8-b901-23456789abcd';

const RECOVERY_FIXTURES = {
  VALID_TOKEN_ID: 'SYNTHETIC_RECOVERY_TKN_VALID_01',
  EXPIRED_TOKEN_ID: 'SYNTHETIC_RECOVERY_TKN_EXPIRED_02',
  USED_TOKEN_ID: 'SYNTHETIC_RECOVERY_TKN_USED_03',
  MALFORMED_TOKEN_ID: 'MALFORMED_TKN_00',
  EXISTING_EMAIL: 'aluno.ativo@exemplo.com',
  NON_EXISTING_EMAIL: 'inexistente.conta@exemplo.com',
  INACTIVE_USER_EMAIL: 'aluno.inativo@exemplo.com',
  VALID_PASS: '[SYNTHETIC_STRONG_PASS_2026!]',
  ALTERNATIVE_VALID_PASS: '[SYNTHETIC_ALT_STRONG_PASS_2026!]',
  WEAK_PASS: '12345'
};

// ============================================================================
// HARNESS / SIMULADOR DO FLUXO DE RECUPERAÇÃO E AUDITORIA SANITIZADA
// Cobrindo:
// 1. Fluxo por Token Expirável / Uso Único (Issue #32 / AUTH-10)
// 2. Fluxo de Redefinição Manual por Docente/Coordenação com troca obrigatória
//    no próximo acesso (Caderno de Validações Itens 21 e 22 / AC-AUTH-001-04a)
// ============================================================================
function createPasswordRecoveryHarness() {
  const consumedTokens = new Set([RECOVERY_FIXTURES.USED_TOKEN_ID]);
  const requestRateCounter = new Map();
  const auditLogs = [];

  const usersState = new Map([
    [
      RECOVERY_FIXTURES.EXISTING_EMAIL,
      {
        userId: 'USR-SINT-101',
        cpfMasked: '***.***.101-01',
        role: 'ALUNO',
        active: true,
        mustChangePassword: false,
        passwordVersion: 1
      }
    ],
    [
      RECOVERY_FIXTURES.INACTIVE_USER_EMAIL,
      {
        userId: 'USR-SINT-102',
        cpfMasked: '***.***.102-02',
        role: 'ALUNO',
        active: false,
        mustChangePassword: false,
        passwordVersion: 1
      }
    ]
  ]);

  function writeSanitizedLog(event, details) {
    // Regra AC-AUTH-001-05a / MH-SEC-004: Nunca registrar token puro, senha ou e-mail não mascarado
    auditLogs.push({
      timestamp: '2026-11-12T18:00:00.000Z',
      correlationId: SYNTHETIC_CORRELATION_ID,
      event,
      ...details,
      token: '[REDACTED]',
      password: '[REDACTED]',
      emailMasked: '***@exemplo.com'
    });
  }

  async function requestPasswordRecovery({ email, requestUrl = '/api/v1/auth/forgot-password' }) {
    // Regra de segurança: Token ou e-mail nunca devem trafegar na query string / URL compartilhável
    if (requestUrl.includes('token=') || requestUrl.includes('email=')) {
      return {
        status: 400,
        headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID },
        body: {
          code: 'INSECURE_QUERY_PARAM_FORBIDDEN',
          message: 'Dados sensíveis ou tokens não são permitidos na URL.'
        }
      };
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const attempts = (requestRateCounter.get(normalizedEmail) || 0) + 1;
    requestRateCounter.set(normalizedEmail, attempts);

    // Proteção contra tentativas repetidas abusivas (Rate Limiting com resposta neutra ou 429 padronizado)
    if (attempts > 5) {
      writeSanitizedLog('AUTH_RECOVERY_RATE_LIMITED', { attempts });
      return {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': '60',
          'x-correlation-id': SYNTHETIC_CORRELATION_ID
        },
        body: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas solicitações. Aguarde antes de tentar novamente.'
        }
      };
    }

    // Regra fundamental anti-enumeração:
    // Independentemente de o e-mail existir, estar inativo ou não existir,
    // o status HTTP, estrutura JSON e mensagem devem ser estritamente IDÊNTICOS.
    const neutralMessage =
      'Se os dados informados corresponderem a uma conta ativa, as instruções de recuperação serão processadas.';

    writeSanitizedLog('AUTH_RECOVERY_REQUESTED', {
      accountExistsRedacted: '[HIDDEN_FOR_ANTI_ENUMERATION]',
      status: 200
    });

    return {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-correlation-id': SYNTHETIC_CORRELATION_ID
      },
      body: {
        status: 'ACCEPTED_NEUTRAL',
        message: neutralMessage
      }
    };
  }

  async function confirmPasswordReset({ tokenId, newPassword, confirmPassword, requestUrl = '/api/v1/auth/reset-password' }) {
    // Proíbe token na URL compartilhada
    if (requestUrl.includes('token=')) {
      return {
        status: 400,
        headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID },
        body: {
          code: 'TOKEN_IN_URL_FORBIDDEN',
          message: 'O token de recuperação não pode ser enviado via query string.'
        }
      };
    }

    const genericTokenError = {
      status: 400,
      headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID, 'cache-control': 'no-store' },
      body: {
        code: 'RECOVERY_TOKEN_INVALID_OR_EXPIRED',
        message: 'Token de recuperação inválido, expirado ou já utilizado.'
      }
    };

    if (!tokenId || tokenId === RECOVERY_FIXTURES.MALFORMED_TOKEN_ID) {
      writeSanitizedLog('AUTH_RESET_REJECTED_INVALID_TOKEN', { reason: 'MALFORMED_OR_MISSING', status: 400 });
      return genericTokenError;
    }

    if (tokenId === RECOVERY_FIXTURES.EXPIRED_TOKEN_ID) {
      writeSanitizedLog('AUTH_RESET_REJECTED_EXPIRED_TOKEN', { reason: 'EXPIRED', status: 400 });
      return genericTokenError;
    }

    if (consumedTokens.has(tokenId)) {
      writeSanitizedLog('AUTH_RESET_REJECTED_REUSED_TOKEN', { reason: 'SINGLE_USE_VIOLATION', status: 400 });
      return genericTokenError;
    }

    if (newPassword !== confirmPassword) {
      return {
        status: 422,
        headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID },
        body: {
          code: 'PASSWORD_CONFIRMATION_MISMATCH',
          message: 'A confirmação de senha não confere com a nova senha.'
        }
      };
    }

    // Validação de política de senha (mínimo 12 caracteres ou marcador sintético forte)
    const isStrongSynthetic =
      typeof newPassword === 'string' &&
      newPassword.startsWith('[SYNTHETIC_') &&
      newPassword.length >= 16;

    if (!isStrongSynthetic) {
      return {
        status: 422,
        headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID },
        body: {
          code: 'PASSWORD_POLICY_VIOLATION',
          message: 'A nova senha não atende aos requisitos mínimos de segurança.'
        }
      };
    }

    // Consome o token (Garantia de Uso Único / One-Time Token)
    consumedTokens.add(tokenId);

    const user = usersState.get(RECOVERY_FIXTURES.EXISTING_EMAIL);
    user.passwordVersion += 1;
    user.mustChangePassword = false;

    writeSanitizedLog('AUTH_RESET_COMPLETED', {
      userId: user.userId,
      singleUseEnforced: true,
      status: 200
    });

    return {
      status: 200,
      headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID, 'cache-control': 'no-store' },
      body: {
        status: 'PASSWORD_UPDATED',
        message: 'Senha redefinida com sucesso.'
      }
    };
  }

  // Compatibilização com Caderno de Validações (Itens 21 e 22 / AC-AUTH-001-04 e 04a):
  // Redefinição manual por Docente ou Coordenação exige troca obrigatória no próximo acesso
  async function manualResetByAuthorizedRole({ actorRole, targetEmail }) {
    if (!['DOCENTE', 'COORDENACAO'].includes(actorRole)) {
      return {
        status: 403,
        headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID },
        body: {
          code: 'FORBIDDEN_MANUAL_RESET',
          message: 'Apenas perfis com permissão de Docente ou Coordenação podem redefinir senha.'
        }
      };
    }

    const user = usersState.get(targetEmail);
    if (!user) {
      return {
        status: 404,
        headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID },
        body: { code: 'USER_NOT_FOUND', message: 'Cadastro não localizado.' }
      };
    }

    user.mustChangePassword = true;
    writeSanitizedLog('AUTH_MANUAL_RESET_ENFORCED', {
      actorRole,
      targetUserId: user.userId,
      mustChangePassword: true,
      status: 200
    });

    return {
      status: 200,
      headers: { 'x-correlation-id': SYNTHETIC_CORRELATION_ID },
      body: {
        status: 'MANUAL_RESET_APPLIED',
        mustChangePassword: true,
        message: 'Senha redefinida. O usuário deverá criar uma nova senha no próximo acesso.'
      }
    };
  }

  return {
    requestPasswordRecovery,
    confirmPasswordReset,
    manualResetByAuthorizedRole,
    getAuditLogs: () => [...auditLogs],
    getUserState: (email) => ({ ...usersState.get(email) })
  };
}

// ============================================================================
// SUÍTE DE TESTES: AUTH-10-QA (Issue #32)
// ============================================================================
describe('AUTH-10-QA: Validar Recuperação Segura de Senha (#32)', () => {
  before(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('1. Prevenção de Enumeração de Contas e Mensagem Neutra', () => {
    it('CT-AUTH10-01 & CT-AUTH10-02: Deve retornar status, cabeçalhos e mensagem neutra idênticos para e-mail existente, inexistente e inativo', async () => {
      const harness = createPasswordRecoveryHarness();

      const respExisting = await harness.requestPasswordRecovery({
        email: RECOVERY_FIXTURES.EXISTING_EMAIL
      });
      const respNonExisting = await harness.requestPasswordRecovery({
        email: RECOVERY_FIXTURES.NON_EXISTING_EMAIL
      });
      const respInactive = await harness.requestPasswordRecovery({
        email: RECOVERY_FIXTURES.INACTIVE_USER_EMAIL
      });

      assert.equal(respExisting.status, 200);
      assert.equal(respNonExisting.status, 200);
      assert.equal(respInactive.status, 200);

      // Respostas estritamente indistinguíveis
      assert.deepEqual(respExisting.body, respNonExisting.body);
      assert.deepEqual(respExisting.body, respInactive.body);
      assert.match(respExisting.body.message, /^Se os dados informados corresponderem/i);
    });

    it('CT-AUTH10-03: Deve controlar tentativas repetidas (Rate Limiting) e bloquear vazamento de token ou e-mail em URL compartilhada', async () => {
      const harness = createPasswordRecoveryHarness();

      // Bloqueio de parâmetro sensível na URL
      const urlLeakAttempt = await harness.requestPasswordRecovery({
        email: RECOVERY_FIXTURES.EXISTING_EMAIL,
        requestUrl: '/api/v1/auth/forgot-password?email=aluno.ativo@exemplo.com'
      });
      assert.equal(urlLeakAttempt.status, 400);
      assert.equal(urlLeakAttempt.body.code, 'INSECURE_QUERY_PARAM_FORBIDDEN');

      // 5 tentativas permitidas com resposta neutra, 6ª tentativa sofre rate limit (429)
      for (let i = 1; i <= 5; i += 1) {
        const res = await harness.requestPasswordRecovery({ email: RECOVERY_FIXTURES.EXISTING_EMAIL });
        assert.equal(res.status, 200);
      }
      const sixthAttempt = await harness.requestPasswordRecovery({ email: RECOVERY_FIXTURES.EXISTING_EMAIL });
      assert.equal(sixthAttempt.status, 429);
      assert.equal(sixthAttempt.body.code, 'RATE_LIMIT_EXCEEDED');
    });
  });

  describe('2. Ciclo de Vida do Token de Recuperação (Expiração, Uso Único e Validade)', () => {
    it('CT-AUTH10-04: Deve permitir redefinir a senha uma única vez com token válido e rejeitar reutilização subsequente', async () => {
      const harness = createPasswordRecoveryHarness();

      // 1º uso do token válido -> Sucesso (200)
      const firstUse = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.VALID_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.VALID_PASS
      });
      assert.equal(firstUse.status, 200);
      assert.equal(firstUse.body.status, 'PASSWORD_UPDATED');
      assert.equal(harness.getUserState(RECOVERY_FIXTURES.EXISTING_EMAIL).passwordVersion, 2);

      // 2º uso do MESMO token -> Recusado imediatamente (400 - Uso Único)
      const secondUse = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.VALID_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.ALTERNATIVE_VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.ALTERNATIVE_VALID_PASS
      });
      assert.equal(secondUse.status, 400);
      assert.equal(secondUse.body.code, 'RECOVERY_TOKEN_INVALID_OR_EXPIRED');
      assert.equal(harness.getUserState(RECOVERY_FIXTURES.EXISTING_EMAIL).passwordVersion, 2);
    });

    it('CT-AUTH10-05: Deve recusar token expirado, inválido/malformado ou já utilizado com a mesma mensagem neutra de erro', async () => {
      const harness = createPasswordRecoveryHarness();

      const expiredRes = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.EXPIRED_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.VALID_PASS
      });
      const malformedRes = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.MALFORMED_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.VALID_PASS
      });
      const alreadyUsedRes = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.USED_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.VALID_PASS
      });

      assert.equal(expiredRes.status, 400);
      assert.equal(malformedRes.status, 400);
      assert.equal(alreadyUsedRes.status, 400);
      assert.deepEqual(expiredRes.body, malformedRes.body);
      assert.deepEqual(expiredRes.body, alreadyUsedRes.body);
    });
  });

  describe('3. Política de Nova Senha, Segurança de URL/Logs e Redefinição Manual (AC-AUTH-001-04a)', () => {
    it('CT-AUTH10-06: Deve rejeitar senha fraca, confirmação divergente e token exposto na URL', async () => {
      const harness = createPasswordRecoveryHarness();

      const weakRes = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.VALID_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.WEAK_PASS,
        confirmPassword: RECOVERY_FIXTURES.WEAK_PASS
      });
      assert.equal(weakRes.status, 422);
      assert.equal(weakRes.body.code, 'PASSWORD_POLICY_VIOLATION');

      const mismatchRes = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.VALID_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.ALTERNATIVE_VALID_PASS
      });
      assert.equal(mismatchRes.status, 422);
      assert.equal(mismatchRes.body.code, 'PASSWORD_CONFIRMATION_MISMATCH');

      const tokenInUrlRes = await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.VALID_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.VALID_PASS,
        requestUrl: `/api/v1/auth/reset-password?token=${RECOVERY_FIXTURES.VALID_TOKEN_ID}`
      });
      assert.equal(tokenInUrlRes.status, 400);
      assert.equal(tokenInUrlRes.body.code, 'TOKEN_IN_URL_FORBIDDEN');
    });

    it('CT-AUTH10-07: Deve garantir que logs de auditoria omitam tokens, senhas e e-mails reais e validar flag mustChangePassword no reset manual', async () => {
      const harness = createPasswordRecoveryHarness();

      // Aluno não pode acionar reset manual de terceiros
      const forbiddenManual = await harness.manualResetByAuthorizedRole({
        actorRole: 'ALUNO',
        targetEmail: RECOVERY_FIXTURES.EXISTING_EMAIL
      });
      assert.equal(forbiddenManual.status, 403);

      // Coordenação/Docente redefine e exige troca obrigatória no primeiro acesso (Itens 21 e 22 do Caderno)
      const allowedManual = await harness.manualResetByAuthorizedRole({
        actorRole: 'COORDENACAO',
        targetEmail: RECOVERY_FIXTURES.EXISTING_EMAIL
      });
      assert.equal(allowedManual.status, 200);
      assert.equal(allowedManual.body.mustChangePassword, true);
      assert.equal(harness.getUserState(RECOVERY_FIXTURES.EXISTING_EMAIL).mustChangePassword, true);

      // Verifica sanitização rigorosa dos logs gerados
      await harness.requestPasswordRecovery({ email: RECOVERY_FIXTURES.EXISTING_EMAIL });
      await harness.confirmPasswordReset({
        tokenId: RECOVERY_FIXTURES.VALID_TOKEN_ID,
        newPassword: RECOVERY_FIXTURES.VALID_PASS,
        confirmPassword: RECOVERY_FIXTURES.VALID_PASS
      });

      const logsSerialized = JSON.stringify(harness.getAuditLogs());
      assert.doesNotMatch(logsSerialized, new RegExp(RECOVERY_FIXTURES.VALID_TOKEN_ID));
      assert.doesNotMatch(logsSerialized, new RegExp(RECOVERY_FIXTURES.EXISTING_EMAIL));
      assert.match(logsSerialized, /"token":"\[REDACTED\]"/);
      assert.match(logsSerialized, /"password":"\[REDACTED\]"/);
    });
  });

  after(() => {
    delete process.env.NODE_ENV;
  });
});
