import assert from "node:assert/strict";
import test from "node:test";

/**
 * Suíte de Testes de API e Concorrência — QA-013 (plataforma-quality#13)
 * "[QA-013] Cobrir criação de banca, timezone, avaliador duplicado ou inválido,
 * sobreposição e concorrência; no máximo um agendamento conflitante pode ser confirmado"
 *
 * Objetivo e Escopo Normativo:
 * - SPEC-PI-002 (vinculada à dependência BE-011 e ao refinamento normativo PG-008):
 *   1. Criação válida de banca/agendamento com validação de autorização server-side,
 *      projeto elegível (PUBLISHED) e janela temporal consistente (startAt < endAt).
 *   2. Timezone: conversão e normalização canônica para UTC e America/Sao_Paulo (UTC-3),
 *      rejeição de timestamps sem offset/timezone explícito ou inválidos, e detecção de
 *      colisão entre requisições enviadas em timezones distintos (-03:00, Z, -04:00, +01:00).
 *   3. Avaliador duplicado ou inválido: bloqueio de avaliadores repetidos na mesma banca,
 *      usuários inexistentes, contas inativas, perfis sem habilitação de avaliação ou
 *      participantes com conflito de interesse no próprio projeto.
 *   4. Sobreposição (overlap): detecção exata de interseção (startA < endB && endA > startB)
 *      por avaliador, sala/recurso e projeto (parcial no início, parcial no fim,
 *      envelopamento total e horário idêntico), permitindo janelas contíguas (endA === startB).
 *   5. Concorrência: sob disparo simultâneo de múltiplas requisições conflitantes,
 *      no máximo um agendamento conflitante pode ser confirmado (201 Created), enquanto
 *      todas as demais tentativas concorrentes recebem 409 Conflict com log rastreável.
 *   6. Guarda normativa (PG-008 / Caderno de Validações) e Sanitização (MH-SEC-003 / MH-SEC-004):
 *      suporte à trava de feature quando o modo de proibição de bancas estiver ativo (403)
 *      e garantia de zero vazamento de tokens, senhas ou CPFs completos nos logs e erros.
 */

export const QA013_SYNTHETIC_ACTORS = {
  coordenacao: {
    id: "USR-QA013-COORD-01",
    label: "Coordenação Responsável pelo Agendamento de Bancas",
    cpf: "000.000.013-01",
    password: "[SYNTHETIC_PASS_QA013_COORD_01]",
    token: "AT_OPAQUE_QA013_COORD_01",
    active: true,
    roles: ["COORDENACAO"],
  },
  docenteOrientadorPi01: {
    id: "USR-QA013-DOC-01",
    label: "Docente Orientador do PRJ-PI-01 e Avaliador Habilitado",
    cpf: "000.000.013-02",
    password: "[SYNTHETIC_PASS_QA013_DOC_01]",
    token: "AT_OPAQUE_QA013_DOC_01",
    active: true,
    roles: ["DOCENTE"],
    ownedProjects: ["PRJ-PI-01", "PRJ-PI-DRAFT-04"],
  },
  docenteAvaliador02: {
    id: "USR-QA013-DOC-02",
    label: "Docente Avaliador 02",
    cpf: "000.000.013-03",
    password: "[SYNTHETIC_PASS_QA013_DOC_02]",
    token: "AT_OPAQUE_QA013_DOC_02",
    active: true,
    roles: ["DOCENTE"],
    ownedProjects: ["PRJ-PI-02"],
  },
  docenteAvaliador03: {
    id: "USR-QA013-DOC-03",
    label: "Docente Avaliador 03",
    cpf: "000.000.013-04",
    password: "[SYNTHETIC_PASS_QA013_DOC_03]",
    token: "AT_OPAQUE_QA013_DOC_03",
    active: true,
    roles: ["DOCENTE"],
    ownedProjects: ["PRJ-PI-03"],
  },
  docenteAvaliador04: {
    id: "USR-QA013-DOC-04",
    label: "Docente Avaliador 04",
    cpf: "000.000.013-05",
    password: "[SYNTHETIC_PASS_QA013_DOC_04]",
    token: "AT_OPAQUE_QA013_DOC_04",
    active: true,
    roles: ["DOCENTE"],
    ownedProjects: [],
  },
  docenteInativo: {
    id: "USR-QA013-DOC-INATIVO",
    label: "Docente com Conta Inativa (active=false)",
    cpf: "000.000.013-06",
    password: "[SYNTHETIC_PASS_QA013_DOC_INATIVO]",
    token: "AT_OPAQUE_QA013_DOC_INATIVO",
    active: false,
    roles: ["DOCENTE"],
    ownedProjects: [],
  },
  alunoParticipantePi01: {
    id: "USR-QA013-ALUNO-01",
    label: "Aluno Integrante do PRJ-PI-01 (Impedido de criar ou avaliar banca docente)",
    cpf: "000.000.013-07",
    password: "[SYNTHETIC_PASS_QA013_ALUNO_01]",
    token: "AT_OPAQUE_QA013_ALUNO_01",
    active: true,
    roles: ["ALUNO"],
    linkedProjects: ["PRJ-PI-01"],
  },
};

export const QA013_SYNTHETIC_PROJECTS = {
  "PRJ-PI-01": {
    id: "PRJ-PI-01",
    title: "Monitoramento Preditivo de Motores Elétricos WEG/SENAI",
    status: "PUBLISHED",
    ownerDocenteId: "USR-QA013-DOC-01",
    participants: ["USR-QA013-ALUNO-01"],
  },
  "PRJ-PI-02": {
    id: "PRJ-PI-02",
    title: "Célula Robotizada de Inspeção Dimensional Óptica",
    status: "PUBLISHED",
    ownerDocenteId: "USR-QA013-DOC-02",
    participants: [],
  },
  "PRJ-PI-03": {
    id: "PRJ-PI-03",
    title: "Gêmeo Digital de Linha de Envase Farmacêutico",
    status: "PUBLISHED",
    ownerDocenteId: "USR-QA013-DOC-03",
    participants: [],
  },
  "PRJ-PI-DRAFT-04": {
    id: "PRJ-PI-DRAFT-04",
    title: "[DRAFT_CONFIDENTIAL_PROJECT_PI_04]",
    status: "DRAFT",
    ownerDocenteId: "USR-QA013-DOC-01",
    participants: [],
  },
};

