// Mock simples da API para QA-016 (endpoint /api/v1/evaluations)
/* eslint-disable no-undef */
import { Readable } from 'node:stream';

function makeResponse(status, bodyObj) {
  const body = Buffer.from(JSON.stringify(bodyObj));
  const stream = new Readable({
    read() {
      this.push(body);
      this.push(null);
    },
  });
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let nextEvalId = 1;
const evaluations = new Map(); // id -> object

export async function mockFetch(url, options = {}) {
  const { method = 'GET', body } = options;
  const jsonBody = body ? JSON.parse(body) : undefined;

  // Helper to validate required fields for POST /evaluations
  function validatePayload(payload) {
    const required = ['boardId', 'evaluatorId', 'technicalGrade', 'presentationGrade', 'artifactGrade'];
    for (const f of required) {
      if (payload[f] === undefined) {
        return { valid: false, missing: f };
      }
    }
    return { valid: true };
  }

  // POST /api/v1/evaluations
  if (url.endsWith('/api/v1/evaluations') && method === 'POST') {
    const validation = validatePayload(jsonBody);
    if (!validation.valid) {
      return makeResponse(400, {
        status: 400,
        code: 'VALIDATION_ERROR',
        correlation_id: crypto.randomUUID(),
        message: `Campo ${validation.missing} ausente`,
        fields: { [validation.missing]: 'campo obrigatório' },
      });
    }
    const id = `eval-${nextEvalId++}`;
    const evalObj = { id, ...jsonBody };
    evaluations.set(id, evalObj);
    return makeResponse(201, evalObj);
  }

  // GET /api/v1/evaluations/:id
  const evalIdMatch = url.match(/\/api\/v1\/evaluations\/([^\/]+)$/);
  if (evalIdMatch && method === 'GET') {
    const id = evalIdMatch[1];
    if (!evaluations.has(id)) {
      return makeResponse(404, {
        status: 404,
        code: 'NOT_FOUND',
        correlation_id: crypto.randomUUID(),
        message: `Evaluation ${id} não encontrada`,
      });
    }
    return makeResponse(200, evaluations.get(id));
  }

  // Any other endpoint -> 404 generic
  return makeResponse(404, {
    status: 404,
    code: 'ENDPOINT_NOT_FOUND',
    correlation_id: crypto.randomUUID(),
    message: `Endpoint ${url} não reconhecido no mock`,
  });
}

