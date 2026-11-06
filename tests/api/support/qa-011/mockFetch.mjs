// tests/api/support/qa-011/mockFetch.mjs
/* eslint-disable no-undef */
/**
 * Mock simples da API v0.1.0 para os endpoints de projetos e membros.
 * Exporta `mockFetch(url, options)` que devolve um objeto `Response`
 * compatível com a API global `fetch` do Node.
 */
import { Readable } from 'node:stream';

function makeResponse (status, bodyObj) {
  const body = Buffer.from(JSON.stringify(bodyObj));
  const stream = new Readable({
    read () {
      this.push(body);
      this.push(null);
    },
  });
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let nextProjectId = 1;
let nextMemberId = 1;
const projects = new Map(); // id -> project object
const members = new Map(); // id -> member object

export async function mockFetch (url, options = {}) {
  const { method = 'GET', body } = options;
  const jsonBody = body ? JSON.parse(body) : undefined;

  // POST /api/v1/projects
  if (url.endsWith('/api/v1/projects') && method === 'POST') {
    // Simple validation: required fields must be present
    if (!jsonBody || !jsonBody.title || !jsonBody.projectType || !jsonBody.status) {
      return makeResponse(400, {
        code: 'INVALID_PAYLOAD',
        message: 'Payload inválido para criação de projeto',
        correlation_id: crypto.randomUUID(),
      });
    }
    const id = `proj-${nextProjectId++}`;
    const project = { id, ...jsonBody };
    projects.set(id, project);
    return makeResponse(201, project);
  }

  // POST /api/v1/project-members
  if (url.endsWith('/api/v1/project-members') && method === 'POST') {
    if (!jsonBody || !projects.has(jsonBody.projectId)) {
      return makeResponse(404, {
        code: 'PROJECT_NOT_FOUND',
        message: `Projeto ${jsonBody?.projectId} não encontrado`,
        correlation_id: crypto.randomUUID(),
      });
    }
    const id = `mem-${nextMemberId++}`;
    const member = { id, ...jsonBody };
    members.set(id, member);
    return makeResponse(201, member);
  }

  // Qualquer outro endpoint → 404 genérico (RFC 9457)
  return makeResponse(404, {
    code: 'ENDPOINT_NOT_FOUND',
    message: `Endpoint ${url} não reconhecido no mock`,
    correlation_id: crypto.randomUUID(),
  });
}