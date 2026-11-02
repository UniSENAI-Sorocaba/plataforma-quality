import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Escopo normativo da regressão consolidada QA-023.
 */
export const REGRESSION_SUITES = [
  {
    id: "QA-019",
    name: "Performance & Carga (k6)",
    specs: ["SPEC-AUTH-001", "SPEC-PI-001", "SPEC-EXT-001", "SPEC-PORTAL-001"],
    target: "200 RPS, p95 <= 500ms, Taxa de Erro < 1%",
  },
  {
    id: "QA-020",
    name: "Acessibilidade Digital (WCAG 2.1 AA)",
    specs: ["SPEC-AUTH-001..004", "SPEC-PI-001..004", "SPEC-EXT-001..003", "SPEC-PORTAL-001..002"],
    target: "Teclado, Foco, Labels, Nomes, Contraste >= 4.5:1, Leitor de tela",
  },
  {
    id: "QA-021",
    name: "Contratos de API (OpenAPI 3.1 & Schemas)",
    specs: ["SPEC-AUTH-001..004", "SPEC-PI-001..004", "SPEC-EXT-001..003"],
    target: "Compatibilidade bidirecional, tipos e campos obrigatórios sem breaking changes",
  },
  {
    id: "QA-022",
    name: "Segurança, Auditoria & Privacidade (LGPD)",
    specs: ["SPEC-AUTH-004", "SPEC-EXT-003", "SPEC-PORTAL-002"],
    target: "Headers de segurança (HSTS, CSP), SAST/DAST, ausência de vazamento de segredos",
  },
];

/**
 * Avalia e consolida o resultado da execução da regressão.
 * Cada falha DEVE possuir obrigatoriamente:
 * - Severidade
 * - Reprodução
 * - Owner
 * - Issue
 * - Status
 */
