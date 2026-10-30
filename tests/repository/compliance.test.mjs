import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatComplianceReport,
  runComplianceCheck,
} from "../../scripts/spec-compliance.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const CLI_PATH = path.join(REPO_ROOT, "scripts/spec-compliance.mjs");

async function createTempGovernanceRepo(withTag = false, tagName = "governance-v0.1.0") {
  const govDir = await mkdtemp(path.join(os.tmpdir(), "gov-repo-"));
  execFileSync("git", ["init", govDir], { stdio: "ignore" });
  execFileSync("git", ["-C", govDir, "config", "user.email", "test@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", govDir, "config", "user.name", "Test User"], { stdio: "ignore" });
  await writeFile(path.join(govDir, "README.md"), "# Governance\n", "utf8");
  execFileSync("git", ["-C", govDir, "add", "README.md"], { stdio: "ignore" });
  execFileSync("git", ["-C", govDir, "commit", "-m", "docs: implemented _KB"], { stdio: "ignore" });
  const commitSha = execFileSync("git", ["-C", govDir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();

  if (withTag) {
    execFileSync("git", ["-C", govDir, "tag", tagName, commitSha], { stdio: "ignore" });
  }

  return { govDir, commitSha };
}

async function createTempQualityWorkspace(commitSha, tagName = "governance-v0.1.0") {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "quality-repo-"));
  for (const folder of ["docs", "templates"]) {
    await cp(path.join(REPO_ROOT, folder), path.join(workDir, folder), { recursive: true });
  }
  await cp(path.join(REPO_ROOT, "AGENTS.md"), path.join(workDir, "AGENTS.md"));
  await writeFile(
    path.join(workDir, ".governance-baseline"),
    `repository=https://github.com/UniSENAI-Sorocaba/plataforma-governance\ntag=${tagName}\ncommit=${commitSha}\n`,
    "utf8"
  );
  return workDir;
}

test("emite WARN quando o commit existe na Governança mas a tag ainda não foi publicada", async (t) => {
  const { govDir, commitSha } = await createTempGovernanceRepo(false);
  const workDir = await createTempQualityWorkspace(commitSha);
  t.after(async () => {
    await rm(govDir, { recursive: true, force: true });
    await rm(workDir, { recursive: true, force: true });
  });

  const report = await runComplianceCheck({
    rootDir: workDir,
    governanceDir: govDir,
    checkRemote: false,
  });

  assert.equal(report.overallResult, "WARN");
  assert.equal(report.exitCode, 0);
  assert.equal(report.counts.FAIL, 0);
  assert.equal(report.counts.WARN, 1);

  const formatted = formatComplianceReport(report);
  assert.match(formatted, /Regra: MH-GOV-002/);
  assert.match(formatted, /Arquivo: \.governance-baseline/);
  assert.match(formatted, /Motivo: .*ainda não foi publicada/);
  assert.match(formatted, /Resultado: WARN/);
  assert.match(formatted, new RegExp(`Referência da baseline: governance-v0\\.1\\.0@${commitSha}`));
});

test("emite PASS quando a tag existe na Governança e resolve para o SHA da baseline", async (t) => {
  const { govDir, commitSha } = await createTempGovernanceRepo(true);
  const workDir = await createTempQualityWorkspace(commitSha);
  t.after(async () => {
    await rm(govDir, { recursive: true, force: true });
    await rm(workDir, { recursive: true, force: true });
  });

  const report = await runComplianceCheck({
    rootDir: workDir,
    governanceDir: govDir,
    checkRemote: false,
  });

  assert.equal(report.overallResult, "PASS");
  assert.equal(report.exitCode, 0);
  assert.equal(report.counts.FAIL, 0);
  assert.equal(report.counts.WARN, 0);
});

test("emite FAIL e termina com código diferente de zero quando regra obrigatória é violada", async (t) => {
  const { govDir, commitSha } = await createTempGovernanceRepo(true);
  const workDir = await createTempQualityWorkspace(commitSha);
  t.after(async () => {
    await rm(govDir, { recursive: true, force: true });
    await rm(workDir, { recursive: true, force: true });
  });

  // Corrompe o template de evidência removendo campos obrigatórios
  await writeFile(path.join(workDir, "templates/evidence.md"), "# Evidência incompleta\n", "utf8");

  const proc = spawnSync(
    process.execPath,
    [CLI_PATH, "--root", workDir, "--governance-dir", govDir, "--no-remote"],
    { encoding: "utf8" }
  );

  assert.notEqual(proc.status, 0, "O processo deve encerrar com código diferente de zero em FAIL");
  assert.equal(proc.status, 1);
  assert.match(proc.stdout, /\[FAIL\] Regra: QA-004 \/ MH-QA-002/);
  assert.match(proc.stdout, /Arquivo: templates\/evidence\.md/);
  assert.match(proc.stdout, /Resultado: FAIL/);
  assert.match(proc.stdout, /RESULTADO FINAL: FAIL/);
});

