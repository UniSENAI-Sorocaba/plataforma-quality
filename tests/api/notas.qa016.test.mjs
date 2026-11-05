// QA-016 — Notas: precisão, permissão e limites (SPEC-PI-003).
// Testa /api/v1/evaluations contra o ambiente INTEGRADO (perfil local/test da develop).
// Não usa mock. Sem QA_BASE_URL a suíte inteira fica BLOQUEADA (skip), nunca aprovada.
//
//   QA_BASE_URL=http://localhost:8080 npm run test:api
//
// Resultado por caso: PASS | WARN | FAIL | BLOQUEADO (ver docs/test-cases/QA-016.md).
// WARN = risco que depende de decisão humana; é registrado no relatório e no diagnóstico.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import { BASE_URL, RUN_ID, api, avaliacaoRaw, decimalEquals, decimalField, uuidInexistente } from './helpers/client.mjs';
import { assertProblem, assertSucesso, isUuid } from './helpers/assertions.mjs';
import { Dataset } from './helpers/dataset.mjs';

const fx = JSON.parse(await readFile(new URL('./fixtures/qa-016-notas.json', import.meta.url), 'utf8'));
const NOTAS = ['technicalGrade', 'presentationGrade', 'artifactGrade'];
const BASE_OK = { technicalGrade: '8.55', presentationGrade: '7.25', artifactGrade: '9.10' };

const BLOQ_AMBIENTE = BASE_URL
  ? false
  : 'BLOQUEADO: QA_BASE_URL não definida — sem ambiente integrado (perfil local/test da develop).';

