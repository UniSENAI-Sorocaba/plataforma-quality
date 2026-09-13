import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const requiredFiles = [
  "docs/test-strategy.md",
  "docs/ac-evidence-matrix.md",
  "templates/test-case.md",
  "templates/evidence.md",
  "templates/defect.md",
];

test("mantém os documentos e templates mínimos", async () => {
  await Promise.all(requiredFiles.map((file) => access(new URL(`../../${file}`, import.meta.url))));
});

test("fixa tag e SHA da governança", async () => {
  const baseline = await readFile(new URL("../../.governance-baseline", import.meta.url), "utf8");
  assert.match(baseline, /^tag=governance-v\d+\.\d+\.\d+$/m);
  assert.match(baseline, /^commit=[0-9a-f]{40}$/m);
});
