import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, "..");

export const NORMATIVE_SPECS = [
  "SPEC-AUTH-001..004",
  "SPEC-PI-001..004",
  "SPEC-EXT-001..003",
  "SPEC-PORTAL-001..002",
];

const SECRET_PATTERNS = [
  { name: "Chave privada PEM", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Token GitHub", regex: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/ },
  { name: "AWS Access Key ID", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Token JWT hardcoded", regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
];

/**
 * Lê e interpreta o arquivo .governance-baseline.
 */
export async function parseBaselineFile(rootDir = DEFAULT_ROOT_DIR) {
  const filePath = path.join(rootDir, ".governance-baseline");
  if (!existsSync(filePath)) {
    return {
      exists: false,
      repository: null,
      tag: null,
      commit: null,
      reference: "indefinida (.governance-baseline ausente)",
    };
  }

  const raw = await readFile(filePath, "utf8");
  const entries = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      entries[key] = value;
    }
  }

  const repository = entries.repository || null;
  const tag = entries.tag || null;
  const commit = entries.commit || null;
  const reference =
    tag && commit
      ? `${tag}@${commit}`
      : tag || commit || "malformada (.governance-baseline incompleto)";

  return {
    exists: true,
    raw,
    repository,
    tag,
    commit,
    reference,
  };
}

function resolveGitDir(repoPath) {
  if (!repoPath || !existsSync(repoPath)) return null;
  const dotGit = path.join(repoPath, ".git");
  if (existsSync(dotGit)) return repoPath;
  if (existsSync(path.join(repoPath, "HEAD"))) return repoPath;
  return null;
}

/**
 * Obtém o resumo de diff do repositório sob verificação.
 */