describe('QA-016 Notas: precisão, permissão e limites (SPEC-PI-003)', { skip: BLOQ_AMBIENTE }, () => {
  const ds = new Dataset();
  const resultados = [];
  let aluno;
  let professor;
  let ctxBanca; // { projeto, banca } compartilhada pelos casos que só precisam de uma banca

  /** Registra o resultado; `caso` envolve cada teste e classifica PASS/WARN/FAIL/BLOQUEADO. */
  function caso(id, titulo, fn) {
    it(`QA-016 ${id} ${titulo}`, async (t) => {
      const ctx = {
        cids: [],
        avisos: [],
        bloqueio: null,
        api(method, path, opts = {}) {
          return api(method, path, { ...opts, caseId: id.toLowerCase() }).then((r) => {
            ctx.cids.push(r.correlationId);
            return r;
          });
        },
        warn: (msg) => ctx.avisos.push(msg),
        bloqueia: (msg) => {
          ctx.bloqueio = msg;
        },
      };
      try {
        await fn(ctx, t);
      } catch (e) {
        resultados.push({ caso: id, resultado: 'FAIL', motivo: String(e.message).split('\n')[0], correlationIds: ctx.cids });
        throw e;
      }
      if (ctx.bloqueio) {
        resultados.push({ caso: id, resultado: 'BLOQUEADO', motivo: ctx.bloqueio, correlationIds: ctx.cids });
        t.skip(ctx.bloqueio);
        return;
      }
      if (ctx.avisos.length) {
        const motivo = ctx.avisos.join(' | ');
        resultados.push({ caso: id, resultado: 'WARN', motivo, correlationIds: ctx.cids });
        t.diagnostic(`WARN ${id}: ${motivo}`);
        return;
      }
      resultados.push({ caso: id, resultado: 'PASS', motivo: 'critério atendido', correlationIds: ctx.cids });
    });
  }

  /** Caso que não pode ser executado hoje: aparece como skip com o motivo, nunca como PASS. */
  function bloqueado(id, titulo, motivo) {
    resultados.push({ caso: id, resultado: 'BLOQUEADO', motivo, correlationIds: [] });
    it(`QA-016 ${id} ${titulo}`, { skip: `BLOQUEADO: ${motivo}` }, () => {});
  }

  /** Cria uma avaliação com um avaliador novo na banca compartilhada; registra para limpeza. */
  async function criarAvaliacao(ctx, { banca = ctxBanca.banca, avaliador, notas = BASE_OK, feedback } = {}) {
    const av = avaliador ?? (await ds.avaliador());
    const raw = avaliacaoRaw({ boardId: banca.id, evaluatorId: av.id, ...notas, feedback });
    const res = await ctx.api('POST', '/evaluations', { rawBody: raw });
    assertSucesso(res, 201);
    ds.registrar('/evaluations', res.json.id);
    return { res, avaliador: av, banca };
  }

  const corpoComCampo = (banca, av, campo, caso_) => {
    const notas = { ...BASE_OK };
    if (caso_.ausente) delete notas[campo];
    else notas[campo] = caso_.literal;
    return avaliacaoRaw({ boardId: banca.id, evaluatorId: av.id, ...notas });
  };

  before(async () => {
    aluno = await ds.usuario('STUDENT', 'aluno');
    professor = await ds.usuario('PROFESSOR', 'orientador');
    ctxBanca = await ds.banca({ aluno, professor });
  });

  after(async () => {
    await ds.limparTudo();
    if (ds.limpeza.falhas.length) console.log(`# limpeza com pendências: ${ds.limpeza.falhas.join('; ')}`);
    mkdirSync('reports', { recursive: true });
    const arquivo = `reports/qa-016-${RUN_ID}.json`;
    writeFileSync(
      arquivo,
      JSON.stringify(
        {
          issue: 'QA-016',
          runId: RUN_ID,
          executadoEm: new Date().toISOString(),
          baseUrl: BASE_URL,
          limpeza: ds.limpeza,
          resultados,
        },
        null,
        2,
      ),
    );
    const total = resultados.reduce((acc, r) => ({ ...acc, [r.resultado]: (acc[r.resultado] ?? 0) + 1 }), {});
    console.log(`# QA-016 resumo: ${JSON.stringify(total)} (WARN e BLOQUEADO exigem decisão humana; o node:test os mostra como ok/skip)`);
    console.log(`# relatório bruto (não versionado): ${arquivo}`);
  });

  // ---------------------------------------------------------------- PRECISÃO
  for (const v of fx.validas) {
    caso(v.id, `nota válida "${v.technicalGrade}/${v.presentationGrade}/${v.artifactGrade}" (${v.descricao}) é aceita e relida sem arredondar`, async (ctx) => {
      const { res } = await criarAvaliacao(ctx, { notas: { technicalGrade: v.technicalGrade, presentationGrade: v.presentationGrade, artifactGrade: v.artifactGrade } });
      assert.ok(isUuid(res.json.id), 'id deve ser UUID gerado pelo servidor');
      for (const n of NOTAS) {
        assert.ok(decimalEquals(decimalField(res.raw, n), v[n]), `${n} devolvido no POST: ${decimalField(res.raw, n)} (enviado ${v[n]})`);
      }
      const lido = await ctx.api('GET', `/evaluations/${res.json.id}`);
      assertSucesso(lido, 200);
      for (const n of NOTAS) {
        assert.ok(decimalEquals(decimalField(lido.raw, n), v[n]), `${n} relido: ${decimalField(lido.raw, n)} (enviado ${v[n]})`);
      }
    });
  }

  for (const inv of fx.invalidas.filter((i) => i.id.startsWith('PRE-02'))) {
    caso(inv.id, `${inv.campo}=${inv.literal} (${inv.motivo}) é rejeitado com 400 VALIDATION_ERROR`, async (ctx) => {
      const av = await ds.avaliador();
      const res = await ctx.api('POST', '/evaluations', { rawBody: corpoComCampo(ctxBanca.banca, av, inv.campo, inv) });
      const aviso = assertProblem(res, 400, 'VALIDATION_ERROR', { campos: [inv.campo] });
      if (aviso) ctx.warn(aviso);
    });
  }

  caso('PRE-07', 'zero à direita além da 2ª casa (8.550): comportamento sem regra no contrato', async (ctx) => {
    const obs = fx.observacoes_sem_regra_aprovada.find((o) => o.id === 'PRE-07');
    const av = await ds.avaliador();
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: av.id, technicalGrade: obs.technicalGrade, presentationGrade: obs.presentationGrade, artifactGrade: obs.artifactGrade }),
    });
    if (res.status === 201) ds.registrar('/evaluations', res.json.id);
    ctx.warn(`8.550 retornou ${res.status}${res.json?.code ? ` ${res.json.code}` : ''}; o contrato não define zero à direita. Backend/PO devem decidir se 8.550 vale 8.55`);
  });

  bloqueado('PRE-06', 'arredondamento do finalGrade (casos de borda x.xx5)', 'SPEC-PI-003 não define escala, precisão nem arredondamento (half-up/half-even/truncar) e o finalGrade depende da BE-015. Perguntas Q1/Q2 em docs/questions/QA-016-perguntas.md.');

  // ------------------------------------------------------------------ LIMITES
  for (const inv of fx.invalidas.filter((i) => i.id.startsWith('LIM-'))) {
    caso(inv.id, `${inv.campo} ${inv.ausente ? 'ausente' : `=${inv.literal}`} (${inv.motivo}) é rejeitado com 400`, async (ctx) => {
      const av = await ds.avaliador();
      const res = await ctx.api('POST', '/evaluations', { rawBody: corpoComCampo(ctxBanca.banca, av, inv.campo, inv) });
      const aviso = assertProblem(res, 400, 'VALIDATION_ERROR', {
        campos: [inv.campo],
        tambemAceita: inv.aceitaTambem ? [inv.aceitaTambem] : [],
      });
      if (aviso) ctx.warn(aviso);
    });
  }

  caso('LIM-03', 'um campo inválido entre três válidos: fields aponta só o inválido', async (ctx) => {
    const av = await ds.avaliador();
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: av.id, technicalGrade: '8.55', presentationGrade: '10.01', artifactGrade: '9.10' }),
    });
    assertProblem(res, 400, 'VALIDATION_ERROR', { campos: ['presentationGrade'] });
  });

  caso('LIM-04', 'vários campos inválidos: fields lista todos', async (ctx) => {
    const av = await ds.avaliador();
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: av.id, technicalGrade: '-1', presentationGrade: '10.01', artifactGrade: '8.555' }),
    });
    assertProblem(res, 400, 'VALIDATION_ERROR', { campos: NOTAS });
  });

  caso('LIM-05', 'feedback com 4001 caracteres é rejeitado; com 4000 é aceito', async (ctx) => {
    const av = await ds.avaliador();
    const longo = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: av.id, ...BASE_OK, feedback: 'x'.repeat(4001) }),
    });
    assertProblem(longo, 400, 'VALIDATION_ERROR', { campos: ['feedback'] });
    const limite = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: av.id, ...BASE_OK, feedback: 'x'.repeat(4000) }),
    });
    assertSucesso(limite, 201);
    ds.registrar('/evaluations', limite.json.id);
  });

  caso('LIM-06', 'requisição rejeitada não persiste nada (total de avaliações não muda)', async (ctx) => {
    // Pressupõe ambiente sem outra escrita concorrente em /evaluations durante o caso.
    const antes = await ctx.api('GET', '/evaluations?page=0&size=1&sort=createdAt,desc');
    assertSucesso(antes, 200);
    const av = await ds.avaliador();
    const rej = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: av.id, technicalGrade: '11', presentationGrade: '7.25', artifactGrade: '9.10' }),
    });
    assertProblem(rej, 400, 'VALIDATION_ERROR');
    const depois = await ctx.api('GET', '/evaluations?page=0&size=1&sort=createdAt,desc');
    assert.equal(depois.json.totalElements, antes.json.totalElements, 'totalElements não pode mudar após um 400');
  });

  // -------------------------------------------------- CÁLCULO DETERMINÍSTICO
  const det = fx.determinismo;

  /** Cria uma avaliação em banca própria e devolve o finalGrade como texto (ou null). */
  async function finalGradeEmBancaNova(ctx, notas, ordem) {
    const av = await ds.avaliador();
    const { banca } = await ds.banca({ aluno, professor });
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: banca.id, evaluatorId: av.id, ...notas }, { ordem }),
    });
    assertSucesso(res, 201);
    ds.registrar('/evaluations', res.json.id);
    return { res, finalGrade: decimalField(res.raw, 'finalGrade'), av, banca };
  }

  const bloqueioBE015 = 'finalGrade veio nulo: cálculo da BE-015 não integrado na develop (ou sem fórmula aprovada na SPEC-PI-003). Nada a comparar.';

  caso('DET-01', `mesma entrada repetida ${det.repeticoes}x (bancas separadas) gera sempre o mesmo finalGrade`, async (ctx) => {
    const finais = [];
    for (let i = 0; i < det.repeticoes; i++) finais.push((await finalGradeEmBancaNova(ctx, det.entrada)).finalGrade);
    assert.ok(finais.every((f) => f !== undefined), 'resposta deve conter o campo finalGrade');
    if (finais.every((f) => f === null)) return ctx.bloqueia(bloqueioBE015);
    assert.ok(finais.every((f) => f !== null), `finalGrade nulo em parte das repetições: ${finais.join(', ')}`);
    assert.ok(finais.every((f) => decimalEquals(f, finais[0])), `finalGrade divergiu entre repetições: ${finais.join(', ')}`);
    if (det.finalGradeEsperado !== null) {
      assert.ok(decimalEquals(finais[0], det.finalGradeEsperado), `finalGrade ${finais[0]} difere do esperado calculado à mão ${det.finalGradeEsperado}`);
    } else {
      ctx.warn('finalGrade repetível, mas sem valor esperado calculado à mão (fórmula não aprovada); preencher fixtures.determinismo');
    }
  });

  caso('DET-02', 'ordem das chaves do JSON não altera o finalGrade', async (ctx) => {
    const a = await finalGradeEmBancaNova(ctx, det.entrada, ['boardId', 'evaluatorId', 'technicalGrade', 'presentationGrade', 'artifactGrade']);
    const b = await finalGradeEmBancaNova(ctx, det.entrada, ['artifactGrade', 'presentationGrade', 'technicalGrade', 'evaluatorId', 'boardId']);
    if (a.finalGrade === null && b.finalGrade === null) return ctx.bloqueia(bloqueioBE015);
    assert.ok(decimalEquals(a.finalGrade, b.finalGrade), `finalGrade ${a.finalGrade} x ${b.finalGrade} com chaves em outra ordem`);
  });

  caso('DET-03', 'editar e restaurar as notas volta ao mesmo finalGrade; leituras repetidas não o alteram', async (ctx) => {
    const base = await finalGradeEmBancaNova(ctx, det.entrada);
    if (base.finalGrade === null) return ctx.bloqueia(bloqueioBE015);
    const id = base.res.json.id;
    const corpo = (notas) => avaliacaoRaw({ boardId: base.banca.id, evaluatorId: base.av.id, ...notas });
    const mudou = await ctx.api('PUT', `/evaluations/${id}`, { rawBody: corpo({ technicalGrade: '1.00', presentationGrade: '2.00', artifactGrade: '3.00' }) });
    assertSucesso(mudou, 200);
    const volta = await ctx.api('PUT', `/evaluations/${id}`, { rawBody: corpo(det.entrada) });
    assertSucesso(volta, 200);
    assert.ok(decimalEquals(decimalField(volta.raw, 'finalGrade'), base.finalGrade), `após restaurar: ${decimalField(volta.raw, 'finalGrade')} (original ${base.finalGrade})`);
    for (let i = 0; i < 3; i++) {
      const lido = await ctx.api('GET', `/evaluations/${id}`);
      assert.ok(decimalEquals(decimalField(lido.raw, 'finalGrade'), base.finalGrade), 'GET não pode alterar o finalGrade');
    }
  });

  // ------------------------------------------------------ AVALIADOR / VÍNCULO
  caso('VIN-01', 'evaluatorId inexistente devolve 404 NOT_FOUND', async (ctx) => {
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: uuidInexistente(), ...BASE_OK }),
    });
    assertProblem(res, 404, 'NOT_FOUND');
  });

  caso('VIN-02', 'boardId inexistente devolve 404 NOT_FOUND', async (ctx) => {
    const av = await ds.avaliador();
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: uuidInexistente(), evaluatorId: av.id, ...BASE_OK }),
    });
    assertProblem(res, 404, 'NOT_FOUND');
  });

  caso('VIN-03', 'banca e avaliador inexistentes devolvem 404 NOT_FOUND', async (ctx) => {
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: uuidInexistente(), evaluatorId: uuidInexistente(), ...BASE_OK }),
    });
    assertProblem(res, 404, 'NOT_FOUND');
  });

  caso('VIN-04', 'evaluatorId que não é UUID devolve 400', async (ctx) => {
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: 'isto-nao-e-uuid', ...BASE_OK }),
    });
    const aviso = assertProblem(res, 400, 'VALIDATION_ERROR', { tambemAceita: ['REQUEST_ERROR'] });
    if (aviso) ctx.warn(aviso);
  });

  caso('VIN-05', 'avaliador existente mas NÃO vinculado à banca: comportamento sem regra aprovada', async (ctx) => {
    // Professor que não é orientador do projeto, não é membro e não foi alocado à banca.
    const naoVinculado = await ds.usuario('PROFESSOR', 'naovinculado');
    const res = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: naoVinculado.id, ...BASE_OK }),
    });
    if (res.status === 201) ds.registrar('/evaluations', res.json.id);
    // Contrato 0.1.0: "não se confere se o avaliador está alocado na banca". Sem regra aprovada
    // (SPEC-PI-003 não define "vinculado"; BE-011 cuida da alocação) o QA não classifica PASS/FAIL.
    ctx.warn(`avaliador não vinculado retornou ${res.status}${res.json?.code ? ` ${res.json.code}` : ''}. Regra de vínculo indefinida (Q3); se a regra for aprovada e a API aceitar, abrir defeito para o Backend`);
  });

  caso('VIN-06', 'mesmo avaliador na mesma banca duas vezes: comportamento sem regra aprovada', async (ctx) => {
    const { avaliador, banca } = await criarAvaliacao(ctx);
    const segunda = await ctx.api('POST', '/evaluations', {
      rawBody: avaliacaoRaw({ boardId: banca.id, evaluatorId: avaliador.id, ...BASE_OK }),
    });
    if (segunda.status === 201) ds.registrar('/evaluations', segunda.json.id);
    ctx.warn(`segunda avaliação do mesmo avaliador na mesma banca retornou ${segunda.status}${segunda.json?.code ? ` ${segunda.json.code}` : ''}. Contrato (pendência 4) lista a unicidade como a decidir (Q4)`);
  });

  caso('VIN-07', 'excluir usuário que ainda é avaliador devolve 409 CONFLICT', async (ctx) => {
    const { avaliador } = await criarAvaliacao(ctx);
    const res = await ctx.api('DELETE', `/users/${avaliador.id}`);
    assertProblem(res, 409, 'CONFLICT');
  });

  // -------------------------------------------------------------- PERMISSÃO
  const motivoRbac = 'RBAC inexistente: 401 UNAUTHENTICATED e 403 FORBIDDEN são reservados no contrato 0.1.0 e só passam a existir depois de BE-004/BE-010. Não simular com mock.';
  for (const p of fx.permissao) {
    bloqueado(p.id, `${p.cenario} (${p.ac})`, `${motivoRbac} Bloqueio específico: ${p.bloqueio}.`);
  }

  // ---------------------------------------------------- VERSÃO ANTERIOR (PUT)
  caso('VER-01', 'PUT substitui todos os campos e preserva id, banca, avaliador e createdAt', async (ctx) => {
    const { res: criada, avaliador, banca } = await criarAvaliacao(ctx, { feedback: 'Feedback fictício inicial' });
    const id = criada.json.id;
    const novas = { technicalGrade: '6.00', presentationGrade: '5.50', artifactGrade: '4.25' };
    const put = await ctx.api('PUT', `/evaluations/${id}`, {
      rawBody: avaliacaoRaw({ boardId: banca.id, evaluatorId: avaliador.id, ...novas }), // sem feedback: PUT substitui tudo
    });
    assertSucesso(put, 200);
    const lido = await ctx.api('GET', `/evaluations/${id}`);
    assertSucesso(lido, 200);
    for (const n of NOTAS) assert.ok(decimalEquals(decimalField(lido.raw, n), novas[n]), `${n} após PUT: ${decimalField(lido.raw, n)}`);
    assert.equal(lido.json.feedback, null, 'feedback omitido no PUT deve virar nulo (PUT substitui todos os campos)');
    assert.equal(lido.json.id, id);
    assert.equal(lido.json.boardId, banca.id);
    assert.equal(lido.json.evaluatorId, avaliador.id);
    assert.equal(lido.json.createdAt, criada.json.createdAt, 'createdAt não pode mudar no PUT');
  });

  caso('VER-02', 'PUT inválido (nota 11) é rejeitado e a versão anterior continua intacta', async (ctx) => {
    const { res: criada, avaliador, banca } = await criarAvaliacao(ctx, { feedback: 'Feedback fictício a preservar' });
    const id = criada.json.id;
    const put = await ctx.api('PUT', `/evaluations/${id}`, {
      rawBody: avaliacaoRaw({ boardId: banca.id, evaluatorId: avaliador.id, technicalGrade: '11', presentationGrade: '1.00', artifactGrade: '1.00', feedback: 'não deve gravar' }),
    });
    assertProblem(put, 400, 'VALIDATION_ERROR', { campos: ['technicalGrade'] });
    const lido = await ctx.api('GET', `/evaluations/${id}`);
    for (const n of NOTAS) assert.ok(decimalEquals(decimalField(lido.raw, n), BASE_OK[n]), `${n} deveria continuar ${BASE_OK[n]}, veio ${decimalField(lido.raw, n)}`);
    assert.equal(lido.json.feedback, 'Feedback fictício a preservar');
  });

  caso('VER-03', 'PUT com avaliador inexistente devolve 404 e a versão anterior continua intacta', async (ctx) => {
    const { res: criada, banca } = await criarAvaliacao(ctx);
    const id = criada.json.id;
    const put = await ctx.api('PUT', `/evaluations/${id}`, {
      rawBody: avaliacaoRaw({ boardId: banca.id, evaluatorId: uuidInexistente(), technicalGrade: '1.00', presentationGrade: '1.00', artifactGrade: '1.00' }),
    });
    assertProblem(put, 404, 'NOT_FOUND');
    const lido = await ctx.api('GET', `/evaluations/${id}`);
    for (const n of NOTAS) assert.ok(decimalEquals(decimalField(lido.raw, n), BASE_OK[n]), `${n} deveria continuar ${BASE_OK[n]}`);
    assert.equal(lido.json.evaluatorId, criada.json.evaluatorId, 'evaluatorId não pode mudar');
  });

  caso('VER-04', 'PUT em id inexistente devolve 404 e não cria registro', async (ctx) => {
    const id = uuidInexistente();
    const av = await ds.avaliador();
    const put = await ctx.api('PUT', `/evaluations/${id}`, {
      rawBody: avaliacaoRaw({ boardId: ctxBanca.banca.id, evaluatorId: av.id, ...BASE_OK }),
    });
    assertProblem(put, 404, 'NOT_FOUND');
    const lido = await ctx.api('GET', `/evaluations/${id}`);
    assertProblem(lido, 404, 'NOT_FOUND');
  });

  for (const v of fx.versao_anterior) {
    bloqueado(v.id, `${v.cenario} (${v.ac})`, v.bloqueio);
  }
});
