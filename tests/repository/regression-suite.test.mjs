import assert from "node:assert/strict";
import test from "node:test";

import {
  REGRESSION_SUITES,
  runRegressionAnalysis,
} from "../../scripts/regression-suite.mjs";

test("QA-023: cobre as 4 suítes de regressão obrigatórias (QA-019..022)", () => {
  assert.equal(REGRESSION_SUITES.length, 4);

  const expectedSuites = ["QA-019", "QA-020", "QA-021", "QA-022"];
  for (const id of expectedSuites) {
    const found = REGRESSION_SUITES.find((s) => s.id === id);
    assert.ok(found, `A suíte de regressão ${id} deve estar mapeada`);
  }
});

test("QA-023: valida que toda falha possui Severidade, Reprodução, Owner, Issue e Status", () => {
  const mockResults = {
    "QA-019": {
      status: "FAIL",
      metrics: { p95: "750ms" },
      defects: [
        {
          id: "DEF-01",
          titulo: "Latência elevada",
          severidade: "Alta",
          reproducao: "Passos detalhados de reprodução sanitizados",
          owner: "Squad Backend",
          issue: "PORTAL-001",
          status: "Aberto",
        },
      ],
    },
    "QA-020": { status: "PASS", metrics: {}, defects: [] },
    "QA-021": { status: "PASS", metrics: {}, defects: [] },
    "QA-022": { status: "PASS", metrics: {}, defects: [] },
  };

  const analysis = runRegressionAnalysis(mockResults);

  assert.equal(analysis.defects.length, 1);
  const defect = analysis.defects[0];

  assert.ok(defect.severidade, "Campo Severidade é obrigatório");
  assert.ok(defect.reproducao, "Campo Reprodução é obrigatório");
  assert.ok(defect.owner, "Campo Owner é obrigatório");
  assert.ok(defect.issue, "Campo Issue é obrigatório");
  assert.ok(defect.status, "Campo Status é obrigatório");
  assert.equal(defect.compliant, true);
});

test("QA-023: aponta não-conformidade quando defeito não contém todos os 5 campos obrigatórios", () => {
  const incompleteResults = {
    "QA-019": {
      status: "FAIL",
      metrics: {},
      defects: [
        {
          id: "DEF-INCOMPLETO",
          titulo: "Falha sem owner nem issue",
          severidade: "Média",
          reproducao: "Passos de teste",
          // Faltam: owner, issue, status
        },
      ],
    },
    "QA-020": { status: "PASS", metrics: {}, defects: [] },
    "QA-021": { status: "PASS", metrics: {}, defects: [] },
    "QA-022": { status: "PASS", metrics: {}, defects: [] },
  };

  const analysis = runRegressionAnalysis(incompleteResults);

  assert.equal(analysis.defects.length, 1);
  assert.equal(analysis.defects[0].compliant, false);
});

test("QA-023: calcula status consolidado corretamente (FAIL se houver falha impeditiva)", () => {
  const resultsWithFail = {
    "QA-019": { status: "PASS", metrics: {}, defects: [] },
    "QA-020": { status: "FAIL", metrics: {}, defects: [] },
    "QA-021": { status: "PASS", metrics: {}, defects: [] },
    "QA-022": { status: "PASS", metrics: {}, defects: [] },
  };

  const analysis = runRegressionAnalysis(resultsWithFail);
  assert.equal(analysis.overallStatus, "FAIL");
  assert.equal(analysis.counts.failedSuites, 1);
});