const ISO_EXPLICIT_TZ_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

/**
 * Valida e converte um timestamp ISO-8601 com timezone explícito para epoch ms (UTC)
 * e formata sua representação canônica em UTC e em America/Sao_Paulo (UTC-3).
 */
export function parseAndNormalizeTimestamp(rawTimestamp) {
  if (typeof rawTimestamp !== "string" || !rawTimestamp.trim()) {
    return { valid: false, reason: "TIMESTAMP_MISSING_OR_NOT_STRING" };
  }

  const match = ISO_EXPLICIT_TZ_REGEX.exec(rawTimestamp.trim());
  if (!match) {
    return {
      valid: false,
      reason: "TIMEZONE_OFFSET_REQUIRED_OR_MALFORMED_ISO",
    };
  }

  const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr, , tzPart, tzSign, tzHourStr, tzMinStr] =
    match;

  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minStr);
  const second = Number(secStr);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return { valid: false, reason: "CALENDAR_FIELD_OUT_OF_RANGE" };
  }

  let offsetMinutes = 0;
  if (tzPart !== "Z") {
    const tzHours = Number(tzHourStr);
    const tzMinutes = Number(tzMinStr);
    if (tzHours > 14 || tzMinutes > 59 || (tzHours === 14 && tzMinutes > 0)) {
      return { valid: false, reason: "TIMEZONE_OFFSET_OUT_OF_BOUNDS" };
    }
    offsetMinutes = (tzSign === "+" ? 1 : -1) * (tzHours * 60 + tzMinutes);
  }

  // Verifica se o dia existe no calendário (ex.: rejeita 2026-02-30)
  const utcCheck = new Date(
    Date.UTC(Number(yearStr), month - 1, day, hour, minute, second)
  );
  if (
    utcCheck.getUTCFullYear() !== Number(yearStr) ||
    utcCheck.getUTCMonth() + 1 !== month ||
    utcCheck.getUTCDate() !== day
  ) {
    return { valid: false, reason: "NON_EXISTENT_CALENDAR_DATE" };
  }

  const epochMs = Date.parse(rawTimestamp.trim());
  if (Number.isNaN(epochMs)) {
    return { valid: false, reason: "UNPARSEABLE_DATE" };
  }

  const canonicalUtc = new Date(epochMs).toISOString();
  // Representação canônica institucional em America/Sao_Paulo (UTC-3 = -180 min)
  const saoPauloMs = epochMs - 3 * 60 * 60 * 1000;
  const spDate = new Date(saoPauloMs);
  const pad2 = (n) => String(n).padStart(2, "0");
  const canonicalSaoPaulo = `${spDate.getUTCFullYear()}-${pad2(spDate.getUTCMonth() + 1)}-${pad2(
    spDate.getUTCDate()
  )}T${pad2(spDate.getUTCHours())}:${pad2(spDate.getUTCMinutes())}:${pad2(
    spDate.getUTCSeconds()
  )}-03:00`;

  return {
    valid: true,
    epochMs,
    originalOffset: tzPart,
    offsetMinutes,
    canonicalUtc,
    canonicalSaoPaulo,
  };
}

/**
 * Cria o motor determinístico e transacional de agendamento de bancas (SPEC-PI-002 / BE-011),
 * com fila de serialização/lock atômico para testes de concorrência e coletor de logs sanitizados.
 */
