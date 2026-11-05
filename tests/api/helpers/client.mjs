// Cliente HTTP mínimo para os testes de API (QA-016).
// Configuração só por variável de ambiente; nenhuma credencial no código.
//   QA_BASE_URL  ex.: http://localhost:8080  (perfil local/test da develop; nunca produção)
//   QA_RUN_ID    opcional; identifica a execução nos dados e nos correlation ids
import { randomUUID } from 'node:crypto';

export const BASE_URL = process.env.QA_BASE_URL?.replace(/\/$/, '');
// If mock mode is enabled, replace the global fetch with the local mock implementation
if (process.env.USE_MOCK_API === '1') {
  // The mock module lives under tests/api/support/qa-016/mockFetch.mjs
  const { mockFetch } = await import('../support/qa-016/mockFetch.mjs');
  // @ts-ignore – replace global fetch for this process only
  globalThis.fetch = mockFetch;
}
export const RUN_ID = (process.env.QA_RUN_ID ?? randomUUID().replace(/-/g, '').slice(0, 8))
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 12);

let seq = 0;

/**
 * Faz uma chamada a /api/v1{path}. Sempre envia um X-Correlation-Id único
 * (1–64 chars em A-Za-z0-9._-) para rastrear cada requisição na evidência.
 *
 * `body` é serializado com JSON.stringify. `rawBody` envia o texto exato
 * (ex.: 8.555, "abc", null) sem passar por float. `raw` na resposta guarda o
 * texto original: decimais são lidos dele, nunca de Number.
 */
export async function api(method, path, { body, rawBody, caseId = 'setup' } = {}) {
  const correlationId = `qa016-${caseId}-${RUN_ID}-${++seq}`.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 64);
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, application/problem+json',
      'X-Correlation-Id': correlationId,
    },
    body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, raw, json, correlationId };
}

/**
 * Monta o corpo de uma avaliação como texto JSON, preservando os literais das
 * notas. Cada nota é o literal JSON exato: `8.55` (número), `"abc"` (texto),
 * `null`. `undefined` omite o campo. `ordem` permite permutar a ordem das chaves.
 */
export function avaliacaoRaw(
  { boardId, evaluatorId, technicalGrade, presentationGrade, artifactGrade, feedback },
  { ordem } = {},
) {
  const campos = {
    boardId: boardId === undefined ? undefined : JSON.stringify(boardId),
    evaluatorId: evaluatorId === undefined ? undefined : JSON.stringify(evaluatorId),
    technicalGrade,
    presentationGrade,
    artifactGrade,
    feedback: feedback === undefined ? undefined : JSON.stringify(feedback),
  };
  let entradas = Object.entries(campos).filter(([, v]) => v !== undefined);
  if (ordem) entradas = [...entradas].sort(([a], [b]) => ordem.indexOf(a) - ordem.indexOf(b));
  return `{${entradas.map(([k, v]) => `"${k}":${v}`).join(',')}}`;
}

/**
 * Extrai um campo decimal do JSON bruto como texto (ex.: "8.50") ou null.
 * Retorna undefined se o campo não existir na resposta.
 */
export function decimalField(raw, field) {
  const m = raw?.match(new RegExp(`"${field}"\\s*:\\s*(null|-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)`));
  if (!m) return undefined;
  return m[1] === 'null' ? null : m[1];
}

/** Normaliza um decimal em texto (remove zeros à direita) sem usar float. */
export function normalizaDecimal(s) {
  if (s === null || s === undefined) return s;
  let [i, f = ''] = String(s).split('.');
  f = f.replace(/0+$/, '');
  return f ? `${i}.${f}` : i;
}

/** Compara dois decimais em texto, sem float: "7" e "7.00" são iguais. */
export function decimalEquals(a, b) {
  return normalizaDecimal(a) === normalizaDecimal(b);
}

export const uuidInexistente = () => randomUUID();
