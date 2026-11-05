import assert from 'node:assert/strict';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v) => typeof v === 'string' && UUID.test(v);

/**
 * Valida um erro `application/problem+json` do contrato (RFC 9457 + extensões).
 * Decide por `status` e `code`, nunca pelo texto da mensagem.
 *
 * - `code`: código esperado pelo contrato (falha se divergir, salvo `tambemAceita`).
 * - `tambemAceita`: códigos que a implementação devolve mas o contrato não
 *   documenta. Não reprovam o caso: viram WARN (retorna o aviso).
 * - `campos`: chaves exatas esperadas em `fields` (só em VALIDATION_ERROR).
 *
 * Retorna um texto de aviso (WARN) ou null.
 */
export function assertProblem(res, status, code, { campos, tambemAceita = [] } = {}) {
  assert.equal(res.status, status, `status esperado ${status}, recebido ${res.status} (correlation ${res.correlationId})`);
  const tipo = res.headers.get('content-type') ?? '';
  assert.ok(tipo.startsWith('application/problem+json'), `Content-Type deve ser application/problem+json, recebido "${tipo}"`);
  assert.ok(res.json, 'corpo do erro deve ser JSON');
  assert.equal(res.json.status, status, 'campo status do problem+json');
  assert.equal(res.json.correlation_id, res.correlationId, 'correlation_id do erro deve repetir o X-Correlation-Id enviado');
  assert.equal(res.headers.get('x-correlation-id'), res.correlationId, 'header X-Correlation-Id deve voltar na resposta');
  assert.equal(typeof res.json.message, 'string', 'campo message');

  let aviso = null;
  if (res.json.code !== code) {
    assert.ok(
      tambemAceita.includes(res.json.code),
      `code esperado ${code}${tambemAceita.length ? ` (ou ${tambemAceita.join('/')})` : ''}, recebido ${res.json.code}`,
    );
    aviso = `code ${res.json.code} devolvido; o contrato 0.1.0 documenta ${code} (divergência a esclarecer com o Backend)`;
  }
  if (campos && res.json.code === 'VALIDATION_ERROR') {
    assert.ok(res.json.fields && typeof res.json.fields === 'object', 'VALIDATION_ERROR deve trazer fields');
    assert.deepEqual(Object.keys(res.json.fields).sort(), [...campos].sort(), 'chaves de fields');
  }
  return aviso;
}

/** Valida uma resposta de sucesso com o header de correlação devolvido. */
export function assertSucesso(res, status) {
  assert.equal(res.status, status, `status esperado ${status}, recebido ${res.status} (correlation ${res.correlationId}, code ${res.json?.code})`);
  assert.equal(res.headers.get('x-correlation-id'), res.correlationId, 'header X-Correlation-Id deve voltar na resposta');
}