export function resolveRepositoryDiff(rootDir = DEFAULT_ROOT_DIR) {
  if (!resolveGitDir(rootDir)) {
    return ["(diretório fora de controle Git ou temporário)"];
  }
  try {
    const statusOut = execFileSync("git", ["-C", rootDir, "status", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    if (statusOut) {
      return statusOut.split(/\r?\n/).map((line) => line.trim());
    }
    const diffOut = execFileSync("git", ["-C", rootDir, "diff", "--name-status", "HEAD~1..HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    return diffOut ? diffOut.split(/\r?\n/).map((line) => line.trim()) : ["(working tree limpa em relação ao HEAD)"];
  } catch {
    return ["(HEAD inicial sem diff anterior)"];
  }
}

/**
 * Verifica a existência do commit e da tag na Governança (local ou remota),
 * registrando explicitamente a diferença entre o esperado e o encontrado.
 */
export function verifyBaselineInGovernance(baseline, options = {}) {
  const { rootDir = DEFAULT_ROOT_DIR, governanceDir, checkRemote = true } = options;
  const { repository, tag, commit } = baseline;

  const candidateDirs = [
    governanceDir,
    process.env.GOVERNANCE_DIR,
    path.resolve(rootDir, "..", "plataforma-governance"),
  ].filter(Boolean);

  for (const candidate of candidateDirs) {
    const resolvedRepo = resolveGitDir(candidate);
    if (!resolvedRepo) continue;

    let commitExists = false;
    try {
      const objType = execFileSync(
        "git",
        ["-C", resolvedRepo, "cat-file", "-t", commit],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }
      ).trim();
      commitExists = objType === "commit";
    } catch {
      commitExists = false;
    }

    if (!commitExists) {
      return {
        status: "FAIL",
        difference: `esperado tag=${tag} commit=${commit} | encontrado commit=inexistente tag=inexistente`,
        reason: `Commit ${commit} não existe no repositório da Governança (diferença: commit ausente na Governança).`,
      };
    }

    let tagCommit = null;
    try {
      tagCommit = execFileSync(
        "git",
        ["-C", resolvedRepo, "rev-parse", `refs/tags/${tag}^{commit}`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }
      ).trim();
    } catch {
      tagCommit = null;
    }

    if (!tagCommit) {
      return {
        status: "WARN",
        difference: `esperado tag=${tag} (${commit}) | encontrado tag=ausente, commit=${commit} (confirmado)`,
        reason: `Commit ${commit} existe na Governança, mas a tag ${tag} ainda não foi publicada (diferença: refs/tags/${tag} ausente); exige decisão humana (sem ela, não declare PASS).`,
      };
    }

    if (tagCommit !== commit) {
      return {
        status: "FAIL",
        difference: `esperado tag=${tag}->${commit} | encontrado tag=${tag}->${tagCommit}`,
        reason: `Divergência de baseline: a tag ${tag} resolve para ${tagCommit}, mas .governance-baseline exige ${commit}.`,
      };
    }

    return {
      status: "PASS",
      difference: `nenhuma (tag=${tag} resolve exatamente para commit=${commit})`,
      reason: `Tag ${tag} e commit ${commit} confirmados e íntegros na Governança (sem diferença entre baseline e Governança).`,
    };
  }

  if (checkRemote && repository) {
    try {
      const output = execFileSync(
        "git",
        ["ls-remote", repository, "HEAD", "refs/heads/main", `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }
      ).trim();

      const lines = output ? output.split(/\r?\n/).filter(Boolean) : [];
      const derefLine = lines.find((line) => line.endsWith(`refs/tags/${tag}^{}`));
      const directLine = lines.find((line) => line.endsWith(`refs/tags/${tag}`));
      const mainLine = lines.find((line) => line.endsWith("refs/heads/main"));
      const mainSha = mainLine ? mainLine.split(/\s+/)[0] : "desconhecido";
      const targetLine = derefLine || directLine;
      const remoteTagSha = targetLine ? targetLine.split(/\s+/)[0] : null;

      if (!remoteTagSha) {
        return {
          status: "WARN",
          difference: `esperado refs/tags/${tag}->${commit} | remoto: refs/tags/${tag}=ausente (refs/heads/main=${mainSha})`,
          reason: `Tag ${tag} ainda não foi publicada em ${repository} (diferença registrada: refs/tags/${tag} ausente no remoto; main em ${mainSha}); sem ela, não declare PASS.`,
        };
      }

      if (remoteTagSha === commit) {
        return {
          status: "PASS",
          difference: `nenhuma (refs/tags/${tag} resolve para ${commit})`,
          reason: `Tag remota ${tag} confirmada em ${repository} resolvendo exatamente para ${commit}.`,
        };
      }

      return {
        status: "FAIL",
        difference: `esperado refs/tags/${tag}->${commit} | remoto refs/tags/${tag}->${remoteTagSha}`,
        reason: `Tag remota ${tag} resolve para ${remoteTagSha}, divergindo do SHA ${commit} fixado na baseline.`,
      };
    } catch {
      return {
        status: "WARN",
        difference: `esperado tag=${tag}->${commit} | remoto/local indisponível (tag não confirmada)`,
        reason: `Repositório local ../plataforma-governance ausente e consulta remota a ${repository} indisponível; tag ${tag} ainda não foi publicada/confirmada (não declarar PASS).`,
      };
    }
  }

  return {
    status: "WARN",
    difference: `esperado tag=${tag}->${commit} | tag não verificada (modo offline)`,
    reason: `Tag ${tag} ainda não pôde ser confirmada na Governança para o SHA ${commit}; exige verificação/decisão humana.`,
  };
}

async function listTrackedTextFiles(dirPath, baseDir = dirPath) {
  const results = [];
  if (!existsSync(dirPath)) return results;
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listTrackedTextFiles(fullPath, baseDir)));
    } else if (/\.(md|mjs|js|json|ya?ml|txt)$/i.test(entry.name)) {
      results.push(path.relative(baseDir, fullPath).replace(/\\/g, "/"));
    }
  }
  return results;
}

/**
 * Executa todas as verificações de conformidade do repositório.
 */
export async function runComplianceCheck(options = {}) {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : DEFAULT_ROOT_DIR;
  const baseline = await parseBaselineFile(rootDir);
  const baselineRef = baseline.reference;
  const diffFiles = resolveRepositoryDiff(rootDir);
  const checks = [];

  let baselineDifference = "não avaliada";

  const addCheck = (rule, file, result, reason) => {
    checks.push({
      rule,
      file,
      reason,
      result,
      baseline: baselineRef,
    });
  };

  // 1. ADR-008: Estrutura e formato de .governance-baseline
  const validRepo = Boolean(baseline.repository && /^https?:\/\/.+/.test(baseline.repository));
  const validTag = Boolean(baseline.tag && /^governance-v\d+\.\d+\.\d+$/.test(baseline.tag));
  const validCommit = Boolean(baseline.commit && /^[0-9a-f]{40}$/.test(baseline.commit));

  if (!baseline.exists) {
    addCheck(
      "ADR-008",
      ".governance-baseline",
      "FAIL",
      "Arquivo .governance-baseline não encontrado na raiz do repositório."
    );
  } else if (!validRepo || !validTag || !validCommit) {
    const missing = [];
    if (!validRepo) missing.push("repository válido (URL)");
    if (!validTag) missing.push("tag no padrão governance-vMAJOR.MINOR.PATCH");
    if (!validCommit) missing.push("commit SHA-1 de 40 caracteres hexadecimais");
    addCheck(
      "ADR-008",
      ".governance-baseline",
      "FAIL",
      `Formato inválido em .governance-baseline: ${missing.join(", ")}.`
    );
  } else {
    addCheck(
      "ADR-008",
      ".governance-baseline",
      "PASS",
      `Repositório (${baseline.repository}), tag (${baseline.tag}) e SHA (${baseline.commit}) seguem o padrão normativo.`
    );
  }

  // 2. MH-GOV-002: Confirmação da tag e SHA na Governança com diferença registrada
  if (validRepo && validTag && validCommit) {
    const govResolution = verifyBaselineInGovernance(baseline, {
      rootDir,
      governanceDir: options.governanceDir,
      checkRemote: options.checkRemote ?? true,
    });
    baselineDifference = govResolution.difference;
    addCheck("MH-GOV-002", ".governance-baseline", govResolution.status, govResolution.reason);
  } else {
    baselineDifference = "baseline local inválida ou ausente";
    addCheck(
      "MH-GOV-002",
      ".governance-baseline",
      "FAIL",
      "Impossível validar tag e commit na Governança porque .governance-baseline está ausente ou malformado."
    );
  }

  // 3. MH-GOV-001: AGENTS.md e vínculo com autoridade normativa
  const agentsPath = path.join(rootDir, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    addCheck("MH-GOV-001", "AGENTS.md", "FAIL", "Arquivo AGENTS.md ausente.");
  } else {
    const agentsContent = await readFile(agentsPath, "utf8");
    const hasKbRef = agentsContent.includes("_KB/README.md") && agentsContent.includes(".governance-baseline");
    const hasFailWarnRule = agentsContent.includes("FAIL") && agentsContent.includes("WARN");
    if (!hasKbRef || !hasFailWarnRule) {
      addCheck(
        "MH-GOV-001",
        "AGENTS.md",
        "FAIL",
        "AGENTS.md deve referenciar _KB/README.md, .governance-baseline e as regras de bloqueio para FAIL e WARN."
      );
    } else {
      addCheck(
        "MH-GOV-001",
        "AGENTS.md",
        "PASS",
        "Autoridade normativa (_KB/README.md e .governance-baseline) e regras de bloqueio FAIL/WARN estão declaradas."
      );
    }
  }

  // 4. POL-QA-002 / MH-QA-001: Estratégia de testes (docs/test-strategy.md)
  const strategyPath = path.join(rootDir, "docs/test-strategy.md");
  if (!existsSync(strategyPath)) {
    addCheck("POL-QA-002 / MH-QA-001", "docs/test-strategy.md", "FAIL", "Documento docs/test-strategy.md ausente.");
  } else {
    const strategyContent = await readFile(strategyPath, "utf8");
    const requiredTerms = ["Unitário", "Integração", "Contrato", "E2E", "Performance", "Segurança", "PASS", "WARN", "FAIL"];
    const missingTerms = requiredTerms.filter((term) => !strategyContent.includes(term));
    if (missingTerms.length > 0) {
      addCheck(
        "POL-QA-002 / MH-QA-001",
        "docs/test-strategy.md",
        "FAIL",
        `Estratégia de testes incompleta; termos ausentes: ${missingTerms.join(", ")}.`
      );
    } else {
      addCheck(
        "POL-QA-002 / MH-QA-001",
        "docs/test-strategy.md",
        "PASS",
        "Camadas da pirâmide de testes e regras determinísticas de resultado (PASS/WARN/FAIL) presentes."
      );
    }
  }

  // 5. MH-QA-002: Matriz critério de aceite → evidência (docs/ac-evidence-matrix.md)
  const matrixPath = path.join(rootDir, "docs/ac-evidence-matrix.md");
  if (!existsSync(matrixPath)) {
    addCheck("MH-QA-002", "docs/ac-evidence-matrix.md", "FAIL", "Matriz docs/ac-evidence-matrix.md ausente.");
  } else {
    const matrixContent = await readFile(matrixPath, "utf8");
    const requiredHeaders = ["Issue", "SPEC/AC", "Nível", "Automação", "Evidência", "Estado"];
    const missingHeaders = requiredHeaders.filter((h) => !matrixContent.includes(h));

    if (missingHeaders.length > 0) {
      addCheck(
        "MH-QA-002",
        "docs/ac-evidence-matrix.md",
        "FAIL",
        `Cabeçalhos obrigatórios ausentes na matriz AC→evidência: ${missingHeaders.join(", ")}.`
      );
    } else {
      const tableRows = matrixContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("SPEC/AC"));

      const invalidRows = tableRows.filter((row) => {
        const cols = row
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (cols.length < 6) return true;
        const [issue, specAc, , , evidence] = cols;
        if (!issue || !specAc || !evidence) return true;
        if (issue !== "A definir" && (specAc === "A definir" || evidence === "A definir")) {
          return true;
        }
        return false;
      });

      if (tableRows.length === 0 || invalidRows.length > 0) {
        addCheck(
          "MH-QA-002",
          "docs/ac-evidence-matrix.md",
          "FAIL",
          "Matriz AC→evidência contém linhas malformadas ou Issue sem vínculo de SPEC/AC e evidência."
        );
      } else {
        addCheck(
          "MH-QA-002",
          "docs/ac-evidence-matrix.md",
          "PASS",
          `Estrutura da matriz AC→evidência íntegra para rastreabilidade de ${NORMATIVE_SPECS.join(", ")}.`
        );
      }
    }
  }

  // 6. QA-004 / MH-QA-002: Templates obrigatórios
  const templateSpecs = [
    {
      file: "templates/test-case.md",
      required: ["Issue:", "SPEC / critério de aceite:", "Baseline de governança:", "## Passos", "## Resultado esperado", "## Evidência esperada"],
    },
    {
      file: "templates/evidence.md",
      required: ["Issue / AC:", "Commit do sistema sob teste:", "Baseline de governança:", "Resultado: PASS | WARN | FAIL", "Artefatos/logs:"],
    },
    {
      file: "templates/defect.md",
      required: ["Issue/AC relacionado:", "Severidade e prioridade:", "Passos para reproduzir:", "Resultado observado:", "Resultado esperado:", "Evidência sem dados sensíveis:"],
    },
  ];

  for (const tpl of templateSpecs) {
    const tplPath = path.join(rootDir, tpl.file);
    if (!existsSync(tplPath)) {
      addCheck("QA-004 / MH-QA-002", tpl.file, "FAIL", `Template obrigatório ${tpl.file} não encontrado.`);
      continue;
    }
    const content = await readFile(tplPath, "utf8");
    const missingFields = tpl.required.filter((field) => !content.includes(field));
    if (missingFields.length > 0) {
      addCheck(
        "QA-004 / MH-QA-002",
        tpl.file,
        "FAIL",
        `Campos obrigatórios ausentes em ${tpl.file}: ${missingFields.join(", ")}.`
      );
    } else {
      addCheck(
        "QA-004 / MH-QA-002",
        tpl.file,
        "PASS",
        `Template ${tpl.file} contém todos os campos obrigatórios de rastreabilidade e evidência.`
      );
    }
  }

  // 7. MH-SEC-003 / MH-SEC-004: Verificação de segredos e credenciais expostas
  const filesToScan = await listTrackedTextFiles(rootDir);
  const secretFindings = [];
  for (const relFile of filesToScan) {
    if (relFile === "scripts/spec-compliance.mjs") continue;
    const absFile = path.join(rootDir, relFile);
    const content = await readFile(absFile, "utf8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(content)) {
        secretFindings.push(`${relFile} (${pattern.name})`);
      }
    }
  }

  if (secretFindings.length > 0) {
    addCheck(
      "MH-SEC-003 / MH-SEC-004",
      secretFindings.join(", "),
      "FAIL",
      `Possível segredo ou credencial detectada em arquivos versionados: ${secretFindings.join("; ")}.`
    );
  } else {
    addCheck(
      "MH-SEC-003 / MH-SEC-004",
      "docs/*, templates/*, tests/*",
      "PASS",
      "Nenhum segredo, chave privada ou token sensível detectado nos artefatos e documentos do repositório."
    );
  }

  const counts = {
    PASS: checks.filter((c) => c.result === "PASS").length,
    WARN: checks.filter((c) => c.result === "WARN").length,
    FAIL: checks.filter((c) => c.result === "FAIL").length,
  };

  let overallResult = "PASS";
  if (counts.FAIL > 0) {
    overallResult = "FAIL";
  } else if (counts.WARN > 0) {
    overallResult = "WARN";
  }

  const exitCode = overallResult === "FAIL" ? 1 : 0;

  return {
    baseline: {
      repository: baseline.repository,
      tag: baseline.tag,
      commit: baseline.commit,
      reference: baselineRef,
      difference: baselineDifference,
    },
    specs: NORMATIVE_SPECS,
    diff: diffFiles,
    checks,
    counts,
    overallResult,
    exitCode,
  };
}

/**
 * Formata o relatório de verificação de forma legível para humanos e logs de CI.
 */
export function formatComplianceReport(report) {
  const lines = [];
  const divider = "=".repeat(88);
  const subDivider = "-".repeat(88);

  lines.push(divider);
  lines.push("RELATÓRIO DE VERIFICAÇÃO DE CONFORMIDADE (SPEC-COMPLIANCE)");
  lines.push(`Referência da baseline: ${report.baseline.reference}`);
  lines.push(`Repositório normativo:  ${report.baseline.repository || "não definido"}`);
  lines.push(`Diferença de baseline:  ${report.baseline.difference}`);
  lines.push(`Escopo de SPECs:        ${report.specs.join(", ")}`);
  lines.push(`Arquivos no diff:       ${report.diff.length} item(ns)`);
  lines.push(divider);
  lines.push("");

  for (const item of report.checks) {
    lines.push(`[${item.result}] Regra: ${item.rule}`);
    lines.push(`       Arquivo: ${item.file}`);
    lines.push(`       Motivo: ${item.reason}`);
    lines.push(`       Resultado: ${item.result}`);
    lines.push(`       Referência da baseline: ${item.baseline}`);
    lines.push("");
  }

  lines.push(subDivider);
  lines.push(
    `RESUMO: ${report.counts.PASS} PASS | ${report.counts.WARN} WARN | ${report.counts.FAIL} FAIL`
  );
  lines.push(
    `RESULTADO FINAL: ${report.overallResult} | Referência da baseline: ${report.baseline.reference}`
  );
  if (report.overallResult === "FAIL") {
    lines.push("AÇÃO: Bloqueio de merge (exit code != 0). Corrija as violações apontadas como FAIL.");
  } else if (report.overallResult === "WARN") {
    lines.push("AÇÃO: Exige justificativa e decisão humana antes de aprovar/concluir.");
  } else {
    lines.push("AÇÃO: Conformidade verificada com sucesso.");
  }
  lines.push(divider);

  return lines.join("\n");
}

function parseCliArgs(argv) {
  const options = {
    rootDir: DEFAULT_ROOT_DIR,
    governanceDir: undefined,
    checkRemote: true,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root" && argv[i + 1]) {
      options.rootDir = argv[i + 1];
      i += 1;
    } else if (arg === "--governance-dir" && argv[i + 1]) {
      options.governanceDir = argv[i + 1];
      i += 1;
    } else if (arg === "--no-remote") {
      options.checkRemote = false;
    } else if (arg === "--json") {
      options.json = true;
    }
  }

  return options;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  const report = await runComplianceCheck(cliOptions);
  if (cliOptions.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatComplianceReport(report));
  }
  process.exitCode = report.exitCode;
}
