import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Limiares obrigatórios definidos pelo Critério de Aceite da Issue QA-007.
 */
export const COVERAGE_THRESHOLDS = {
  backend: {
    lines: 80.0,
    branches: 70.0,
    label: "Backend Geral (APIs, Serviços e Repositórios)",
  },
  criticalDomains: {
    lines: 90.0,
    branches: 80.0,
    label: "Domínios Críticos (Auth, Permissões, Notas, Horas e Certificados)",
  },
  frontendTestable: {
    lines: 70.0,
    label: "Frontend Testável (Lógica, Hooks, Utilitários e Componentes Críticos)",
  },
};

/**
 * Mapeamento das 13 SPECs da matriz QA-001 e sua classificação de criticidade.
 */
export const QA_001_SPECS_MAP = [
  { id: "SPEC-AUTH-001", name: "Login e Autenticação", critical: true, components: ["backend", "frontend"] },
  { id: "SPEC-AUTH-002", name: "Sessão e Ciclo do Token", critical: true, components: ["backend"] },
  { id: "SPEC-AUTH-003", name: "Controle de Acesso (RBAC/ABAC)", critical: true, components: ["backend", "frontend"] },
  { id: "SPEC-AUTH-004", name: "Auditoria e Privacidade", critical: true, components: ["backend"] },
  { id: "SPEC-PI-001", name: "Propostas e Equipes", critical: false, components: ["backend", "frontend"] },
  { id: "SPEC-PI-002", name: "Bancas Avaliadoras", critical: false, components: ["backend", "frontend"] },
  { id: "SPEC-PI-003", name: "Notas e Conceitos", critical: true, components: ["backend", "frontend"] },
  { id: "SPEC-PI-004", name: "Entregáveis e Uploads", critical: false, components: ["backend", "frontend"] },
  { id: "SPEC-EXT-001", name: "Editais de Extensão", critical: false, components: ["backend", "frontend"] },
  { id: "SPEC-EXT-002", name: "Horas e Atividades Complementares", critical: true, components: ["backend", "frontend"] },
  { id: "SPEC-EXT-003", name: "Certificados e Revogação", critical: true, components: ["backend", "frontend"] },
  { id: "SPEC-PORTAL-001", name: "Catálogo e Vitrine", critical: false, components: ["backend", "frontend"] },
  { id: "SPEC-PORTAL-002", name: "Métricas de Impacto", critical: false, components: ["backend", "frontend"] },
];

/**
 * Avalia as métricas de cobertura contra os limiares obrigatórios da QA-007.
 * 
 * @param {Object} metrics Dados de cobertura coletados ou declarados
 * @param {Object} [customThresholds] Limiares opcionais (padrão COVERAGE_THRESHOLDS)
 * @returns {Object} Resultado detalhado do gate com status PASS/FAIL e exitCode
 */
