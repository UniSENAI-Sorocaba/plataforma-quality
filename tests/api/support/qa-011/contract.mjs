/* eslint-disable no-undef */
// tests/api/support/qa-011/contract.mjs
//
// Contract definition for API v0.1.0 (SPEC‑PI‑001).
// Contains the routes, expected payloads and useful default values for the tests.

export const ENDPOINTS = {
  PROJECTS: '/api/v1/projects',
  PROJECT_MEMBERS: '/api/v1/project-members',
};

export const PROJECT_TYPES = Object.freeze({
  ACADEMIC_PI: 'ACADEMIC_PI',
  EXTENSION: 'EXTENSION',
  HYBRID: 'HYBRID',
});

export const PROJECT_STATUS = Object.freeze({
  PROPOSED: 'PROPOSED',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  EVALUATED: 'EVALUATED',
  ARCHIVED: 'ARCHIVED',
});

export const MEMBER_ROLES = Object.freeze({
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
});

export const MEMBER_STATUS = Object.freeze({
  INVITED: 'INVITED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
});

/**
 * Example payload for creating a project.
 */
export const sampleProjectRequest = () => ({
  title: 'Projeto de Pesquisa X',
  description: 'Descrição breve do projeto.',
  projectType: PROJECT_TYPES.ACADEMIC_PI,
  status: PROJECT_STATUS.PROPOSED,
  semester: '2026.2',
  course: 'Engenharia de Software',
  leaderId: crypto.randomUUID(),
});

/**
 * Example payload for creating a project member (participação).
 */
export const sampleProjectMemberRequest = (projectId) => ({
  projectId,
  userId: crypto.randomUUID(),
  memberRole: MEMBER_ROLES.LEADER,
  status: MEMBER_STATUS.INVITED,
});

/* -------------------------------------------------------------------------- *
 *  TODO – Inconsistências encontradas no contrato atual (F‑02, F‑03)
 * -------------------------------------------------------------------------- */
// TODO: F-03 – O contrato ainda exige os campos `semester` e `course`
//           nos projetos, porém eles foram removidos da camada de
//           persistência do banco de dados. Os testes vão falhar até que
//           o back‑end sincronize o modelo.

// TODO: F-02 – O fluxo de convite de membros aceita apenas o status
//           `INVITED/ACCEPTED/DECLINED`. O serviço atualmente aceita
//           também `PENDING`, o que gera divergência com a especificação.
/* -------------------------------------------------------------------------- */