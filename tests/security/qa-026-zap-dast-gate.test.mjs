import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// ============================================================================
// QA-026 (Issue #26) - ZAP no ambiente de validação sem High/Critical pendente
// SPECs Cobertas: SPEC-AUTH-001..004, SPEC-PI-001..004, SPEC-EXT-001..003,
//                 SPEC-PORTAL-001..002 / ADR-006..011 / INF-009
// ============================================================================

const ALLOWED_VALIDATION_HOSTS = [
  'staging.plataforma.internal',
  'ephemeral-ci.plataforma.internal',
  'localhost',
  '127.0.0.1'
];

const FORBIDDEN_PRODUCTION_PATTERNS = [
  /unisenai\.edu\.br/i,
  /\.prod\./i,
  /production/i
];

// ============================================================================
// MOTOR DE AVALIAÇÃO DE GATE DAST (OWASP ZAP) & POLÍTICA DE EXCEÇÕES
// ============================================================================
function evaluateZapDastGate({
  targetUrl,
  alerts = [],
  approvedExceptions = [],
  referenceDate = '2026-11-12T19:00:00Z'
}) {
  // 1. Guardrail contra varredura acidental em Produção (Regra QA-026: proibido varrer produção)
  if (!targetUrl) {
    return {
      gateStatus: 'FAIL',
      reason: 'TARGET_URL_MISSING',
      blockingAlerts: [],
      acceptedRiskAlerts: []
    };
  }

  const isProductionTarget = FORBIDDEN_PRODUCTION_PATTERNS.some((pattern) => pattern.test(targetUrl));
  let parsedHost = '';
  try {
    parsedHost = new URL(targetUrl).hostname;
  } catch {
    return {
      gateStatus: 'FAIL',
      reason: 'INVALID_TARGET_URL',
      blockingAlerts: [],
      acceptedRiskAlerts: []
    };
  }

  if (isProductionTarget || !ALLOWED_VALIDATION_HOSTS.includes(parsedHost)) {
    return {
      gateStatus: 'FAIL',
      reason: 'UNAUTHORIZED_OR_PRODUCTION_TARGET_FORBIDDEN',
      blockingAlerts: [],
      acceptedRiskAlerts: []
    };
  }

  const now = new Date(referenceDate).getTime();
  const blockingAlerts = [];
  const acceptedRiskAlerts = [];

  for (const alert of alerts) {
    const riskLevel = String(alert.risk || '').toUpperCase();
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      // Verifica se existe aceite formal de risco válido, não expirado, com dono, aprovador, mitigação e issue
      const matchingException = approvedExceptions.find(
        (ex) => ex.pluginId === String(alert.pluginId) && ex.routePattern === alert.route
      );

      const isExceptionValid =
        matchingException &&
        Boolean(matchingException.owner) &&
        Boolean(matchingException.approvedBy) &&
        Boolean(matchingException.mitigation) &&
        Boolean(matchingException.defectIssue) &&
        Boolean(matchingException.expiresAt) &&
        new Date(matchingException.expiresAt).getTime() > now;

      if (isExceptionValid) {
        acceptedRiskAlerts.push({
          ...alert,
          exceptionId: matchingException.exceptionId,
          owner: matchingException.owner,
          approvedBy: matchingException.approvedBy,
          expiresAt: matchingException.expiresAt,
          defectIssue: matchingException.defectIssue
        });
      } else {
        blockingAlerts.push({
          ...alert,
          rejectionReason: matchingException
            ? 'EXCEPTION_EXPIRED_OR_INCOMPLETE_METADATA'
            : 'NO_FORMAL_RISK_ACCEPTANCE_OR_FIX'
        });
      }
    }
  }

  if (blockingAlerts.length > 0) {
    return {
      gateStatus: 'FAIL',
      reason: 'UNRESOLVED_HIGH_OR_CRITICAL_ALERTS',
      blockingAlerts,
      acceptedRiskAlerts
    };
  }

  if (acceptedRiskAlerts.length > 0) {
    return {
      gateStatus: 'WARN',
      reason: 'HIGH_OR_CRITICAL_COVERED_BY_TEMPORARY_RISK_ACCEPTANCE',
      blockingAlerts: [],
      acceptedRiskAlerts
    };
  }

  return {
    gateStatus: 'PASS',
    reason: 'ZERO_HIGH_OR_CRITICAL_PENDING',
    blockingAlerts: [],
    acceptedRiskAlerts: []
  };
}

