import { chromium } from "playwright";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";
const email = process.env.E2E_STUDENT_EMAIL ?? "mock.student.01@synthetic.local";
const password = process.env.E2E_STUDENT_PASSWORD ?? "Synthet1cPass!";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const apiResponses = [];
page.on("response", (response) => {
  if (response.url().includes("/api/")) apiResponses.push({ url: response.url().replace(/token=[^&]+/, "token=[redacted]"), status: response.status() });
});
const fixtureDir = mkdtempSync(join(tmpdir(), "plataforma-t13-browser-"));
const fixture = join(fixtureDir, "t13-browser.pdf");
writeFileSync(fixture, "T13 browser upload validation\n");

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-identifier").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${baseUrl}/`, { timeout: 10_000 });

  await page.goto(`${baseUrl}/projects/requests`, { waitUntil: "networkidle" });
  await page.getByText("Aprovada").first().waitFor({ state: "visible", timeout: 10_000 });
  const fileInput = page.getByLabel("Enviar entregável").first();
  await fileInput.setInputFiles(fixture);
  await page.getByText("Arquivo enviado com segurança.", { exact: true }).first().waitFor({ timeout: 15_000 });

  console.log(JSON.stringify({
    browserE2E: "passed",
    login: "passed",
    approvedRequestVisible: true,
    uploadStatus: "Arquivo enviado com segurança.",
  }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error), apiResponses, visibleText: await page.locator("body").innerText() }));
  throw error;
} finally {
  await browser.close();
}
