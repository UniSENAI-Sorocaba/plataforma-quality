import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('QA-002: Threat model documenta ativos, fronteiras, ameaças, controles, risco residual e owners', async () => {
  const content = await readFile(new URL('../../docs/threat-model.md', import.meta.url), 'utf8');

  assert.match(content, /QA-002/);
  assert.match(content, /ADR-006/);
  assert.match(content, /ADR-011/);

  // Seções obrigatórias
  assert.match(content, /## 1\. Ativos Críticos/);
  assert.match(content, /## 2\. Fronteiras de Confiança/);
  assert.match(content, /## 3\. Matriz de Ameaças, Controles, Risco Residual e Owners/);

  // Ativos e fronteiras essenciais
  assert.match(content, /AST-01/);
  assert.match(content, /AST-08/);
  assert.match(content, /TB-1/);
  assert.match(content, /TB-4/);

  // Ameaças e controles
  assert.match(content, /THR-01/);
  assert.match(content, /THR-08/);
  assert.match(content, /Risco Residual/);
  assert.match(content, /Owner/);
});
