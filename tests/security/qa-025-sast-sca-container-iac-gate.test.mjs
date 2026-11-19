import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// ============================================================================
// QA-025 (Issue #25) - SAST/SCA/container/IaC sem High/Critical pendente
// SPECs Cobertas: Todas as SPECs implementadas e seus contratos/artefatos
// Dependências: INF-003, INF-006
// ============================================================================

const REQUIRED_FRONTS = ['SAST', 'SCA', 'CONTAINER', 'IAC'];

/**
 * Avalia o gate consolidado de segurança estática e infraestrutura (SAST, SCA, Container, IaC).
 * Regra QA-025:
 * - As 4 frentes devem possuir relatório/versão registrados.
 * - Nenhum achado High/Critical pode permanecer sem correção ou aceite formal com owner, prazo e mitigação.
 */
function evaluateStaticSecurityGate({
  frontReports = [],
  approvedExceptions = [],
  referenceDate = '2026-11-19T20:00:00Z'
}) {
  const missingFronts = REQUIRED_FRONTS.filter(
    (front) => !frontReports.some((r) => String(r.front).toUpperCase() === front && r.tool && r.toolVersion && r.targetVersion)
  );

  if (missingFronts.length > 0) {
    return {
      gateStatus: 'FAIL',
      reason: 'MISSING_REQUIRED_SCAN_FRONTS',
      missingFronts,
      blockingFindings: [],
      acceptedFindings: []
    };
  }

  const now = new Date(referenceDate).getTime();
  const blockingFindings = [];
  const acceptedFindings = [];

  for (const report of frontReports) {
    for (const finding of report.findings || []) {
      const severity = String(finding.severity || '').toUpperCase();
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        const matchingException = approvedExceptions.find(
          (ex) => ex.front === report.front && ex.findingId === finding.findingId
        );

        const hasValidMetadata =
          matchingException &&
          Boolean(matchingException.exceptionId) &&
          Boolean(matchingException.owner) &&
          Boolean(matchingException.approvedBy) &&
          Boolean(matchingException.mitigation) &&
          Boolean(matchingException.defectIssue) &&
          Boolean(matchingException.expiresAt) &&
          new Date(matchingException.expiresAt).getTime() > now;

        if (hasValidMetadata) {
          acceptedFindings.push({
            front: report.front,
            ...finding,
            exceptionId: matchingException.exceptionId,
            owner: matchingException.owner,
            expiresAt: matchingException.expiresAt
          });
        } else {
          blockingFindings.push({
            front: report.front,
            ...finding,
            rejectionReason: matchingException
              ? 'EXCEPTION_EXPIRED_OR_MISSING_REQUIRED_FIELDS'
              : 'UNRESOLVED_HIGH_OR_CRITICAL_WITHOUT_ACCEPTANCE'
          });
        }
      }
    }
  }

  if (blockingFindings.length > 0) {
    return {
      gateStatus: 'FAIL',
      reason: 'UNRESOLVED_HIGH_OR_CRITICAL_FINDINGS',
      missingFronts: [],
      blockingFindings,
      acceptedFindings
    };
  }

  if (acceptedFindings.length > 0) {
    return {
      gateStatus: 'WARN',
      reason: 'HIGH_OR_CRITICAL_COVERED_BY_FORMAL_RISK_ACCEPTANCE',
      missingFronts: [],
      blockingFindings: [],
      acceptedFindings
    };
  }

  return {
    gateStatus: 'PASS',
    reason: 'ALL_FOUR_FRONTS_CLEAN_OF_HIGH_CRITICAL',
    missingFronts: [],
    blockingFindings: [],
    acceptedFindings: []
  };
}

