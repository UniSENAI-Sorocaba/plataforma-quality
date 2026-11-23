import { chromium } from "playwright";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";
const opportunityId = process.env.E2E_T14_OPPORTUNITY_ID ?? "b0000000-0000-4000-8000-000000000401";
const opportunityTitle = process.env.E2E_T14_OPPORTUNITY_TITLE ?? "Oficinas de Prototipagem Comunitária";
const email = process.env.E2E_STUDENT_EMAIL ?? "mock.student.01@synthetic.local";
const password = process.env.E2E_STUDENT_PASSWORD ?? "Synthet1cPass!";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const apiResponses = [];
page.on("response", (response) => {
  if (response.url().includes("/api/")) apiResponses.push({ url: response.url(), status: response.status() });
});

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#login-identifier").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${baseUrl}/`, { timeout: 10_000 });

  await page.goto(`${baseUrl}/extension`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Editais abertos" }).waitFor({ timeout: 10_000 });
  await page.getByText("Editais em que você está inscrito", { exact: true }).waitFor({ timeout: 10_000 });
  const card = page.locator("article.project-card", { hasText: opportunityTitle });
  await card.getByRole("heading", { name: opportunityTitle }).waitFor({ timeout: 10_000 });
  const enrolledOpportunity = page.locator(".extension-enrollments li", { hasText: opportunityTitle });
  if (await enrolledOpportunity.count() === 0) {
    const applyButton = card.getByRole("button", { name: "Inscrever-se" });
    await applyButton.click();
    await page.getByText("Inscrição confirmada.", { exact: true }).waitFor({ timeout: 10_000 });
  }
  await enrolledOpportunity.waitFor({ timeout: 10_000 });

  console.log(JSON.stringify({
    browserE2E: "passed",
    login: "passed",
    opportunityVisible: true,
    applicationSubmission: "passed",
    enrolledOpportunityVisible: true,
    opportunityId,
  }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error), apiResponses, visibleText: await page.locator("body").innerText() }));
  throw error;
} finally {
  await browser.close();
}