function sanitizeZapReport(rawReport) {
  const serialized = JSON.stringify(rawReport);
  const sanitized = serialized
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(\\*")(password|accessToken|refreshToken)(\\*"\s*:\s*\\*")[^"\\]+(\\?")/gi, '$1$2$3[REDACTED]$4')
    .replace(/Set-Cookie:\s*[^;"]+/gi, 'Set-Cookie: [REDACTED]');

  return JSON.parse(sanitized);
}

// ============================================================================
// SUÍTE DE TESTES: QA-026 (OWASP ZAP DAST Gate & Configuração)
// ============================================================================
describe('QA-026: ZAP no Ambiente de Validação sem High/Critical Pendente (#26)', () => {
  let zapPlanContent = '';
  let zapRulesContent = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    zapPlanContent = await readFile(new URL('./zap/zap-automation-plan.yaml', import.meta.url), 'utf8');
    zapRulesContent = await readFile(new URL('./zap/zap-rules.tsv', import.meta.url), 'utf8');
  });

  describe('1. Configuração de Escopo, Autenticação e Exclusões Justificadas no ZAP', () => {
    it('CT-QA026-01: Deve definir contextos separados para rotas públicas (Portal) e autenticadas (AUTH, PI, EXT) com contas sintéticas', () => {
      assert.match(zapPlanContent, /name:\s*"Portal-Publico-Anonimo"/, 'Deve conter contexto para o Portal Público');
      assert.match(zapPlanContent, /name:\s*"Plataforma-Autenticada-RBAC"/, 'Deve conter contexto para rotas autenticadas');

      // Cobertura das rotas das SPECs
      assert.match(zapPlanContent, /\/projetos\.\*/, 'Deve cobrir catálogo público de projetos (SPEC-PORTAL-001)');
      assert.match(zapPlanContent, /\/certificados\/verificar\.\*/, 'Deve cobrir consulta pública de certificados (SPEC-EXT-003)');
      assert.match(zapPlanContent, /\/aluno\/\.\*/, 'Deve cobrir área autenticada do Aluno');
      assert.match(zapPlanContent, /\/docente\/\.\*/, 'Deve cobrir área autenticada do Docente');
      assert.match(zapPlanContent, /\/coordenacao\/\.\*/, 'Deve cobrir área autenticada da Coordenação');
      assert.match(
        zapPlanContent,
        /\/api\/v1\/\(auth\|projetos\|pi\|extensao\|horas\|avaliacoes\|arquivos\|certificados\)\/\.\*/,
        'Deve cobrir os grupos de endpoints de negócio da API v1'
      );

      // Autenticação documentada com contas exclusivamente sintéticas
      assert.match(zapPlanContent, /USR-ZAP-ALUNO/);
      assert.match(zapPlanContent, /USR-ZAP-DOCENTE/);
      assert.match(zapPlanContent, /USR-ZAP-COORD/);
      assert.match(zapPlanContent, /\[SYNTHETIC_ZAP_PASS_ALUNO\]/);
    });

    it('CT-QA026-02: Deve excluir a rota de logout do spider/activeScan e justificar todas as regras IGNORE em zap-rules.tsv', () => {
      // Exclusão de logout evita derrubar a sessão autenticada durante a varredura
      assert.match(zapPlanContent, /excludePaths:[\s\S]*\/api\/v1\/auth\/logout\.\*/);

      const ruleLines = zapRulesContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));

      assert.ok(ruleLines.length >= 10, 'Deve possuir mapeamento explícito de regras DAST');

      for (const line of ruleLines) {
        const [pluginId, action, description] = line.split('\t');
        assert.match(pluginId, /^\d+$/, `Plugin ID inválido: ${pluginId}`);
        assert.ok(['FAIL', 'WARN', 'IGNORE'].includes(action), `Ação inválida para plugin ${pluginId}: ${action}`);
        assert.ok(description && description.length > 10, `Descrição ausente para plugin ${pluginId}`);

        if (action === 'IGNORE') {
          assert.match(
            description,
            /Exclusão justificada:/i,
            `Toda regra IGNORE (${pluginId}) deve documentar justificativa técnica explícita`
          );
        }
      }
    });
  });

  describe('2. Guardrail de Ambiente: Bloqueio de Varredura em Produção (INF-009)', () => {
    it('CT-QA026-03: Deve bloquear imediatamente qualquer tentativa de apontar o ZAP para Produção ou host não autorizado', () => {
      const prodAttempt = evaluateZapDastGate({
        targetUrl: 'https://plataforma.unisenai.edu.br',
        alerts: []
      });
      assert.equal(prodAttempt.gateStatus, 'FAIL');
      assert.equal(prodAttempt.reason, 'UNAUTHORIZED_OR_PRODUCTION_TARGET_FORBIDDEN');

      const externalHostAttempt = evaluateZapDastGate({
        targetUrl: 'https://example.org',
        alerts: []
      });
      assert.equal(externalHostAttempt.gateStatus, 'FAIL');
      assert.equal(externalHostAttempt.reason, 'UNAUTHORIZED_OR_PRODUCTION_TARGET_FORBIDDEN');
    });
  });

  describe('3. Gate de Severidade High/Critical e Política de Aceite de Risco com Prazo', () => {
    it('CT-QA026-04: Deve reprovar (FAIL) quando houver achado High ou Critical sem correção e sem aceite formal de risco', () => {
      const result = evaluateZapDastGate({
        targetUrl: 'https://ephemeral-ci.plataforma.internal',
        alerts: [
          {
            pluginId: '40018',
            name: 'SQL Injection',
            risk: 'Critical',
            route: '/api/v1/projetos',
            evidence: 'Synthesized SQL error pattern'
          }
        ],
        approvedExceptions: []
      });

      assert.equal(result.gateStatus, 'FAIL');
      assert.equal(result.reason, 'UNRESOLVED_HIGH_OR_CRITICAL_ALERTS');
      assert.equal(result.blockingAlerts.length, 1);
      assert.equal(result.blockingAlerts[0].rejectionReason, 'NO_FORMAL_RISK_ACCEPTANCE_OR_FIX');
    });

    it('CT-QA026-05: Deve reprovar (FAIL) exceção de risco High/Critical cujo prazo (expiresAt) esteja vencido ou sem responsável/issue', () => {
      const expiredExceptionResult = evaluateZapDastGate({
        targetUrl: 'https://ephemeral-ci.plataforma.internal',
        referenceDate: '2026-11-12T19:00:00Z',
        alerts: [
          {
            pluginId: '10038',
            name: 'Content Security Policy (CSP) Header Not Set',
            risk: 'High',
            route: '/docente'
          }
        ],
        approvedExceptions: [
          {
            exceptionId: 'EXC-ZAP-001',
            pluginId: '10038',
            routePattern: '/docente',
            owner: 'Squad Frontend',
            approvedBy: 'Gabriel Ribeiro (@gabrrkl7)',
            mitigation: 'CSP em implementação no middleware Next.js',
            defectIssue: 'FE-021',
            expiresAt: '2026-11-01T00:00:00Z' // Vencido!
          }
        ]
      });

      assert.equal(expiredExceptionResult.gateStatus, 'FAIL');
      assert.equal(
        expiredExceptionResult.blockingAlerts[0].rejectionReason,
        'EXCEPTION_EXPIRED_OR_INCOMPLETE_METADATA'
      );
    });

    it('CT-QA026-06: Deve classificar como WARN quando achado High estiver coberto por aceite formal vigente e como PASS quando 0 High/Critical pendentes', () => {
      const warnWithValidException = evaluateZapDastGate({
        targetUrl: 'https://ephemeral-ci.plataforma.internal',
        referenceDate: '2026-11-12T19:00:00Z',
        alerts: [
          {
            pluginId: '10038',
            name: 'Content Security Policy (CSP) Header Not Set',
            risk: 'High',
            route: '/docente'
          }
        ],
        approvedExceptions: [
          {
            exceptionId: 'EXC-ZAP-002',
            pluginId: '10038',
            routePattern: '/docente',
            owner: 'Squad Frontend',
            approvedBy: 'Gabriel Ribeiro (@gabrrkl7)',
            mitigation: 'Sanitização de output ativa; header CSP agendado para Sprint S5',
            defectIssue: 'plataforma-frontend#51',
            expiresAt: '2026-11-25T23:59:59Z'
          }
        ]
      });

      assert.equal(warnWithValidException.gateStatus, 'WARN');
      assert.equal(warnWithValidException.acceptedRiskAlerts.length, 1);

      const cleanPassResult = evaluateZapDastGate({
        targetUrl: 'https://ephemeral-ci.plataforma.internal',
        alerts: [
          {
            pluginId: '10021',
            name: 'Informational Check',
            risk: 'Low',
            route: '/projetos'
          }
        ],
        approvedExceptions: []
      });

      assert.equal(cleanPassResult.gateStatus, 'PASS');
      assert.equal(cleanPassResult.blockingAlerts.length, 0);
    });
  });

  describe('4. Sanitização do Relatório ZAP (Ausência de Tokens, Senhas e Cookies Reais)', () => {
    it('CT-QA026-07: Deve mascarar automaticamente Bearer tokens, senhas e cookies nas evidências exportadas pelo ZAP', () => {
      const rawReportSample = {
        site: 'https://ephemeral-ci.plataforma.internal',
        requestHeader: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.synthetic.signature',
        responseHeader: 'Set-Cookie: session_id=synthetic_cookie_value_123; HttpOnly',
        requestBody: '{"cpf":"000.000.001-01","password":"[SYNTHETIC_ZAP_PASS_ALUNO]","accessToken":"tok_123"}'
      };

      const sanitized = sanitizeZapReport(rawReportSample);
      const serialized = JSON.stringify(sanitized);

      assert.doesNotMatch(serialized, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);
      assert.doesNotMatch(serialized, /synthetic_cookie_value_123/);
      assert.match(serialized, /Bearer \[REDACTED\]/);
      assert.match(serialized, /Set-Cookie: \[REDACTED\]/);
      assert.match(sanitized.requestBody, /"password":"\[REDACTED\]"/);
      assert.match(sanitized.requestBody, /"accessToken":"\[REDACTED\]"/);
    });
  });

  after(() => {
    delete process.env.NODE_ENV;
  });
});
