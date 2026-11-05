// Massa sintética do QA-016. Tudo fictício: nomes e e-mails em domínio .invalid.
// Ordem de criação do contrato: users -> projects -> project-members -> boards -> evaluations.
import { api, RUN_ID } from './client.mjs';

export class Dataset {
  constructor() {
    this.criados = []; // { path, id } na ordem de criação; a limpeza segue a ordem inversa
    this.limpeza = { removidos: 0, falhas: [] };
    this.n = 0;
  }

  /** Cria um recurso de preparação. Falha o setup se não vier 201. */
  async criar(path, body, caseId = 'setup') {
    const r = await api('POST', path, { body, caseId });
    if (r.status !== 201) {
      throw new Error(`setup ${path} falhou: status ${r.status} code ${r.json?.code} (correlation ${r.correlationId})`);
    }
    this.criados.push({ path, id: r.json.id });
    return r.json;
  }

  /** Registra para limpeza um recurso criado dentro de um teste. */
  registrar(path, id) {
    this.criados.push({ path, id });
  }

  async usuario(role, rotulo, caseId = 'setup') {
    const seq = ++this.n;
    return this.criar(
      '/users',
      {
        email: `qa016.${RUN_ID}.${rotulo}${seq}@exemplo.invalid`,
        fullName: `QA016 ${rotulo} ${seq} (fictício)`,
        role,
        active: true,
      },
      caseId,
    );
  }

  /** Avaliador novo (professor), para cada caso ter um par banca+avaliador próprio. */
  // TODO BE-011: se a alocação de avaliadores passar a ser exigida, alocar aqui.
  avaliador(caseId = 'setup') {
    return this.usuario('PROFESSOR', 'avaliador', caseId);
  }

  /** Cadeia projeto -> membro -> banca. Cada projeto tem no máximo uma banca. */
  async banca({ aluno, professor }, caseId = 'setup') {
    const projeto = await this.criar(
      '/projects',
      {
        title: `QA016 ${RUN_ID} projeto fictício ${++this.n}`,
        description: 'Projeto sintético para validar notas.',
        projectType: 'ACADEMIC_PI',
        status: 'IN_PROGRESS',
        semester: '2026.2',
        course: 'Engenharia de Software',
        leaderId: aluno.id,
        advisorId: professor.id,
      },
      caseId,
    );
    await this.criar(
      '/project-members',
      { projectId: projeto.id, userId: aluno.id, memberRole: 'LEADER', status: 'ACCEPTED' },
      caseId,
    );
    const banca = await this.criar(
      '/boards',
      {
        projectId: projeto.id,
        scheduledAt: '2026-11-20T17:00:00Z',
        endsAt: '2026-11-20T18:00:00Z',
        location: 'Sala fictícia 1',
        status: 'IN_EVALUATION',
      },
      caseId,
    );
    return { projeto, banca };
  }

  /** Remove o que o teste criou, do mais novo para o mais antigo. Nunca toca em dados de outros. */
  async limparTudo() {
    for (const { path, id } of [...this.criados].reverse()) {
      const r = await api('DELETE', `${path}/${id}`, { caseId: 'cleanup' });
      if (r.status === 204 || r.status === 404) this.limpeza.removidos++;
      else this.limpeza.falhas.push(`${path}/${id}: ${r.status} ${r.json?.code ?? ''} (correlation ${r.correlationId})`);
    }
    this.criados = [];
  }
}
