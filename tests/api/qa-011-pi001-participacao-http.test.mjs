// tests/api/qa-011-pi001-participacao-http.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { ENDPOINTS, sampleProjectMemberRequest, sampleProjectRequest } from './support/qa-011/contract.mjs';

let fetchFn = fetch;
if (process.env.USE_MOCK_API === '1') {
  const { mockFetch } = await import('./support/qa-011/mockFetch.mjs');
  fetchFn = mockFetch;
}

if (!process.env.QA_INTEGRATED) {
  test.skip('Participação HTTP – integração desativada (QA_INTEGRATED ausente)', () => {});
} else {
  test('POST /api/v1/project-members → 201 Created (mock ou real)', async () => {
    // Garantir que temos um projectId válido
    let projectId = process.env.QA_PROJECT_ID;
    if (!projectId && process.env.USE_MOCK_API === '1') {
      // Cria um projeto via mock para obter um ID
      const projResp = await fetchFn(ENDPOINTS.PROJECTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(sampleProjectRequest()),
      });
      const projData = await projResp.json();
      projectId = projData.id;
    }
    assert.ok(projectId, 'É necessário um projectId válido');

    const payload = sampleProjectMemberRequest(projectId);
    const resp = await fetchFn(ENDPOINTS.PROJECT_MEMBERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(resp.status, 201, 'Deve responder 201 Created');
    const data = await resp.json();
    assert.ok(data.id, 'Resposta deve conter `id` da participação');
    assert.strictEqual(data.projectId, payload.projectId);
    assert.strictEqual(data.userId, payload.userId);
    assert.strictEqual(data.memberRole, payload.memberRole);
    assert.strictEqual(data.status, payload.status);
  });

  test('POST /api/v1/project-members com projectId inválido → 404 Not Found', async () => {
    const payload = sampleProjectMemberRequest('00000000-0000-0000-0000-000000000000');
    const resp = await fetchFn(ENDPOINTS.PROJECT_MEMBERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/problem+json',
      },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(resp.status, 404, 'Deve responder 404 Not Found');
    const err = await resp.json();
    assert.ok(err.code);
    assert.ok(err.message);
    assert.ok(err.correlation_id);
  });
}