export function evaluateCoverageGate(metrics, customThresholds = COVERAGE_THRESHOLDS) {
  const checks = [];

  // 1. Validação de Backend Geral
  if (metrics.backend) {
    const backendLines = Number(metrics.backend.lines ?? 0);
    const backendBranches = Number(metrics.backend.branches ?? 0);

    const passLines = backendLines >= customThresholds.backend.lines;
    checks.push({
      scope: "Backend Geral",
      metric: "lines",
      expected: customThresholds.backend.lines,
      actual: backendLines,
      difference: (backendLines - customThresholds.backend.lines).toFixed(2),
      result: passLines ? "PASS" : "FAIL",
      reason: passLines
        ? `Cobertura de linhas atende ao mínimo (${backendLines}% >= ${customThresholds.backend.lines}%)`
        : `BLOQUEIO: Cobertura de linhas insuficiente no backend (${backendLines}% < ${customThresholds.backend.lines}%)`,
    });

    const passBranches = backendBranches >= customThresholds.backend.branches;
    checks.push({
      scope: "Backend Geral",
      metric: "branches",
      expected: customThresholds.backend.branches,
      actual: backendBranches,
      difference: (backendBranches - customThresholds.backend.branches).toFixed(2),
      result: passBranches ? "PASS" : "FAIL",
      reason: passBranches
        ? `Cobertura de branches atende ao mínimo (${backendBranches}% >= ${customThresholds.backend.branches}%)`
        : `BLOQUEIO: Cobertura de branches insuficiente no backend (${backendBranches}% < ${customThresholds.backend.branches}%)`,
    });
  } else {
    checks.push({
      scope: "Backend Geral",
      metric: "all",
      expected: customThresholds.backend.lines,
      actual: 0,
      difference: `-${customThresholds.backend.lines}`,
      result: "FAIL",
      reason: "BLOQUEIO: Dados de cobertura do Backend ausentes.",
    });
  }

  // 2. Validação de Domínios Críticos (Auth, Notas, Certificados, etc.)
  if (metrics.criticalDomains && typeof metrics.criticalDomains === "object") {
    for (const [domainName, domainData] of Object.entries(metrics.criticalDomains)) {
      const critLines = Number(domainData.lines ?? 0);
      const critBranches = Number(domainData.branches ?? 0);

      const passLines = critLines >= customThresholds.criticalDomains.lines;
      checks.push({
        scope: `Domínio Crítico [${domainName}]`,
        metric: "lines",
        expected: customThresholds.criticalDomains.lines,
        actual: critLines,
        difference: (critLines - customThresholds.criticalDomains.lines).toFixed(2),
        result: passLines ? "PASS" : "FAIL",
        reason: passLines
          ? `Cobertura de linhas em domínio crítico atende ao mínimo (${critLines}% >= ${customThresholds.criticalDomains.lines}%)`
          : `BLOQUEIO: Linhas insuficientes no domínio crítico ${domainName} (${critLines}% < ${customThresholds.criticalDomains.lines}%)`,
      });

      const passBranches = critBranches >= customThresholds.criticalDomains.branches;
      checks.push({
        scope: `Domínio Crítico [${domainName}]`,
        metric: "branches",
        expected: customThresholds.criticalDomains.branches,
        actual: critBranches,
        difference: (critBranches - customThresholds.criticalDomains.branches).toFixed(2),
        result: passBranches ? "PASS" : "FAIL",
        reason: passBranches
          ? `Cobertura de branches em domínio crítico atende ao mínimo (${critBranches}% >= ${customThresholds.criticalDomains.branches}%)`
          : `BLOQUEIO: Branches insuficientes no domínio crítico ${domainName} (${critBranches}% < ${customThresholds.criticalDomains.branches}%)`,
      });
    }
  } else {
    checks.push({
      scope: "Domínios Críticos",
      metric: "all",
      expected: customThresholds.criticalDomains.lines,
      actual: 0,
      difference: `-${customThresholds.criticalDomains.lines}`,
      result: "FAIL",
      reason: "BLOQUEIO: Nenhum domínio crítico fornecido para avaliação.",
    });
  }

  // 3. Validação de Frontend Testável
  if (metrics.frontendTestable) {
    const feLines = Number(metrics.frontendTestable.lines ?? 0);
    const passFeLines = feLines >= customThresholds.frontendTestable.lines;

    checks.push({
      scope: "Frontend Testável",
      metric: "lines",
      expected: customThresholds.frontendTestable.lines,
      actual: feLines,
      difference: (feLines - customThresholds.frontendTestable.lines).toFixed(2),
      result: passFeLines ? "PASS" : "FAIL",
      reason: passFeLines
        ? `Cobertura de frontend testável atende ao mínimo (${feLines}% >= ${customThresholds.frontendTestable.lines}%)`
        : `BLOQUEIO: Cobertura de frontend testável insuficiente (${feLines}% < ${customThresholds.frontendTestable.lines}%)`,
    });
  } else {
    checks.push({
      scope: "Frontend Testável",
      metric: "lines",
      expected: customThresholds.frontendTestable.lines,
      actual: 0,
      difference: `-${customThresholds.frontendTestable.lines}`,
      result: "FAIL",
      reason: "BLOQUEIO: Dados de cobertura do Frontend testável ausentes.",
    });
  }

  const counts = {
    PASS: checks.filter((c) => c.result === "PASS").length,
    FAIL: checks.filter((c) => c.result === "FAIL").length,
  };

  const overallResult = counts.FAIL > 0 ? "FAIL" : "PASS";
  const exitCode = overallResult === "FAIL" ? 1 : 0;

  return {
    thresholds: customThresholds,
    checks,
    counts,
    overallResult,
    exitCode,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Formata o relatório de avaliação para visualização em console e arquivos Markdown.
 */
export function formatCoverageReport(evaluation) {
  const lines = [];
  const divider = "=".repeat(88);
  const subDivider = "-".repeat(88);

  lines.push(divider);
  lines.push("QUALITY GATE DE COBERTURA DE CÓDIGO (QA-007)");
  lines.push(`Avaliado em:      ${evaluation.evaluatedAt}`);
  lines.push(`Resultado Geral:  ${evaluation.overallResult} (Exit Code: ${evaluation.exitCode})`);
  lines.push(divider);
  lines.push("");

  lines.push("VERIFICAÇÕES DE GATE POR ESCOPO E MÉTRICA:");
  lines.push(subDivider);

  for (const check of evaluation.checks) {
    const symbol = check.result === "PASS" ? "✅ [PASS]" : "❌ [FAIL]";
    lines.push(`${symbol} ${check.scope.padEnd(30)} | Métrica: ${check.metric.padEnd(8)} | Obtido: ${String(check.actual).padStart(5)}% | Mínimo: ${String(check.expected).padStart(5)}%`);
    lines.push(`         Motivo: ${check.reason}`);
    lines.push("");
  }

  lines.push(subDivider);
  lines.push(`RESUMO: ${evaluation.counts.PASS} Verificações Aprovadas | ${evaluation.counts.FAIL} Violações Bloqueantes`);
  if (evaluation.overallResult === "FAIL") {
    lines.push("STATUS DO MERGE: ❌ BLOQUEADO (Exit Code 1). Um ou mais limites não foram atingidos.");
  } else {
    lines.push("STATUS DO MERGE: ✅ APROVADO (Exit Code 0). Todos os quality gates de cobertura foram satisfeitos.");
  }
  lines.push(divider);

  return lines.join("\n");
}

/**
 * Executa cenário demonstrativo ou lê arquivo JSON de cobertura informado via CLI.
 */
async function main() {
  const args = process.argv.slice(2);
  let summaryPath = null;
  let isJson = false;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--summary" && args[i + 1]) {
      summaryPath = args[i + 1];
      i += 1;
    } else if (args[i] === "--json") {
      isJson = true;
    }
  }

  let metrics;
  if (summaryPath) {
    const raw = await readFile(summaryPath, "utf8");
    metrics = JSON.parse(raw);
  } else {
    // Exemplo de métricas de referência satisfazendo os gates
    metrics = {
      backend: { lines: 83.5, branches: 74.2 },
      criticalDomains: {
        "auth (SPEC-AUTH-001..004)": { lines: 92.4, branches: 85.0 },
        "grades (SPEC-PI-003)": { lines: 91.0, branches: 82.5 },
        "certificates (SPEC-EXT-003)": { lines: 94.0, branches: 88.0 },
      },
      frontendTestable: { lines: 75.8 },
    };
  }

  const evaluation = evaluateCoverageGate(metrics);
  if (isJson) {
    console.log(JSON.stringify(evaluation, null, 2));
  } else {
    console.log(formatCoverageReport(evaluation));
  }

  process.exitCode = evaluation.exitCode;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  await main();
}

