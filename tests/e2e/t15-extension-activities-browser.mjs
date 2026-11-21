import { chromium } from "playwright";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";
const projectId = process.env.E2E_T15_PROJECT_ID;
const periodId = process.env.E2E_T15_PERIOD_ID;
const email = process.env.E2E_STUDENT_EMAIL ?? "mock.student.01@synthetic.local";
const password = process.env.E2E_STUDENT_PASSWORD ?? "Synthet1cPass!";
if (!projectId || !periodId) throw new Error("E2E_T15_PROJECT_ID e E2E_T15_PERIOD_ID são obrigatórios para o E2E de T15.");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-identifier").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${baseUrl}/`, { timeout: 10_000 });
  await page.goto(`${baseUrl}/projects/${projectId}/periods/${periodId}/activities`, { waitUntil: "networkidle" });
  await page.locator("#activity-title").fill(`Atividade E2E ${Date.now()}`);
  await page.locator("#activity-description").fill("Descrição sintética da atividade enviada no E2E.");
  await page.locator("#activity-hours").fill("1.25");
  await page.getByRole("button", { name: "Enviar atividade" }).click();
  await page.getByText("Atividade enviada.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText(/h aprovadas/).waitFor({ timeout: 10_000 });
  console.log(JSON.stringify({ browserE2E: "passed", login: "passed", activitySubmission: "passed", totalVisible: true }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error) }));
  throw error;
} finally {
  await browser.close();
}