export function createBancaSchedulingHarness(options = {}) {
  const { bancaFeatureEnabled = true } = options;

  const actorsById = new Map(Object.values(QA013_SYNTHETIC_ACTORS).map((a) => [a.id, a]));
  const actorsByToken = new Map(
    Object.values(QA013_SYNTHETIC_ACTORS)
      .filter((a) => a.token)
      .map((a) => [a.token, a])
  );
  const projects = structuredClone(QA013_SYNTHETIC_PROJECTS);

  const confirmedBancas = [];
  const executionLogs = [];
  let seq = 0;
  let mutexChain = Promise.resolve();

  function maskCpf(cpf) {
    if (!cpf || typeof cpf !== "string") return null;
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return "***.***.***-**";
    return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  function recordLog(entry) {
    const safeEntry = {
      logSeq: executionLogs.length + 1,
      timestamp: "2026-11-02T20:45:00.000Z",
      requestId: entry.requestId,
      waveId: entry.waveId || null,
      actorId: entry.actor?.id || "ANONYMOUS",
      actorCpfMasked: maskCpf(entry.actor?.cpf),
      token: entry.actor?.token ? "[REDACTED]" : null,
      projectId: entry.projectId || null,
      room: entry.room || null,
      evaluatorIds: Array.isArray(entry.evaluatorIds) ? [...entry.evaluatorIds] : [],
      rawStartAt: entry.rawStartAt || null,
      rawEndAt: entry.rawEndAt || null,
      normalizedStartUtc: entry.normalizedStartUtc || null,
      normalizedEndUtc: entry.normalizedEndUtc || null,
      canonicalSaoPauloWindow: entry.canonicalSaoPauloWindow || null,
      decision: entry.decision,
      status: entry.status,
      code: entry.code,
      conflictWithBancaId: entry.conflictWithBancaId || null,
      conflictDimension: entry.conflictDimension || null,
      confirmedBancaId: entry.confirmedBancaId || null,
    };
    executionLogs.push(safeEntry);
    return safeEntry;
  }

  /**
   * Executa a validação e tentativa de reserva dentro da seção crítica serializada (lock transacional).
   */
  function evaluateAndCommitBooking(req, requestId) {
    const {
      token = null,
      waveId = null,
      body = {},
    } = req;
    const { projectId, room, startAt, endAt, evaluatorIds, timezone } = body;

    const actor = token ? actorsByToken.get(token) || null : null;

    // 1. Autenticação obrigatória
    if (!actor || !actor.active) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        decision: "DENY",
        status: 401,
        code: "UNAUTHENTICATED_OR_INACTIVE",
      });
      return {
        status: 401,
        decision: "DENY",
        body: {
          requestId,
          code: "UNAUTHENTICATED_OR_INACTIVE",
          message: "Sessão ausente, inválida ou conta inativa.",
        },
      };
    }

    // 2. Guarda de política normativa (PG-008 / Caderno de Validações quando o agendamento de bancas é desabilitado)
    if (!bancaFeatureEnabled) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        decision: "DENY",
        status: 403,
        code: "FEATURE_FORBIDDEN_BY_SPEC",
      });
      return {
        status: 403,
        decision: "DENY",
        body: {
          requestId,
          code: "FEATURE_FORBIDDEN_BY_SPEC",
          message:
            "Agendamento de banca desabilitado pela política normativa vigente (SPEC-PI-002 / PG-008).",
        },
      };
    }

    // 3. Autorização RBAC: apenas COORDENACAO ou DOCENTE responsável pelo projeto podem criar banca
    const proj = projectId ? projects[projectId] : null;
    const isCoord = actor.roles.includes("COORDENACAO");
    const isProjectOwnerDocente =
      actor.roles.includes("DOCENTE") && proj && proj.ownerDocenteId === actor.id;

    if (!isCoord && !isProjectOwnerDocente) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        decision: "DENY",
        status: 403,
        code: "FORBIDDEN_BANCA_CREATION_SCOPE",
      });
      return {
        status: 403,
        decision: "DENY",
        body: {
          requestId,
          code: "FORBIDDEN_BANCA_CREATION_SCOPE",
          message: "Apenas a Coordenação ou o Docente responsável pelo projeto podem agendar banca.",
        },
      };
    }

    // 4. Validação do projeto alvo (deve existir e estar PUBLISHED)
    if (!proj || proj.status !== "PUBLISHED") {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        decision: "REJECT",
        status: 422,
        code: "PROJECT_NOT_ELIGIBLE_FOR_BANCA",
      });
      return {
        status: 422,
        decision: "REJECT",
        body: {
          requestId,
          code: "PROJECT_NOT_ELIGIBLE_FOR_BANCA",
          message: "O projeto informado não existe ou não está publicado para agendamento de banca.",
        },
      };
    }

    // 5. Validação de Timezone explícito e timestamps ISO-8601
    const supportedTimezones = ["America/Sao_Paulo", "UTC", "Etc/UTC"];
    if (timezone !== undefined && !supportedTimezones.includes(timezone)) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        decision: "REJECT",
        status: 422,
        code: "INVALID_TIMEZONE_IDENTIFIER",
      });
      return {
        status: 422,
        decision: "REJECT",
        body: {
          requestId,
          code: "INVALID_TIMEZONE_IDENTIFIER",
          message: "Identificador de timezone inválido ou não suportado pela plataforma.",
        },
      };
    }

    const parsedStart = parseAndNormalizeTimestamp(startAt);
    const parsedEnd = parseAndNormalizeTimestamp(endAt);

    if (!parsedStart.valid || !parsedEnd.valid) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        decision: "REJECT",
        status: 422,
        code: "INVALID_TIMEZONE_OR_TIMESTAMP",
      });
      return {
        status: 422,
        decision: "REJECT",
        body: {
          requestId,
          code: "INVALID_TIMEZONE_OR_TIMESTAMP",
          message:
            "Timestamps de início e fim devem estar em formato ISO-8601 válido com offset de timezone explícito.",
          reason: !parsedStart.valid ? parsedStart.reason : parsedEnd.reason,
        },
      };
    }

    if (parsedEnd.epochMs <= parsedStart.epochMs) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        normalizedStartUtc: parsedStart.canonicalUtc,
        normalizedEndUtc: parsedEnd.canonicalUtc,
        decision: "REJECT",
        status: 422,
        code: "INVALID_TIME_RANGE",
      });
      return {
        status: 422,
        decision: "REJECT",
        body: {
          requestId,
          code: "INVALID_TIME_RANGE",
          message: "O horário de término da banca deve ser estritamente posterior ao horário de início.",
        },
      };
    }

    // 6. Validação de Avaliadores (não vazio, sem duplicatas, existentes, ativos e habilitados)
    if (!Array.isArray(evaluatorIds) || evaluatorIds.length < 2) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        normalizedStartUtc: parsedStart.canonicalUtc,
        normalizedEndUtc: parsedEnd.canonicalUtc,
        decision: "REJECT",
        status: 422,
        code: "INVALID_EVALUATOR_LIST",
      });
      return {
        status: 422,
        decision: "REJECT",
        body: {
          requestId,
          code: "INVALID_EVALUATOR_LIST",
          message: "A banca deve conter ao menos 2 avaliadores válidos.",
        },
      };
    }

    const uniqueEvaluators = new Set(evaluatorIds);
    if (uniqueEvaluators.size !== evaluatorIds.length) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        normalizedStartUtc: parsedStart.canonicalUtc,
        normalizedEndUtc: parsedEnd.canonicalUtc,
        decision: "REJECT",
        status: 422,
        code: "DUPLICATE_EVALUATOR",
      });
      return {
        status: 422,
        decision: "REJECT",
        body: {
          requestId,
          code: "DUPLICATE_EVALUATOR",
          message: "Não é permitido repetir o mesmo avaliador na composição da banca.",
        },
      };
    }

    for (const evaluatorId of evaluatorIds) {
      const evaluator = actorsById.get(evaluatorId);
      if (!evaluator) {
        recordLog({
          requestId,
          waveId,
          actor,
          projectId,
          room,
          evaluatorIds,
          rawStartAt: startAt,
          rawEndAt: endAt,
          normalizedStartUtc: parsedStart.canonicalUtc,
          normalizedEndUtc: parsedEnd.canonicalUtc,
          decision: "REJECT",
          status: 422,
          code: "INVALID_EVALUATOR_NOT_FOUND",
        });
        return {
          status: 422,
          decision: "REJECT",
          body: {
            requestId,
            code: "INVALID_EVALUATOR_NOT_FOUND",
            message: `Avaliador informado (${evaluatorId}) não foi encontrado no cadastro.`,
          },
        };
      }

      if (!evaluator.active) {
        recordLog({
          requestId,
          waveId,
          actor,
          projectId,
          room,
          evaluatorIds,
          rawStartAt: startAt,
          rawEndAt: endAt,
          normalizedStartUtc: parsedStart.canonicalUtc,
          normalizedEndUtc: parsedEnd.canonicalUtc,
          decision: "REJECT",
          status: 422,
          code: "INVALID_EVALUATOR_INACTIVE",
        });
        return {
          status: 422,
          decision: "REJECT",
          body: {
            requestId,
            code: "INVALID_EVALUATOR_INACTIVE",
            message: `Avaliador informado (${evaluatorId}) está com conta inativa.`,
          },
        };
      }

      const isEligibleRole =
        evaluator.roles.includes("DOCENTE") || evaluator.roles.includes("COORDENACAO");
      const isProjectStudent = (proj.participants || []).includes(evaluatorId);

      if (!isEligibleRole || isProjectStudent) {
        recordLog({
          requestId,
          waveId,
          actor,
          projectId,
          room,
          evaluatorIds,
          rawStartAt: startAt,
          rawEndAt: endAt,
          normalizedStartUtc: parsedStart.canonicalUtc,
          normalizedEndUtc: parsedEnd.canonicalUtc,
          decision: "REJECT",
          status: 422,
          code: "INVALID_EVALUATOR_ROLE_OR_CONFLICT",
        });
        return {
          status: 422,
          decision: "REJECT",
          body: {
            requestId,
            code: "INVALID_EVALUATOR_ROLE_OR_CONFLICT",
            message: `Avaliador informado (${evaluatorId}) não possui perfil habilitado ou possui impedimento no projeto.`,
          },
        };
      }
    }

    if (!room || typeof room !== "string" || !room.trim()) {
      recordLog({
        requestId,
        waveId,
        actor,
        projectId,
        room,
        evaluatorIds,
        rawStartAt: startAt,
        rawEndAt: endAt,
        normalizedStartUtc: parsedStart.canonicalUtc,
        normalizedEndUtc: parsedEnd.canonicalUtc,
        decision: "REJECT",
        status: 422,
        code: "INVALID_ROOM_OR_LOCATION",
      });
      return {
        status: 422,
        decision: "REJECT",
        body: {
          requestId,
          code: "INVALID_ROOM_OR_LOCATION",
          message: "Sala ou local da banca é obrigatório.",
        },
      };
    }

    const normalizedRoom = room.trim().toUpperCase();
    const canonicalSaoPauloWindow = `${parsedStart.canonicalSaoPaulo} -> ${parsedEnd.canonicalSaoPaulo}`;

    // 7. Verificação atômica de sobreposição (Overlap: startA < endB && endA > startB)
    // Compara em epochMs (UTC normalizado), garantindo detecção mesmo entre timezones diferentes.
    for (const existing of confirmedBancas) {
      const overlapsInTime =
        parsedStart.epochMs < existing.endEpochMs && parsedEnd.epochMs > existing.startEpochMs;

      if (!overlapsInTime) continue;

      const sameProject = existing.projectId === proj.id;
      const sameRoom = existing.room === normalizedRoom;
      const sharedEvaluators = evaluatorIds.filter((id) => existing.evaluatorIds.includes(id));

      if (sameProject || sameRoom || sharedEvaluators.length > 0) {
        const conflictDimension = sameEvaluatorOrRoomDimension({
          sameProject,
          sameRoom,
          sharedEvaluators,
        });

        recordLog({
          requestId,
          waveId,
          actor,
          projectId: proj.id,
          room: normalizedRoom,
          evaluatorIds,
          rawStartAt: startAt,
          rawEndAt: endAt,
          normalizedStartUtc: parsedStart.canonicalUtc,
          normalizedEndUtc: parsedEnd.canonicalUtc,
          canonicalSaoPauloWindow,
          decision: "CONFLICT",
          status: 409,
          code: "SCHEDULE_OVERLAP_CONFLICT",
          conflictWithBancaId: existing.bancaId,
          conflictDimension,
        });

        return {
          status: 409,
          decision: "CONFLICT",
          body: {
            requestId,
            code: "SCHEDULE_OVERLAP_CONFLICT",
            message:
              "Conflito de agendamento: já existe banca confirmada com sobreposição de horário para avaliador, sala ou projeto.",
            conflictWithBancaId: existing.bancaId,
            conflictDimension,
            sharedEvaluators,
            normalizedWindowUtc: {
              startAt: parsedStart.canonicalUtc,
              endAt: parsedEnd.canonicalUtc,
            },
          },
        };
      }
    }

    // 8. Confirmação atômica (única por janela conflitante)
    seq += 1;
    const bancaId = `BANCA-PI-${String(seq).padStart(3, "0")}`;
    const confirmedRecord = {
      bancaId,
      requestId,
      waveId,
      projectId: proj.id,
      room: normalizedRoom,
      evaluatorIds: [...evaluatorIds],
      startEpochMs: parsedStart.epochMs,
      endEpochMs: parsedEnd.epochMs,
      startAtUtc: parsedStart.canonicalUtc,
      endAtUtc: parsedEnd.canonicalUtc,
      startAtSaoPaulo: parsedStart.canonicalSaoPaulo,
      endAtSaoPaulo: parsedEnd.canonicalSaoPaulo,
      timezone: "America/Sao_Paulo",
      status: "CONFIRMED",
      createdBy: actor.id,
    };

    confirmedBancas.push(confirmedRecord);

    recordLog({
      requestId,
      waveId,
      actor,
      projectId: proj.id,
      room: normalizedRoom,
      evaluatorIds,
      rawStartAt: startAt,
      rawEndAt: endAt,
      normalizedStartUtc: parsedStart.canonicalUtc,
      normalizedEndUtc: parsedEnd.canonicalUtc,
      canonicalSaoPauloWindow,
      decision: "CONFIRMED",
      status: 201,
      code: "BANCA_SCHEDULED",
      confirmedBancaId: bancaId,
    });

    return {
      status: 201,
      decision: "CONFIRMED",
      body: {
        requestId,
        code: "BANCA_SCHEDULED",
        data: confirmedRecord,
      },
    };
  }

  function sameEvaluatorOrRoomDimension({ sameProject, sameRoom, sharedEvaluators }) {
    const dimensions = [];
    if (sharedEvaluators.length > 0) dimensions.push("EVALUATOR");
    if (sameRoom) dimensions.push("ROOM");
    if (sameProject) dimensions.push("PROJECT");
    return dimensions.join("+");
  }

  /**
   * Execução síncrona/sequencial para casos funcionais.
   */
  function scheduleBancaSync(req) {
    const requestId = req.requestId || `REQ-SEQ-${String(executionLogs.length + 1).padStart(3, "0")}`;
    return evaluateAndCommitBooking(req, requestId);
  }

  /**
   * Execução assíncrona serializada por lock atômico (simula transação SERIALIZABLE / SELECT FOR UPDATE
   * ou constraint de exclusão no banco em BE-011 sob rajada concorrente).
   */
  function scheduleBancaConcurrent(req) {
    const requestId = req.requestId || `REQ-CONC-${String(executionLogs.length + 1).padStart(3, "0")}`;
    const operation = mutexChain.then(async () => {
      // Micro-yield para simular disputa real de event loop entre transações concorrentes
      await Promise.resolve();
      return evaluateAndCommitBooking(req, requestId);
    });
    mutexChain = operation.catch(() => {});
    return operation;
  }

  function getConfirmedBancas() {
    return structuredClone(confirmedBancas);
  }

  function getExecutionLogs() {
    return structuredClone(executionLogs);
  }

  return {
    scheduleBancaSync,
    scheduleBancaConcurrent,
    getConfirmedBancas,
    getExecutionLogs,
  };
}