function sanitizeScannerLogs(rawOutput) {
  const serialized = JSON.stringify(rawOutput);
  const sanitized = serialized
    .replace(/(ghp_|github_pat_)[A-Za-z0-9_]+/gi, '[REDACTED_TOKEN]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(\\*")(password|secret|apiKey|token)(\\*"\s*:\s*\\*")[^"\\]+(\\?")/gi, '$1$2$3[REDACTED]$4');

  return JSON.parse(sanitized);
}

// ============================================================================
// SUÍTE DE TESTES: QA-025
// ============================================================================
describe('QA-025: SAST/SCA/Container/IaC sem High/Critical Pendente (#25)', () => {
  let policy = null;

  before(async () => {
    process.env.NODE_ENV = 'test';
    const rawPolicy = await readFile(new URL('./scanners/qa-025-scanners-policy.json', import.meta.url), 'utf8');
    policy = JSON.parse(rawPolicy);
  });

  describe('1. Política e Cobertura das Quatro Frentes (SAST, SCA, Container, IaC)', () => {
    it('CT-QA025-01: Deve exigir todas as 4 frentes com ferramenta, versão e escopo definidos na política', () => {
      assert.equal(policy.workId, 'QA-025');
      assert.deepEqual(policy.blockingSeverities, ['HIGH', 'CRITICAL']);
      const fronts = policy.requiredFronts.map((f) => f.front);
      assert.deepEqual(fronts, ['SAST', 'SCA', 'CONTAINER', 'IAC']);

      for (const item of policy.requiredFronts) {
        assert.ok(item.tool, `Ferramenta obrigatória para ${item.front}`);
        assert.ok(item.toolVersion, `Versão obrigatória para ${item.front}`);
        assert.ok(Array.isArray(item.scope) && item.scope.length > 0, `Escopo obrigatório para ${item.front}`);
      }
    });

    it('CT-QA025-02: Deve reprovar (FAIL) se alguma das 4 frentes não possuir relatório ou versão avaliada', () => {
      const incompleteReports = [
        { front: 'SAST', tool: 'CodeQL', toolVersion: '2.x', targetVersion: 'abc1234', findings: [] },
        { front: 'SCA', tool: 'npm audit', toolVersion: '10.x', targetVersion: 'abc1234', findings: [] },
        { front: 'CONTAINER', tool: 'Trivy', toolVersion: '0.56.x', targetVersion: 'abc1234', findings: [] }
        // IAC ausente propositalmente
      ];

      const result = evaluateStaticSecurityGate({ frontReports: incompleteReports });
      assert.equal(result.gateStatus, 'FAIL');
      assert.equal(result.reason, 'MISSING_REQUIRED_SCAN_FRONTS');
      assert.deepEqual(result.missingFronts, ['IAC']);
    });
  });

  describe('2. Bloqueio por Severidade High/Critical e Política de Aceite de Risco', () => {
    const cleanFourFronts = [
      { front: 'SAST', tool: 'CodeQL', toolVersion: '2.x', targetVersion: 'abc1234', findings: [] },
      { front: 'SCA', tool: 'npm audit', toolVersion: '10.x', targetVersion: 'abc1234', findings: [] },
      { front: 'CONTAINER', tool: 'Trivy', toolVersion: '0.56.x', targetVersion: 'abc1234', findings: [] },
      { front: 'IAC', tool: 'Checkov', toolVersion: '3.x', targetVersion: 'abc1234', findings: [] }
    ];

    it('CT-QA025-03: Deve reprovar (FAIL) quando houver achado High ou Critical sem aceite formal de risco', () => {
      const reportsWithCritical = structuredClone(cleanFourFronts);
      reportsWithCritical[1].findings.push({
        findingId: 'CVE-2026-0001',
        severity: 'CRITICAL',
        package: 'synthetic-lib',
        summary: 'Remote Code Execution in synthetic dependency'
      });

      const result = evaluateStaticSecurityGate({
        frontReports: reportsWithCritical,
        approvedExceptions: []
      });

      assert.equal(result.gateStatus, 'FAIL');
      assert.equal(result.reason, 'UNRESOLVED_HIGH_OR_CRITICAL_FINDINGS');
      assert.equal(result.blockingFindings.length, 1);
      assert.equal(result.blockingFindings[0].rejectionReason, 'UNRESOLVED_HIGH_OR_CRITICAL_WITHOUT_ACCEPTANCE');
    });

    it('CT-QA025-04: Deve reprovar (FAIL) exceção formal com prazo vencido ou sem owner/mitigação/issue', () => {
      const reportsWithHigh = structuredClone(cleanFourFronts);
      reportsWithHigh[2].findings.push({
        findingId: 'TRIVY-CONT-01',
        severity: 'HIGH',
        summary: 'Base image running as root'
      });

      const expiredResult = evaluateStaticSecurityGate({
        frontReports: reportsWithHigh,
        referenceDate: '2026-11-19T20:00:00Z',
        approvedExceptions: [
          {
            exceptionId: 'EXC-025-01',
            front: 'CONTAINER',
            findingId: 'TRIVY-CONT-01',
            owner: 'Squad DevOps',
            approvedBy: 'Gabriel Ribeiro (@gabrrkl7)',
            mitigation: 'Container isolado sem privilégios de host',
            defectIssue: 'INF-015',
            expiresAt: '2026-11-10T00:00:00Z' // Vencido!
          }
        ]
      });

      assert.equal(expiredResult.gateStatus, 'FAIL');
      assert.equal(
        expiredResult.blockingFindings[0].rejectionReason,
        'EXCEPTION_EXPIRED_OR_MISSING_REQUIRED_FIELDS'
      );
    });

    it('CT-QA025-05: Deve classificar como WARN com aceite formal vigente e PASS quando 0 High/Critical pendentes', () => {
      const reportsWithHigh = structuredClone(cleanFourFronts);
      reportsWithHigh[3].findings.push({
        findingId: 'CKV_DOCKER_2',
        severity: 'HIGH',
        summary: 'HEALTHCHECK instruction missing in Dockerfile'
      });

      const warnResult = evaluateStaticSecurityGate({
        frontReports: reportsWithHigh,
        referenceDate: '2026-11-19T20:00:00Z',
        approvedExceptions: [
          {
            exceptionId: 'EXC-025-02',
            front: 'IAC',
            findingId: 'CKV_DOCKER_2',
            owner: 'Squad Cloud/DevOps',
            approvedBy: 'Gabriel Ribeiro (@gabrrkl7)',
            mitigation: 'Liveness probe gerenciada externamente no orquestrador',
            defectIssue: 'INF-016',
            expiresAt: '2026-12-05T23:59:59Z'
          }
        ]
      });

      assert.equal(warnResult.gateStatus, 'WARN');
      assert.equal(warnResult.acceptedFindings.length, 1);

      const passResult = evaluateStaticSecurityGate({
        frontReports: cleanFourFronts,
        approvedExceptions: []
      });

      assert.equal(passResult.gateStatus, 'PASS');
      assert.equal(passResult.blockingFindings.length, 0);
    });
  });

  describe('3. Sanitização de Relatórios dos Scanners', () => {
    it('CT-QA025-06: Deve mascarar tokens e segredos eventualmente capturados nos logs dos scanners', () => {
      const rawScannerOutput = {
        front: 'SAST',
        authHeader: 'Bearer synthetic.jwt.token',
        envLeak: '{"apiKey":"[SYNTHETIC_KEY_VAL]","password":"[SYNTHETIC_PASS]"}'
      };

      const sanitized = sanitizeScannerLogs(rawScannerOutput);
      assert.match(sanitized.authHeader, /Bearer \[REDACTED\]/);
      assert.match(sanitized.envLeak, /"apiKey":"\[REDACTED\]"/);
      assert.match(sanitized.envLeak, /"password":"\[REDACTED\]"/);
    });
  });

  after(() => {
    delete process.env.NODE_ENV;
  });
});
