import { chromium } from "playwright";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ headless: true });

async function openAs(page, role, path) {
  await page.addInitScript(({ currentRole }) => {
    window.sessionStorage.setItem("plataforma.accessToken", "role-test-token");
    window.sessionStorage.setItem("plataforma.currentUser", JSON.stringify({ id: `role-${currentRole.toLowerCase()}`, name: currentRole, role: currentRole }));
  }, { currentRole: role });
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.locator("#conteudo-autenticado").waitFor({ timeout: 10_000 });
}

const results = [];
try {
  for (const scenario of [
    { role: "ALUNO", path: "/", required: "Minhas solicitações", forbidden: "Meus projetos", routes: ["/projects/requests", "/extension", "/projects/00000000-0000-4000-8000-000000000001/periods/00000000-0000-4000-8000-000000000002/activities"] },
    { role: "DOCENTE", path: "/docente", required: "Meus projetos", forbidden: "Minhas solicitações", routes: ["/projects/manage", "/docente/activities"] },
    { role: "COORDENADOR", path: "/coordenacao", required: "Projetos", forbidden: "Minhas solicitações", routes: ["/projects/manage", "/projects/00000000-0000-4000-8000-000000000001/periods/00000000-0000-4000-8000-000000000002/evaluations"] },
    { role: "ADMIN", path: "/admin", required: "Acessos", forbidden: "Minhas solicitações", routes: ["/admin/access"] },
  ]) {
    const page = await browser.newPage();
    await openAs(page, scenario.role, scenario.path);
    const body = await page.locator("body").innerText();
    if (!body.includes(scenario.required)) throw new Error(`${scenario.role}: menu sem '${scenario.required}'.`);
    if (body.includes(scenario.forbidden)) throw new Error(`${scenario.role}: menu indevido '${scenario.forbidden}'.`);
    for (const route of scenario.routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      await page.locator("#conteudo-autenticado, .projects-page, .auth-page-wrapper").first().waitFor({ timeout: 10_000 });
      if (page.url().endsWith("/login")) throw new Error(`${scenario.role}: rota autorizada redirecionou para login: ${route}.`);
    }
    results.push({ role: scenario.role, route: scenario.path, menu: "passed" });
    await page.close();
  }

  const deniedPage = await browser.newPage();
  await deniedPage.addInitScript(() => {
    window.sessionStorage.setItem("plataforma.accessToken", "role-test-token");
    window.sessionStorage.setItem("plataforma.currentUser", JSON.stringify({ id: "student", name: "Aluno", role: "ALUNO" }));
  });
  await deniedPage.goto(`${baseUrl}/projects/manage`, { waitUntil: "domcontentloaded" });
  await deniedPage.getByRole("heading", { name: "Você não pode acessar esta área." }).waitFor({ timeout: 10_000 });
  results.push({ role: "ALUNO", route: "/projects/manage", unauthorized: "blocked" });
  await deniedPage.close();

  const deniedPrivatePage = await browser.newPage();
  await deniedPrivatePage.addInitScript(() => {
    window.sessionStorage.setItem("plataforma.accessToken", "role-test-token");
    window.sessionStorage.setItem("plataforma.currentUser", JSON.stringify({ id: "coord", name: "Coordenação", role: "COORDENADOR" }));
  });
  await deniedPrivatePage.goto(`${baseUrl}/projects/requests`, { waitUntil: "domcontentloaded" });
  await deniedPrivatePage.getByRole("heading", { name: "Você não pode acessar esta área." }).waitFor({ timeout: 10_000 });
  results.push({ role: "COORDENADOR", route: "/projects/requests", unauthorized: "blocked" });
  await deniedPrivatePage.close();

  const anonymousPage = await browser.newPage();
  await anonymousPage.goto(`${baseUrl}/docente`, { waitUntil: "domcontentloaded" });
  await anonymousPage.waitForURL(/\/login$/, { timeout: 10_000 });
  results.push({ role: "anonymous", route: "/docente", redirect: "login" });
  await anonymousPage.close();
  console.log(JSON.stringify({ browserE2E: "passed", roleAccess: results }));
} catch (error) {
  console.error(JSON.stringify({ browserE2E: "failed", error: error instanceof Error ? error.message : String(error), roleAccess: results }));
  throw error;
} finally {
  await browser.close();
}