test("QA-013 | CT-QA013-01 (SPEC-PI-002 Criação de Banca): agenda banca válida para projeto publicado e recusa projeto rascunho, janela invertida ou perfil não autorizado", () => {
  const harness = createBancaSchedulingHarness();

  // 1. Criação válida pela Coordenação (201 Created)
  const validCreated = harness.scheduleBancaSync({
    requestId: "REQ-CT01-01",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "sala-lab-101",
      timezone: "America/Sao_Paulo",
      startAt: "2026-11-10T09:00:00-03:00",
      endAt: "2026-11-10T10:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });

  assert.equal(validCreated.status, 201);
  assert.equal(validCreated.decision, "CONFIRMED");
  assert.equal(validCreated.body.code, "BANCA_SCHEDULED");
  assert.equal(validCreated.body.data.bancaId, "BANCA-PI-001");
  assert.equal(validCreated.body.data.room, "SALA-LAB-101");
  assert.equal(validCreated.body.data.startAtUtc, "2026-11-10T12:00:00.000Z");
  assert.equal(validCreated.body.data.endAtUtc, "2026-11-10T13:00:00.000Z");
  assert.equal(validCreated.body.data.startAtSaoPaulo, "2026-11-10T09:00:00-03:00");

  // 2. Tentativa de agendar banca para projeto em DRAFT -> 422 PROJECT_NOT_ELIGIBLE_FOR_BANCA
  const draftRejected = harness.scheduleBancaSync({
    requestId: "REQ-CT01-02",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-DRAFT-04",
      room: "SALA-LAB-102",
      startAt: "2026-11-10T14:00:00-03:00",
      endAt: "2026-11-10T15:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });
  assert.equal(draftRejected.status, 422);
  assert.equal(draftRejected.body.code, "PROJECT_NOT_ELIGIBLE_FOR_BANCA");

  // 3. Janela temporal invertida (endAt <= startAt) -> 422 INVALID_TIME_RANGE
  const invertedWindow = harness.scheduleBancaSync({
    requestId: "REQ-CT01-03",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-102",
      startAt: "2026-11-10T16:00:00-03:00",
      endAt: "2026-11-10T15:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-02", "USR-QA013-DOC-03"],
    },
  });
  assert.equal(invertedWindow.status, 422);
  assert.equal(invertedWindow.body.code, "INVALID_TIME_RANGE");

  // 4. Aluno ou Docente de outro projeto sem vínculo tentando criar banca -> 403 FORBIDDEN_BANCA_CREATION_SCOPE
  const studentDenied = harness.scheduleBancaSync({
    requestId: "REQ-CT01-04",
    token: QA013_SYNTHETIC_ACTORS.alunoParticipantePi01.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-102",
      startAt: "2026-11-10T16:00:00-03:00",
      endAt: "2026-11-10T17:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-02", "USR-QA013-DOC-03"],
    },
  });
  assert.equal(studentDenied.status, 403);
  assert.equal(studentDenied.body.code, "FORBIDDEN_BANCA_CREATION_SCOPE");
});

