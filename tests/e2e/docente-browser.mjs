import { chromium } from "playwright";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";
const email = process.env.E2E_TEACHER_EMAIL ?? "mock.professor.01@synthetic.local";
const password = process.env.E2E_TEACHER_PASSWORD ?? "Synthet1cPass!";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const responses = [];
page.on("response", (response) => {
  if (response.url().includes("/api/")) responses.push({ url: response.url(), status: response.status() });
});

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#login-identifier").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${baseUrl}/docente`, { timeout: 10000 });

  const dashboardText = await page.locator("body").innerText();
  const menu = await page.locator(".app-menu-link").allTextContents();
  const dashboard = { url: page.url(), hasProjects: dashboardText.includes("Meus projetos"), hasStudentRequests: dashboardText.includes("Minhas solicitações"), menu };

  await page.goto(`${baseUrl}/projects/manage`, { waitUntil: "domcontentloaded" });
  await page.locator("#management-title").waitFor({ timeout: 10000 });
  await page.locator('a[href*="/periods/"]').first().waitFor({ timeout: 10000 });
  const managementText = await page.locator("body").innerText();
  const projectSelect = await page.locator("#managed-project").count();
  const decisionButtons = await page.getByRole("button", { name: "Aprovar" }).count() + await page.getByRole("button", { name: "Recusar" }).count();
  const managedActivityLinks = await page.locator('a[href*="/periods/"][href$="/activities"]').count();
  const managedEvaluationLinks = await page.locator('a[href*="/periods/"][href$="/evaluations"]').count();
  if (managedActivityLinks < 1 || managedEvaluationLinks < 1) throw new Error("O docente não recebeu links de revisão para um período real.");

  await page.goto(`${baseUrl}/docente/activities`, { waitUntil: "domcontentloaded" });
  await page.locator("#docente-activities-title").waitFor({ timeout: 10000 });
  await page.locator('a[href*="/periods/"]').first().waitFor({ timeout: 10000 });
  const activitiesText = await page.locator("body").innerText();
  const activityLinkCount = await page.locator('a[href*="/periods/"][href$="/activities"]').count();
  const evaluationLinkCount = await page.locator('a[href*="/periods/"][href$="/evaluations"]').count();
  if (activityLinkCount < 1 || evaluationLinkCount < 1) throw new Error("A tela docente não expôs os contextos de atividades e avaliações.");

  const activityHref = await page.locator('a[href*="/periods/"][href$="/activities"]').first().getAttribute("href");
  if (!activityHref) throw new Error("Link de atividades docente sem destino.");
  await page.goto(`${baseUrl}${activityHref}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Revisão das atividades", { exact: true }).waitFor({ timeout: 10000 });
  const reviewText = await page.locator("body").innerText();
  if (!reviewText.includes("Revisão das atividades")) throw new Error("O contexto de atividades não abriu o modo de revisão docente.");

  await page.goto(`${baseUrl}/projects`, { waitUntil: "domcontentloaded" });
  await page.locator("#project-search").fill("oficinas");
  const filteredCards = await page.locator("article.project-card").count();
  const participationButtons = await page.getByRole("button", { name: /Solicitar participação|Solicitação enviada/ }).count();

  console.log(JSON.stringify({ browserE2E: "passed", login: "passed", dashboard, management: { projectSelect, decisionButtons, managedActivityLinks, managedEvaluationLinks, hasError: managementText.includes("Não foi possível") }, activities: { hasReviewContext: activitiesText.includes("Períodos e revisões"), activityLinkCount, evaluationLinkCount, reviewMode: true }, search: { filteredCards, participationButtons }, apiResponses: responses }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error), visibleText: await page.locator("body").innerText(), apiResponses: responses }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
