import { chromium } from "playwright";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:3100";
const cpf = process.env.E2E_CPF ?? "00000000515";
const password = process.env.E2E_CPF_PASSWORD ?? "CpfAccess123!";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /primeiro acesso/i }).click();
  await page.locator("#first-access-cpf").fill(cpf);
  await page.locator("#new-password").fill(password);
  await page.locator("#confirm-password").fill(password);
  await page.getByRole("button", { name: /salvar senha/i }).click();
  await page.getByText("Senha criada com sucesso.", { exact: false }).waitFor({ timeout: 10_000 });

  await page.locator("#login-identifier").fill(cpf);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${baseUrl}/`, { timeout: 10_000 });
  await page.locator("#conteudo-autenticado").waitFor({ timeout: 10_000 });

  console.log(JSON.stringify({ browserE2E: "passed", firstAccess: "passed", cpfLogin: "passed", route: page.url() }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error), visibleText: await page.locator("body").innerText() }));
  throw error;
} finally {
  await browser.close();
}