test("QA-013 | CT-QA013-02 (SPEC-PI-002 Timezone): normaliza diferentes fusos para UTC/UTC-3, detecta conflito entre offsets distintos (-03:00 vs Z vs +01:00) e rejeita timestamp sem timezone", () => {
  const harness = createBancaSchedulingHarness();

  // 1. Agenda banca em America/Sao_Paulo: 14:00-03:00 às 15:00-03:00 (= 17:00Z às 18:00Z)
  const spBooking = harness.scheduleBancaSync({
    requestId: "REQ-CT02-01",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      timezone: "America/Sao_Paulo",
      startAt: "2026-11-12T14:00:00-03:00",
      endAt: "2026-11-12T15:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });
  assert.equal(spBooking.status, 201);
  assert.equal(spBooking.body.data.startAtUtc, "2026-11-12T17:00:00.000Z");
  assert.equal(spBooking.body.data.endAtUtc, "2026-11-12T18:00:00.000Z");

  // 2. Tenta agendar outra banca enviando UTC explícito ("2026-11-12T17:30:00Z" a "2026-11-12T18:30:00Z")
  // que equivale a 14:30-03:00..15:30-03:00 -> DEVE detectar sobreposição com DOC-01!
  const utcOverlap = harness.scheduleBancaSync({
    requestId: "REQ-CT02-02",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-202",
      timezone: "UTC",
      startAt: "2026-11-12T17:30:00Z",
      endAt: "2026-11-12T18:30:00Z",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-03"],
    },
  });
  assert.equal(utcOverlap.status, 409);
  assert.equal(utcOverlap.body.code, "SCHEDULE_OVERLAP_CONFLICT");
  assert.equal(utcOverlap.body.conflictWithBancaId, "BANCA-PI-001");
  assert.equal(utcOverlap.body.conflictDimension, "EVALUATOR");

  // 3. Tenta agendar em offset +01:00 ("2026-11-12T18:15:00+01:00" = "2026-11-12T17:15:00Z") -> 409
  const plusOneOverlap = harness.scheduleBancaSync({
    requestId: "REQ-CT02-03",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-03",
      room: "SALA-LAB-303",
      startAt: "2026-11-12T18:15:00+01:00",
      endAt: "2026-11-12T19:15:00+01:00",
      evaluatorIds: ["USR-QA013-DOC-02", "USR-QA013-DOC-04"],
    },
  });
  assert.equal(plusOneOverlap.status, 409);
  assert.equal(plusOneOverlap.body.code, "SCHEDULE_OVERLAP_CONFLICT");

  // 4. Timestamp sem offset de timezone ("2026-11-12T16:00:00") -> 422 INVALID_TIMEZONE_OR_TIMESTAMP
  const missingOffset = harness.scheduleBancaSync({
    requestId: "REQ-CT02-04",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-202",
      startAt: "2026-11-12T16:00:00",
      endAt: "2026-11-12T17:00:00",
      evaluatorIds: ["USR-QA013-DOC-03", "USR-QA013-DOC-04"],
    },
  });
  assert.equal(missingOffset.status, 422);
  assert.equal(missingOffset.body.code, "INVALID_TIMEZONE_OR_TIMESTAMP");

  // 5. Offset ou identificador de timezone inexistente ("America/Invalid_Zone" ou "-25:00") -> 422
  const invalidTzName = harness.scheduleBancaSync({
    requestId: "REQ-CT02-05",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-202",
      timezone: "America/Invalid_Zone",
      startAt: "2026-11-12T16:00:00-03:00",
      endAt: "2026-11-12T17:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-03", "USR-QA013-DOC-04"],
    },
  });
  assert.equal(invalidTzName.status, 422);
  assert.equal(invalidTzName.body.code, "INVALID_TIMEZONE_IDENTIFIER");
});

