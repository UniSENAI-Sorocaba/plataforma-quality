import assert from "node:assert/strict";
import test from "node:test";

import {
  COVERAGE_THRESHOLDS,
  QA_001_SPECS_MAP,
  evaluateCoverageGate,
} from "../../scripts/coverage-gate.mjs";

test("QA-007: aprova o gate (PASS e exitCode 0) quando todas as métricas atendem aos limites", () => {
  const metrics = {
    backend: { lines: 81.5, branches: 72.0 },
    criticalDomains: {
      "auth (SPEC-AUTH-001..004)": { lines: 93.0, branches: 82.5 },
      "notas (SPEC-PI-003)": { lines: 90.5, branches: 80.0 },
    },
    frontendTestable: { lines: 71.0 },
  };

  const evaluation = evaluateCoverageGate(metrics);

  assert.equal(evaluation.overallResult, "PASS");
  assert.equal(evaluation.exitCode, 0);
  assert.equal(evaluation.counts.FAIL, 0);
  assert.ok(evaluation.counts.PASS >= 4);
});

test("QA-007: confirma bloqueio (FAIL e exitCode 1) quando backend lines < 80%", () => {
  const metrics = {
    backend: { lines: 79.9, branches: 75.0 }, // 79.9 < 80.0
    criticalDomains: {
      auth: { lines: 95.0, branches: 85.0 },
    },
    frontendTestable: { lines: 80.0 },
  };

  const evaluation = evaluateCoverageGate(metrics);

  assert.equal(evaluation.overallResult, "FAIL");
  assert.equal(evaluation.exitCode, 1);
  assert.ok(evaluation.counts.FAIL >= 1);

  const failedCheck = evaluation.checks.find(
    (c) => c.scope === "Backend Geral" && c.metric === "lines"
  );
  assert.ok(failedCheck);
  assert.equal(failedCheck.result, "FAIL");
  assert.match(failedCheck.reason, /BLOQUEIO: Cobertura de linhas insuficiente no backend/);
});

test("QA-007: confirma bloqueio (FAIL e exitCode 1) quando backend branches < 70%", () => {
  const metrics = {
    backend: { lines: 85.0, branches: 69.5 }, // 69.5 < 70.0
    criticalDomains: {
      auth: { lines: 95.0, branches: 85.0 },
    },
    frontendTestable: { lines: 75.0 },
  };

  const evaluation = evaluateCoverageGate(metrics);

  assert.equal(evaluation.overallResult, "FAIL");
  assert.equal(evaluation.exitCode, 1);

  const failedCheck = evaluation.checks.find(
    (c) => c.scope === "Backend Geral" && c.metric === "branches"
  );
  assert.ok(failedCheck);
  assert.equal(failedCheck.result, "FAIL");
  assert.match(failedCheck.reason, /BLOQUEIO: Cobertura de branches insuficiente no backend/);
});

test("QA-007: confirma bloqueio (FAIL e exitCode 1) quando domínio crítico lines < 90%", () => {
  const metrics = {
    backend: { lines: 85.0, branches: 75.0 },
    criticalDomains: {
      "auth (SPEC-AUTH-001..004)": { lines: 89.9, branches: 85.0 }, // 89.9 < 90.0
    },
    frontendTestable: { lines: 75.0 },
  };

  const evaluation = evaluateCoverageGate(metrics);

  assert.equal(evaluation.overallResult, "FAIL");
  assert.equal(evaluation.exitCode, 1);

  const failedCheck = evaluation.checks.find(
    (c) => c.scope.includes("auth") && c.metric === "lines"
  );
  assert.ok(failedCheck);
  assert.equal(failedCheck.result, "FAIL");
  assert.match(failedCheck.reason, /BLOQUEIO: Linhas insuficientes no domínio crítico/);
});

test("QA-007: confirma bloqueio (FAIL e exitCode 1) quando domínio crítico branches < 80%", () => {
  const metrics = {
    backend: { lines: 85.0, branches: 75.0 },
    criticalDomains: {
      "certificados (SPEC-EXT-003)": { lines: 95.0, branches: 78.0 }, // 78.0 < 80.0
    },
    frontendTestable: { lines: 75.0 },
  };

  const evaluation = evaluateCoverageGate(metrics);

  assert.equal(evaluation.overallResult, "FAIL");
  assert.equal(evaluation.exitCode, 1);

  const failedCheck = evaluation.checks.find(
    (c) => c.scope.includes("certificados") && c.metric === "branches"
  );
  assert.ok(failedCheck);
  assert.equal(failedCheck.result, "FAIL");
  assert.match(failedCheck.reason, /BLOQUEIO: Branches insuficientes no domínio crítico/);
});

test("QA-007: confirma bloqueio (FAIL e exitCode 1) quando frontend testável < 70%", () => {
  const metrics = {
    backend: { lines: 85.0, branches: 75.0 },
    criticalDomains: {
      auth: { lines: 95.0, branches: 85.0 },
    },
    frontendTestable: { lines: 68.5 }, // 68.5 < 70.0
  };

  const evaluation = evaluateCoverageGate(metrics);

  assert.equal(evaluation.overallResult, "FAIL");
  assert.equal(evaluation.exitCode, 1);

  const failedCheck = evaluation.checks.find(
    (c) => c.scope === "Frontend Testável" && c.metric === "lines"
  );
  assert.ok(failedCheck);
  assert.equal(failedCheck.result, "FAIL");
  assert.match(failedCheck.reason, /BLOQUEIO: Cobertura de frontend testável insuficiente/);
});

test("QA-007: cobre todas as 13 SPECs da matriz QA-001 no inventário", () => {
  assert.equal(QA_001_SPECS_MAP.length, 13);

  const expectedSpecs = [
    "SPEC-AUTH-001",
    "SPEC-AUTH-002",
    "SPEC-AUTH-003",
    "SPEC-AUTH-004",
    "SPEC-PI-001",
    "SPEC-PI-002",
    "SPEC-PI-003",
    "SPEC-PI-004",
    "SPEC-EXT-001",
    "SPEC-EXT-002",
    "SPEC-EXT-003",
    "SPEC-PORTAL-001",
    "SPEC-PORTAL-002",
  ];

  for (const specId of expectedSpecs) {
    const found = QA_001_SPECS_MAP.find((s) => s.id === specId);
    assert.ok(found, `A SPEC ${specId} deve estar cadastrada no inventário da QA-007`);
  }
});

