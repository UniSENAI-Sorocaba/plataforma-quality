const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:18081";
const mailpitUrl = process.env.MAILPIT_URL ?? "http://localhost:8025";
const pendingCpf = process.env.E2E_PENDING_CPF ?? "44444444444";
const pendingEmail = process.env.E2E_PENDING_EMAIL ?? "mock.pending.user@synthetic.local";
const recoveryEmail = process.env.E2E_RECOVERY_EMAIL ?? "mock.student.01@synthetic.local";
const initialPassword = process.env.E2E_INITIAL_PASSWORD ?? "FirstAccess123!";
const recoveredPassword = process.env.E2E_RECOVERED_PASSWORD ?? "Recovered123!";

async function request(url, options = {}) {
  const response = await fetch(url, options);
  return { status: response.status, text: await response.text() };
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} returned ${response.status}`);
  return response.json();
}

function assertStatus(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

const health = await request(`${baseUrl}/actuator/health`);
assertStatus(health.status, 200, "health");

const firstAccess = await request(`${baseUrl}/api/v1/auth/first-access`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ cpf: pendingCpf, password: initialPassword }),
});
assertStatus(firstAccess.status, 204, "first access");

const activatedLogin = await request(`${baseUrl}/api/v1/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: pendingEmail, password: initialPassword }),
});
assertStatus(activatedLogin.status, 200, "login after first access");

await request(`${mailpitUrl}/api/v1/messages`, { method: "DELETE" });
const recoveryRequest = await request(`${baseUrl}/api/v1/auth/password-recovery/request`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: recoveryEmail }),
});
assertStatus(recoveryRequest.status, 202, "recovery request");

const messages = await json(`${mailpitUrl}/api/v1/messages`);
if (messages.messages.length !== 1) throw new Error("recovery mail count mismatch");
const message = await json(`${mailpitUrl}/api/v1/message/${messages.messages[0].ID}`);
const tokenMatch = message.Text.match(/token=([^\r\n]+)/);
if (!tokenMatch) throw new Error("recovery token was not delivered by SMTP");
const token = tokenMatch[1];

const reset = await request(`${baseUrl}/api/v1/auth/password-recovery/reset`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token, password: recoveredPassword }),
});
assertStatus(reset.status, 204, "password reset");

const recoveredLogin = await request(`${baseUrl}/api/v1/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: recoveryEmail, password: recoveredPassword }),
});
assertStatus(recoveredLogin.status, 200, "login after recovery");

const reuse = await request(`${baseUrl}/api/v1/auth/password-recovery/reset`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token, password: "Another123!" }),
});
assertStatus(reuse.status, 400, "single-use token");

console.log(JSON.stringify({
  health: "passed",
  firstAccess: "passed",
  recoveryRequest: "passed",
  smtpDelivery: "passed",
  passwordReset: "passed",
  recoveredLogin: "passed",
  tokenReuseRejected: "passed",
}));