test("QA-013 | CT-QA013-03 (SPEC-PI-002 Avaliador Duplicado ou Inválido): rejeita avaliador repetido na mesma banca, avaliador inexistente, inativo, lista insuficiente ou aluno impedido", () => {
  const harness = createBancaSchedulingHarness();

  // 1. Avaliador duplicado no payload [DOC-01, DOC-01] -> 422 DUPLICATE_EVALUATOR
  const duplicateEvaluator = harness.scheduleBancaSync({
    requestId: "REQ-CT03-01",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-13T10:00:00-03:00",
      endAt: "2026-11-13T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-01"],
    },
  });
  assert.equal(duplicateEvaluator.status, 422);
  assert.equal(duplicateEvaluator.body.code, "DUPLICATE_EVALUATOR");

  // 2. Menos de 2 avaliadores -> 422 INVALID_EVALUATOR_LIST
  const singleEvaluator = harness.scheduleBancaSync({
    requestId: "REQ-CT03-02",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-13T10:00:00-03:00",
      endAt: "2026-11-13T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01"],
    },
  });
  assert.equal(singleEvaluator.status, 422);
  assert.equal(singleEvaluator.body.code, "INVALID_EVALUATOR_LIST");

  // 3. Avaliador inexistente no banco -> 422 INVALID_EVALUATOR_NOT_FOUND
  const ghostEvaluator = harness.scheduleBancaSync({
    requestId: "REQ-CT03-03",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-13T10:00:00-03:00",
      endAt: "2026-11-13T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-INEXISTENTE-99"],
    },
  });
  assert.equal(ghostEvaluator.status, 422);
  assert.equal(ghostEvaluator.body.code, "INVALID_EVALUATOR_NOT_FOUND");

  // 4. Avaliador com conta inativa (active=false) -> 422 INVALID_EVALUATOR_INACTIVE
  const inactiveEvaluator = harness.scheduleBancaSync({
    requestId: "REQ-CT03-04",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-13T10:00:00-03:00",
      endAt: "2026-11-13T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-INATIVO"],
    },
  });
  assert.equal(inactiveEvaluator.status, 422);
  assert.equal(inactiveEvaluator.body.code, "INVALID_EVALUATOR_INACTIVE");

  // 5. Aluno integrante do próprio projeto incluído como avaliador -> 422 INVALID_EVALUATOR_ROLE_OR_CONFLICT
  const studentEvaluator = harness.scheduleBancaSync({
    requestId: "REQ-CT03-05",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-13T10:00:00-03:00",
      endAt: "2026-11-13T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-ALUNO-01"],
    },
  });
  assert.equal(studentEvaluator.status, 422);
  assert.equal(studentEvaluator.body.code, "INVALID_EVALUATOR_ROLE_OR_CONFLICT");

  assert.equal(harness.getConfirmedBancas().length, 0);
});