export function runRegressionAnalysis(suiteResults) {
  const consolidated = [];
  const recordedDefects = [];

  for (const suite of REGRESSION_SUITES) {
    const result = suiteResults[suite.id] || { status: "SKIPPED", metrics: {}, defects: [] };

    consolidated.push({
      id: suite.id,
      name: suite.name,
      status: result.status,
      metrics: result.metrics,
      defectsCount: (result.defects || []).length,
    });

    if (result.defects && Array.isArray(result.defects)) {
      for (const defect of result.defects) {
        // Validação estrita dos 5 campos obrigatórios do critério de aceite
        const hasAllFields =
          defect.severidade &&
          defect.reproducao &&
          defect.owner &&
          defect.issue &&
          defect.status;

        recordedDefects.push({
          ...defect,
          suiteId: suite.id,
          compliant: Boolean(hasAllFields),
        });
      }
    }
  }

  const counts = {
    totalSuites: REGRESSION_SUITES.length,
    passedSuites: consolidated.filter((s) => s.status === "PASS").length,
    warnSuites: consolidated.filter((s) => s.status === "WARN").length,
    failedSuites: consolidated.filter((s) => s.status === "FAIL").length,
    totalDefects: recordedDefects.length,
  };

  const overallStatus = counts.failedSuites > 0 ? "FAIL" : counts.warnSuites > 0 ? "WARN" : "PASS";

  return {
    suites: consolidated,
    defects: recordedDefects,
    counts,
    overallStatus,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Formata o relatório consolidado de regressão para exibição e logs de CI.
 */
export function formatRegressionReport(analysis) {
  const lines = [];
  const divider = "=".repeat(88);
  const subDivider = "-".repeat(88);

  lines.push(divider);
  lines.push("RELATÓRIO CONSOLIDADO DE REGRESSÃO (QA-023)");
  lines.push(`Data/Hora:        ${analysis.executedAt}`);
  lines.push(`Status Geral:     ${analysis.overallStatus}`);
  lines.push(`Resumo:           ${analysis.counts.passedSuites} PASS | ${analysis.counts.warnSuites} WARN | ${analysis.counts.failedSuites} FAIL`);
  lines.push(`Total de Defeitos Mapeados: ${analysis.counts.totalDefects}`);
  lines.push(divider);
  lines.push("");

  lines.push("RESULTADO POR SUÍTE DE REGRESSÃO (QA-019..022):");
  lines.push(subDivider);

  for (const s of analysis.suites) {
    const symbol = s.status === "PASS" ? "✅ [PASS]" : s.status === "WARN" ? "⚠️ [WARN]" : "❌ [FAIL]";
    lines.push(`${symbol} [${s.id}] ${s.name.padEnd(45)} | Defeitos: ${s.defectsCount}`);
  }
  lines.push("");

  if (analysis.defects.length > 0) {
    lines.push("DEFEITOS DETECTADOS COM CAMPOS MANDATÓRIOS:");
    lines.push(subDivider);
    for (const d of analysis.defects) {
      lines.push(`- ID / Título:  ${d.id} — ${d.titulo}`);
      lines.push(`  Issue:        ${d.issue} (Suíte: ${d.suiteId})`);
      lines.push(`  Severidade:   ${d.severidade}`);
      lines.push(`  Status:       ${d.status}`);
      lines.push(`  Owner:        ${d.owner}`);
      lines.push(`  Reprodução:   ${d.reproducao}`);
      lines.push("");
    }
  }

  lines.push(divider);
  return lines.join("\n");
}

/**
 * Execução de referência para validação via CLI.
 */
function main() {
  const referenceResults = {
    "QA-019": {
      status: "WARN",
      metrics: { p95: "680ms (Teto: 500ms)", rps: 215, errorRate: "0.2%" },
      defects: [
        {
          id: "DEF-QA019-01",
          titulo: "Latência p95 no catálogo público do portal acima do limiar",
          severidade: "Média (P2)",
          reproducao: "Disparar carga de 200 RPS no endpoint GET /api/v1/portal/catalogo com k6 por 3 minutos.",
          owner: "Squad Portal / Backend",
          issue: "PORTAL-001 / QA-019",
          status: "Aberto",
        },
      ],
    },
    "QA-020": {
      status: "WARN",
      metrics: { wcagScore: "96/100", criticalViolations: 0 },
      defects: [
        {
          id: "DEF-QA020-01",
          titulo: "Botão fechar modal de entregáveis sem aria-label",
          severidade: "Alta (P1)",
          reproducao: "Acessar modal de novo entregável e inspecionar botão com leitor de tela NVDA.",
          owner: "Squad Frontend (FE-017)",
          issue: "SPEC-PI-004 / QA-020",
          status: "Aberto",
        },
        {
          id: "DEF-QA020-02",
          titulo: "Contraste insuficiente em badge de status de extensão",
          severidade: "Média (P2)",
          reproducao: "Acessar /extensao/atividades e calcular contraste do badge 'Em breve' (1.85:1 < 4.5:1).",
          owner: "Squad Frontend (FE-017)",
          issue: "SPEC-EXT-001 / QA-020",
          status: "Aberto",
        },
      ],
    },
    "QA-021": {
      status: "WARN",
      metrics: { schemaCompliance: "98%", breakingChanges: 0 },
      defects: [
        {
          id: "DEF-QA021-01",
          titulo: "Discrepância no tipo do campo expiresIn no contrato OpenAPI de login",
          severidade: "Média (P2)",
          reproducao: "Submeter POST /api/v1/auth/login e comparar schema OpenAPI (esperava integer, recebeu string).",
          owner: "Squad Backend (BE-006)",
          issue: "SPEC-AUTH-001 / QA-021",
          status: "Em correção",
        },
      ],
    },
    "QA-022": {
      status: "PASS",
      metrics: { exposedSecrets: 0, criticalVulnerabilities: 0, lgpdAudit: "100% compliant" },
      defects: [],
    },
  };

  const analysis = runRegressionAnalysis(referenceResults);
  console.log(formatRegressionReport(analysis));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  main();
}

