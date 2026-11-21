import { chromium } from "playwright";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";
const projectId = process.env.E2E_T16_PROJECT_ID;
const periodId = process.env.E2E_T16_PERIOD_ID;
const evaluatedStudentId = process.env.E2E_T16_EVALUATED_STUDENT_ID;
const evaluatorId = process.env.E2E_T16_EVALUATOR_ID;
const email = process.env.E2E_COORDINATOR_EMAIL ?? "mock.coordinator.01@synthetic.local";
const password = process.env.E2E_COORDINATOR_PASSWORD ?? "Synthet1cPass!";
if (!projectId || !periodId || !evaluatedStudentId || !evaluatorId) {
  throw new Error("E2E_T16_PROJECT_ID, E2E_T16_PERIOD_ID, E2E_T16_EVALUATED_STUDENT_ID e E2E_T16_EVALUATOR_ID são obrigatórios.");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-identifier").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForTimeout(1_000);
  const accessToken = await page.evaluate(() => window.sessionStorage.getItem("plataforma.accessToken"));
  if (!accessToken) throw new Error("Login não persistiu o access token no navegador.");
  await page.goto(`${baseUrl}/projects/${projectId}/periods/${periodId}/evaluations`, { waitUntil: "networkidle" });
  await page.locator("#evaluated-student-id").fill(evaluatedStudentId);
  await page.locator("#evaluation-date").fill(new Date(Date.now() + 86_400_000).toISOString().slice(0, 16));
  await page.locator("#evaluator-ids").fill(evaluatorId);
  await page.getByRole("button", { name: "Atribuir avaliação" }).click();
  await page.getByText("Avaliação atribuída com sucesso.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText(/avaliador\(es\) vinculado\(s\)/).waitFor({ timeout: 10_000 });
  console.log(JSON.stringify({ browserE2E: "passed", login: "passed", evaluationAssignment: "passed" }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error), visibleText: await page.locator("body").innerText() }));
  throw error;
} finally {
  await browser.close();
}