test("QA-013 | CT-QA013-04 (SPEC-PI-002 Sobreposição de Horários): bloqueia overlap parcial, total, por sala, avaliador ou projeto e permite agendamentos contíguos (endA === startB)", () => {
  const harness = createBancaSchedulingHarness();

  // Banca base: 10:00 às 11:00 (-03:00) | PRJ-PI-01 | SALA-LAB-101 | DOC-01 + DOC-02
  const baseBanca = harness.scheduleBancaSync({
    requestId: "REQ-CT04-BASE",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-16T10:00:00-03:00",
      endAt: "2026-11-16T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });
  assert.equal(baseBanca.status, 201);

  // 1. Overlap parcial no início (09:30 às 10:15) por avaliador DOC-01 em outra sala -> 409
  const partialStart = harness.scheduleBancaSync({
    requestId: "REQ-CT04-OVL-START",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-202",
      startAt: "2026-11-16T09:30:00-03:00",
      endAt: "2026-11-16T10:15:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-03"],
    },
  });
  assert.equal(partialStart.status, 409);
  assert.equal(partialStart.body.conflictDimension, "EVALUATOR");

  // 2. Overlap parcial no fim (10:45 às 11:30) por sala SALA-LAB-101 com outros docentes -> 409
  const partialEnd = harness.scheduleBancaSync({
    requestId: "REQ-CT04-OVL-END",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-101",
      startAt: "2026-11-16T10:45:00-03:00",
      endAt: "2026-11-16T11:30:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-03", "USR-QA013-DOC-04"],
    },
  });
  assert.equal(partialEnd.status, 409);
  assert.equal(partialEnd.body.conflictDimension, "ROOM");

  // 3. Overlap por envelopamento externo (09:30 às 11:30) pelo mesmo projeto PRJ-PI-01 -> 409
  const enveloping = harness.scheduleBancaSync({
    requestId: "REQ-CT04-OVL-ENV",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-303",
      startAt: "2026-11-16T09:30:00-03:00",
      endAt: "2026-11-16T11:30:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-03", "USR-QA013-DOC-04"],
    },
  });
  assert.equal(enveloping.status, 409);
  assert.equal(enveloping.body.conflictDimension, "PROJECT");

  // 4. Janelas contíguas sem interseção (09:00..10:00 e 11:00..12:00) com os mesmos recursos -> 201 Created
  const adjacentBefore = harness.scheduleBancaSync({
    requestId: "REQ-CT04-ADJ-BEFORE",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-02",
      room: "SALA-LAB-101",
      startAt: "2026-11-16T09:00:00-03:00",
      endAt: "2026-11-16T10:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });
  assert.equal(adjacentBefore.status, 201);

  const adjacentAfter = harness.scheduleBancaSync({
    requestId: "REQ-CT04-ADJ-AFTER",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-03",
      room: "SALA-LAB-101",
      startAt: "2026-11-16T11:00:00-03:00",
      endAt: "2026-11-16T12:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });
  assert.equal(adjacentAfter.status, 201);
  assert.equal(harness.getConfirmedBancas().length, 3);
});

test("QA-013 | CT-QA013-05 (SPEC-PI-002 Concorrência): sob rajada simultânea de agendamentos conflitantes, confirma no máximo 1 (201) e rejeita todos os demais (409)", async () => {
  const harness = createBancaSchedulingHarness();

  // Onda 1: 12 requisições concorrentes disputando a mesma janela (14:00..15:00 -03:00 / 17:00..18:00Z)
  // usando diferentes offsets de timezone (-03:00, Z, -04:00, +01:00) e sobreposições parciais.
  const wave1Payloads = [
    { startAt: "2026-11-18T14:00:00-03:00", endAt: "2026-11-18T15:00:00-03:00", projectId: "PRJ-PI-01" },
    { startAt: "2026-11-18T17:00:00Z", endAt: "2026-11-18T18:00:00Z", projectId: "PRJ-PI-02" },
    { startAt: "2026-11-18T14:15:00-03:00", endAt: "2026-11-18T15:15:00-03:00", projectId: "PRJ-PI-03" },
    { startAt: "2026-11-18T13:00:00-04:00", endAt: "2026-11-18T14:00:00-04:00", projectId: "PRJ-PI-01" },
    { startAt: "2026-11-18T18:00:00+01:00", endAt: "2026-11-18T19:00:00+01:00", projectId: "PRJ-PI-02" },
    { startAt: "2026-11-18T13:45:00-03:00", endAt: "2026-11-18T14:30:00-03:00", projectId: "PRJ-PI-03" },
    { startAt: "2026-11-18T17:20:00Z", endAt: "2026-11-18T17:50:00Z", projectId: "PRJ-PI-01" },
    { startAt: "2026-11-18T14:30:00-03:00", endAt: "2026-11-18T15:30:00-03:00", projectId: "PRJ-PI-02" },
    { startAt: "2026-11-18T13:30:00-03:00", endAt: "2026-11-18T15:30:00-03:00", projectId: "PRJ-PI-03" },
    { startAt: "2026-11-18T14:00:00-03:00", endAt: "2026-11-18T15:00:00-03:00", projectId: "PRJ-PI-02" },
    { startAt: "2026-11-18T17:05:00Z", endAt: "2026-11-18T18:05:00Z", projectId: "PRJ-PI-03" },
    { startAt: "2026-11-18T14:10:00-03:00", endAt: "2026-11-18T14:55:00-03:00", projectId: "PRJ-PI-01" },
  ];

  const wave1Responses = await Promise.all(
    wave1Payloads.map((item, idx) =>
      harness.scheduleBancaConcurrent({
        requestId: `REQ-W1-${String(idx + 1).padStart(2, "0")}`,
        waveId: "WAVE-CONC-01",
        token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
        body: {
          projectId: item.projectId,
          room: "SALA-AUD-01",
          startAt: item.startAt,
          endAt: item.endAt,
          evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
        },
      })
    )
  );

  const wave1Confirmed = wave1Responses.filter((r) => r.status === 201);
  const wave1Conflicts = wave1Responses.filter((r) => r.status === 409);

  assert.equal(
    wave1Confirmed.length,
    1,
    "No máximo um agendamento conflitante pode ser confirmado na Onda Concorrente 1"
  );
  assert.equal(wave1Conflicts.length, 11);

  const winningBancaId = wave1Confirmed[0].body.data.bancaId;
  for (const conflictRes of wave1Conflicts) {
    assert.equal(conflictRes.body.code, "SCHEDULE_OVERLAP_CONFLICT");
    assert.equal(conflictRes.body.conflictWithBancaId, winningBancaId);
  }

  // Onda 2: 10 requisições concorrentes disputando um segundo slot disjunto (16:00..17:00 -03:00 em SALA-LAB-202)
  const wave2Responses = await Promise.all(
    Array.from({ length: 10 }, (_, idx) =>
      harness.scheduleBancaConcurrent({
        requestId: `REQ-W2-${String(idx + 1).padStart(2, "0")}`,
        waveId: "WAVE-CONC-02",
        token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
        body: {
          projectId: idx % 2 === 0 ? "PRJ-PI-02" : "PRJ-PI-03",
          room: "SALA-LAB-202",
          startAt: idx % 2 === 0 ? "2026-11-18T16:00:00-03:00" : "2026-11-18T19:10:00Z",
          endAt: idx % 2 === 0 ? "2026-11-18T17:00:00-03:00" : "2026-11-18T20:10:00Z",
          evaluatorIds: ["USR-QA013-DOC-03", "USR-QA013-DOC-04"],
        },
      })
    )
  );

  const wave2Confirmed = wave2Responses.filter((r) => r.status === 201);
  const wave2Conflicts = wave2Responses.filter((r) => r.status === 409);

  assert.equal(
    wave2Confirmed.length,
    1,
    "No máximo um agendamento conflitante pode ser confirmado na Onda Concorrente 2"
  );
  assert.equal(wave2Conflicts.length, 9);

  // Estado final persistido: exatamente 2 bancas confirmadas (1 da Onda 1 + 1 da Onda 2)
  const allConfirmed = harness.getConfirmedBancas();
  assert.equal(allConfirmed.length, 2);
  assert.equal(harness.getExecutionLogs().length, 22);
});

test("QA-013 | CT-QA013-06 (SPEC-PI-002 Guarda Normativa PG-008 e Sanitização MH-SEC-004): aplica bloqueio quando política do Caderno desabilita bancas e garante logs concorrentes sem dados sensíveis", async () => {
  // 1. Verifica modo bloqueado pela decisão do Caderno de Validações (bancaFeatureEnabled = false)
  const disabledHarness = createBancaSchedulingHarness({ bancaFeatureEnabled: false });
  const forbiddenBySpec = disabledHarness.scheduleBancaSync({
    requestId: "REQ-CT06-FORBIDDEN",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-19T10:00:00-03:00",
      endAt: "2026-11-19T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });
  assert.equal(forbiddenBySpec.status, 403);
  assert.equal(forbiddenBySpec.body.code, "FEATURE_FORBIDDEN_BY_SPEC");

  // 2. Verifica sanitização completa de logs e payloads de erro (MH-SEC-003 / MH-SEC-004)
  const activeHarness = createBancaSchedulingHarness({ bancaFeatureEnabled: true });
  const res1 = await activeHarness.scheduleBancaConcurrent({
    requestId: "REQ-CT06-SAN-01",
    waveId: "WAVE-SAN",
    token: QA013_SYNTHETIC_ACTORS.coordenacao.token,
    body: {
      projectId: "PRJ-PI-01",
      room: "SALA-LAB-101",
      startAt: "2026-11-19T10:00:00-03:00",
      endAt: "2026-11-19T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });
  const res2 = await activeHarness.scheduleBancaConcurrent({
    requestId: "REQ-CT06-SAN-02",
    waveId: "WAVE-SAN",
    token: QA013_SYNTHETIC_ACTORS.docenteOrientadorPi01.token,
    body: {
      projectId: "PRJ-PI-DRAFT-04",
      room: "SALA-LAB-101",
      startAt: "2026-11-19T10:00:00-03:00",
      endAt: "2026-11-19T11:00:00-03:00",
      evaluatorIds: ["USR-QA013-DOC-01", "USR-QA013-DOC-02"],
    },
  });

  const serializedLogs = JSON.stringify([
    ...disabledHarness.getExecutionLogs(),
    ...activeHarness.getExecutionLogs(),
  ]);
  const serializedResponses = JSON.stringify([forbiddenBySpec.body, res1.body, res2.body]);

  const forbiddenSensitiveValues = [
    QA013_SYNTHETIC_ACTORS.coordenacao.cpf,
    QA013_SYNTHETIC_ACTORS.coordenacao.password,
    QA013_SYNTHETIC_ACTORS.coordenacao.token,
    QA013_SYNTHETIC_ACTORS.docenteOrientadorPi01.cpf,
    QA013_SYNTHETIC_ACTORS.docenteOrientadorPi01.password,
    QA013_SYNTHETIC_ACTORS.docenteOrientadorPi01.token,
    "[DRAFT_CONFIDENTIAL_PROJECT_PI_04]",
  ];

  for (const secret of forbiddenSensitiveValues) {
    assert.ok(
      !serializedLogs.includes(secret),
      `Vazamento detectado nos logs de agendamento para: ${secret}`
    );
    assert.ok(
      !serializedResponses.includes(secret),
      `Vazamento detectado no payload de resposta para: ${secret}`
    );
  }

  assert.ok(serializedLogs.includes("***.***.013-01"));
  assert.ok(serializedLogs.includes("[REDACTED]"));
});

