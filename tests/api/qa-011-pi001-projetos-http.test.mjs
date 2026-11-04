// tests/api/qa-011-pi001-projetos-http.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { ENDPOINTS, sampleProjectRequest } from './support/qa-011/contract.mjs';

// Choose fetch implementation (real or mock)
let fetchFn = fetch;
if (process.env.USE_MOCK_API === '1') {
  const { mockFetch } = await import('./support/qa-011/mockFetch.mjs');
  fetchFn = mockFetch;
}

if (!process.env.QA_INTEGRATED) {
  test.skip('Projeto HTTP – integração desativada (QA_INTEGRATED ausente)', () => {});
} else {
  test('POST /api/v1/projects → 201 Created (mock ou real)', async () => {
    const payload = sampleProjectRequest();
    const resp = await fetchFn(ENDPOINTS.PROJECTS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(resp.status, 201, 'Deve responder 201 Created');
    const data = await resp.json();
    assert.ok(data.id, 'Resposta deve conter `id` do projeto');
    assert.strictEqual(data.title, payload.title);
    assert.strictEqual(data.projectType, payload.projectType);
    assert.strictEqual(data.status, payload.status);
  });

  test('POST /api/v1/projects com payload inválido → 400 Bad Request', async () => {
    const invalidPayload = { title: '' }; // faltando campos obrigatórios
    const resp = await fetchFn(ENDPOINTS.PROJECTS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/problem+json',
      },
      body: JSON.stringify(invalidPayload),
    });
    assert.strictEqual(resp.status, 400, 'Deve responder 400 Bad Request');
    const err = await resp.json();
    assert.ok(err.code, 'Campo `code` deve estar presente');
    assert.ok(err.message, 'Campo `message` deve estar presente');
    assert.ok(err.correlation_id, 'Campo `correlation_id` deve estar presente');
  });
}