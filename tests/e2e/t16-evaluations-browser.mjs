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
const apiResponses = [];
page.on("response", (response) => {
  if (response.url().includes("/api/")) apiResponses.push({ url: response.url(), status: response.status() });
});
try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-identifier").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(coordenacao)?$`), { timeout: 10_000 });
  await page.goto(`${baseUrl}/projects/${projectId}/periods/${periodId}/evaluations`, { waitUntil: "domcontentloaded" });
  await page.locator("#evaluated-student-id").waitFor({ timeout: 10_000 });
  await page.locator("#evaluated-student-id").fill(evaluatedStudentId);
  await page.locator("#evaluation-date").fill(new Date(Date.now() + 86_400_000).toISOString().slice(0, 16));
  await page.locator("#evaluator-ids").fill(evaluatorId);
  const assignmentStatus = await page.evaluate(async ({ currentProjectId, currentPeriodId, targetId, assignedEvaluatorId }) => {
    const token = window.sessionStorage.getItem("plataforma.accessToken");
    const response = await fetch(`/api/v1/projects/${currentProjectId}/periods/${currentPeriodId}/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ evaluatedStudentId: targetId, evaluationDate: new Date(Date.now() + 86_400_000).toISOString(), evaluatorIds: [assignedEvaluatorId] }),
    });
    return response.status;
  }, { currentProjectId: projectId, currentPeriodId: periodId, targetId: evaluatedStudentId, assignedEvaluatorId: evaluatorId });
  if (assignmentStatus !== 201) throw new Error(`Atribuição API retornou HTTP ${assignmentStatus}.`);
  await page.getByRole("heading", { name: "Atribuir avaliação" }).waitFor({ timeout: 10_000 });
  console.log(JSON.stringify({ browserE2E: "passed", login: "passed", evaluationAssignmentApi: "passed", evaluationRouteVisible: true }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error), apiResponses, visibleText: await page.locator("body").innerText() }));
  throw error;
} finally {
  await browser.close();
}
