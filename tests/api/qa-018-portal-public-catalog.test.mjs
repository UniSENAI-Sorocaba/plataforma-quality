import assert from "node:assert/strict";
import test from "node:test";

/**
 * Suíte de Testes de API, SSR, Metadata, Cache e Privacidade — QA-018 (plataforma-quality#18)
 * "[QA-018] SPEC-PORTAL-001: Testar somente itens publicados, filtros, paginação estável,
 * página vazia, cache após retirada e ausência de campos privados em API, SSR e metadata"
 *
 * Metadados da Issue:
 * - Work ID: QA-018
 * - Prioridade / Sprint: P0 / S3
 * - Estimativa: 5 SP
 * - Responsável inicial: Bianca Cirilo
 * - Revisor: Gabriel Ribeiro
 * - Dependências: BE-018 (complementado por PG-011 / PG-012 em plataforma-governance)
 *
 * Objetivo e Escopo Normativo:
 * - SPEC-PORTAL-001 (AC-PORTAL-001-01..05) e SPEC-PORTAL-002 (AC-PORTAL-002-01..03):
 *   1. Somente itens publicados: listagem pública, detalhe por ID/slug, SSR e metadata
 *      expõem exclusivamente itens com status === "PUBLISHED" e publicados pelo docente
 *      responsável; rascunhos (DRAFT), arquivados (ARCHIVED) e retirados (WITHDRAWN)
 *      retornam 404 PORTAL_PROJECT_NOT_PUBLIC sem revelar existência ou título privado.
 *   2. Fotos autorizadas (AC-PORTAL-001-03 / AC-PI-004-04): apenas mídias com autorização
 *      explícita no nível do projeto (photoAuthorized=true) e da foto (authorized=true)
 *      são expostas em API, SSR e og:image.
 *   3. Filtros determinísticos e proteção contra busca oráculo: filtragem combinável por
 *      type (PI | EXT), course, semester, tag e busca textual (q) restrita a campos públicos,
 *      garantindo que termos presentes apenas em campos privados jamais produzam match.
 *   4. Paginação estável: ordenação canônica determinística por (publishedAt DESC, id ASC)
 *      com desempate estável para timestamps idênticos, garantindo zero duplicatas e zero
 *      omissões entre páginas consecutivas e rejeitando parâmetros inválidos (422).
 *   5. Página vazia: retorno 200 OK com items=[], isEmpty=true, renderização SSR de
 *      estado vazio (data-testid="portal-empty-state") e metadata robots="noindex, follow".
 *   6. Cache após retirada (unpublish / withdrawal): invalidação/expurgo imediato das
 *      entradas de cache de API (ETag), SSR e metadata quando um projeto publicado é
 *      retirado ou volta para rascunho, impedindo resposta stale (200/304) e emitindo
 *      Cache-Control: no-store, no-cache, must-revalidate.
 *   7. Ausência total de campos privados em API, SSR (__NEXT_DATA__) e Metadata (OpenGraph,
 *      JSON-LD, meta tags e sitemap): allowlist estrita de projeção pública, ocultando CPFs,
 *      e-mails, notas individuais, horas de extensão, arquivos internos, justificativas de
 *      remoção e anotações confidenciais (MH-SEC-003 / MH-SEC-004).
 */

export const QA018_FORBIDDEN_PRIVATE_KEYS = [
  "internalNotesSecret",
  "draftSpecification",
  "ownerCpf",
  "ownerEmailPrivate",
  "participantsPrivate",
  "gradesByStudent",
  "hoursByStudent",
  "internalFiles",
  "removalJustifications",
  "disciplinaryOrMedicalNotes",
  "unpublishedAuditToken",
  "storageBucketPrivateKey",
];

export const QA018_FORBIDDEN_PRIVATE_MARKERS = [
  "[SECRET_INTERNAL_NOTE_IOT_01]",
  "[SECRET_INTERNAL_NOTE_VISION_02]",
  "[SECRET_INTERNAL_NOTE_ROBOTICS_03]",
  "[SECRET_INTERNAL_NOTE_SMARTGRID_04]",
  "[SECRET_INTERNAL_NOTE_AGRO_05]",
  "[DRAFT_QUANTUM_SECRET_06]",
  "[ARCHIVED_LEGACY_SECRET_07]",
  "[WITHDRAWN_PATENT_SECRET_08]",
  "000.000.018-01",
  "000.000.018-02",
  "000.000.018-03",
  "000.000.018-04",
  "000.000.018-05",
  "000.000.018-06",
  "000.000.018-07",
  "000.000.018-08",
  "arquitetura-confidencial-pi01.pdf",
  "laudo-avaliacao-restrito-pi02.pdf",
  "relatorio-bolsistas-interno-ext03.xlsx",
  "justificativa-remocao-sigilosa",
  "/internal/media/prj-01-quadro-branco-nao-autorizado.jpg",
  "/internal/media/prj-02-equipe-sem-termo-lgpd.jpg",
  "/internal/media/prj-06-rascunho-secreto.jpg",
];

/**
 * Fixtures completas de persistência interna (contendo dados públicos + dados privados/sensíveis sintéticos)
 * utilizadas para comprovar que o motor do Portal Público filtra e projeta exclusivamente os campos públicos.
 */
export const QA018_PRIVATE_PERSISTENCE_FIXTURES = {
  "PRJ-PORTAL-PUB-01": {
    id: "PRJ-PORTAL-PUB-01",
    slug: "monitoramento-iot-eficiencia-energetica",
    type: "PI",
    status: "PUBLISHED",
    publishedByDocente: true,
    publishedAt: "2026-10-20T18:00:00.000Z",
    updatedAt: "2026-10-20T18:00:00.000Z",
    course: "Engenharia de Controle e Automação",
    semester: "2026.2",
    tags: ["iot", "eficiencia-energetica", "industria-4.0"],
    publicTitle: "Monitoramento IoT de Eficiência Energética em Células de Manufatura",
    publicSummary:
      "Protótipo integrador para telemetria de consumo elétrico e correção de fator de potência em bancadas industriais.",
    advisorPublicName: "Prof. Dr. Marcos Vinícius",
    teamPublicNames: ["Ana Clara Souza", "Lucas Ferreira"],
    photoAuthorized: true,
    photos: [
      {
        id: "PH-PUB-01",
        url: "https://cdn.unisenai.edu.br/public/portal/prj-01-bancada-iot.png",
        alt: "Bancada de telemetria IoT em operação no laboratório",
        authorized: true,
      },
      {
        id: "PH-PRIV-01",
        url: "/internal/media/prj-01-quadro-branco-nao-autorizado.jpg",
        alt: "Rascunho interno sem autorização de imagem",
        authorized: false,
      },
    ],
    // Campos estritamente privados/internos (JAMAIS devem sair em API pública, SSR ou Metadata)
    ownerDocenteId: "USR-QA018-DOC-01",
    ownerCpf: "000.000.018-01",
    ownerEmailPrivate: "marcos.privado@interno.unisenai.edu.br",
    internalNotesSecret: "[SECRET_INTERNAL_NOTE_IOT_01] Pendência de calibração no sensor 3.",
    participantsPrivate: [
      { id: "USR-QA018-ALU-01", cpf: "000.000.018-02", email: "ana.privado@aluno.unisenai.edu.br" },
    ],
    gradesByStudent: {
      "USR-QA018-ALU-01": { finalGrade: 9.6, rubricBreakdown: { entregas: 10, defesa: 9.2 } },
    },
    hoursByStudent: {},
    internalFiles: [
      {
        id: "INT-FILE-01",
        name: "arquitetura-confidencial-pi01.pdf",
        storageBucketPrivateKey: "s3://internal-pi-bucket/prj-01/arquitetura-confidencial-pi01.pdf",
      },
    ],
    removalJustifications: [
      { studentId: "USR-QA018-ALU-99", reason: "justificativa-remocao-sigilosa-transferencia-turma" },
    ],
    unpublishedAuditToken: "INTERNAL_AUDIT_TOKEN_PRJ_01",
  },

  "PRJ-PORTAL-PUB-02": {
    id: "PRJ-PORTAL-PUB-02",
    slug: "inspecao-visual-solda-visao-computacional",
    type: "PI",
    status: "PUBLISHED",
    publishedByDocente: true,
    // Timestamp idêntico ao PRJ-PORTAL-PUB-03 para testar desempate determinístico (publishedAt DESC, id ASC)
    publishedAt: "2026-10-15T14:00:00.000Z",
    updatedAt: "2026-10-15T14:00:00.000Z",
    course: "Engenharia de Computação",
    semester: "2026.2",
    tags: ["visao-computacional", "ia", "industria-4.0"],
    publicTitle: "Inspeção Visual Automatizada de Cordões de Solda por Visão Computacional",
    publicSummary:
      "Sistema embarcado de classificação óptica de defeitos superficiais em linhas de soldagem robotizada.",
    advisorPublicName: "Profa. Dra. Helena Costa",
    teamPublicNames: ["Gabriel Santos", "Mariana Oliveira"],
    photoAuthorized: false, // Docente não autorizou publicação de fotos no portal (AC-PI-004-04)
    photos: [
      {
        id: "PH-PRIV-02",
        url: "/internal/media/prj-02-equipe-sem-termo-lgpd.jpg",
        alt: "Foto da equipe sem termo LGPD assinado",
        authorized: true, // Mesmo se a foto tiver flag individual, photoAuthorized=false no projeto bloqueia
      },
    ],
    ownerDocenteId: "USR-QA018-DOC-02",
    ownerCpf: "000.000.018-03",
    ownerEmailPrivate: "helena.privado@interno.unisenai.edu.br",
    internalNotesSecret: "[SECRET_INTERNAL_NOTE_VISION_02] Dataset industrial sob NDA.",
    participantsPrivate: [
      { id: "USR-QA018-ALU-02", cpf: "000.000.018-04", email: "gabriel.privado@aluno.unisenai.edu.br" },
    ],
    gradesByStudent: {
      "USR-QA018-ALU-02": { finalGrade: 8.9, rubricBreakdown: { entregas: 9.0, defesa: 8.8 } },
    },
    hoursByStudent: {},
    internalFiles: [
      {
        id: "INT-FILE-02",
        name: "laudo-avaliacao-restrito-pi02.pdf",
        storageBucketPrivateKey: "s3://internal-pi-bucket/prj-02/laudo-avaliacao-restrito-pi02.pdf",
      },
    ],
    removalJustifications: [],
    unpublishedAuditToken: "INTERNAL_AUDIT_TOKEN_PRJ_02",
  },

  "PRJ-PORTAL-PUB-03": {
    id: "PRJ-PORTAL-PUB-03",
    slug: "oficina-robotica-educacional-escolas-publicas",
    type: "EXT",
    status: "PUBLISHED",
    publishedByDocente: true,
    // Timestamp idêntico ao PRJ-PORTAL-PUB-02 para exercitar paginação estável
    publishedAt: "2026-10-15T14:00:00.000Z",
    updatedAt: "2026-10-15T14:00:00.000Z",
    course: "Engenharia de Controle e Automação",
    semester: "2026.2",
    tags: ["robotica", "educacao", "sustentabilidade"],
    publicTitle: "Oficina de Robótica Educacional com Sucata Eletrônica para Escolas Públicas",
    publicSummary:
      "Projeto de extensão universitária voltado à capacitação prática em lógica e robótica sustentável.",
    advisorPublicName: "Prof. Dr. Marcos Vinícius",
    teamPublicNames: ["Beatriz Lima", "Rafael Almeida"],
    photoAuthorized: true,
    photos: [
      {
        id: "PH-PUB-03",
        url: "https://cdn.unisenai.edu.br/public/portal/prj-03-oficina-robotica.png",
        alt: "Prototipagem de kits de robótica educacional",
        authorized: true,
      },
    ],
    ownerDocenteId: "USR-QA018-DOC-01",
    ownerCpf: "000.000.018-01",
    ownerEmailPrivate: "marcos.privado@interno.unisenai.edu.br",
    internalNotesSecret: "[SECRET_INTERNAL_NOTE_ROBOTICS_03] Controle interno de frequência dos extensionistas.",
    participantsPrivate: [
      { id: "USR-QA018-ALU-03", cpf: "000.000.018-05", email: "beatriz.privado@aluno.unisenai.edu.br" },
    ],
    gradesByStudent: {},
    hoursByStudent: {
      "USR-QA018-ALU-03": { submittedHours: 40, validatedHours: 36, pendingReason: "Falta comprovante dia 12" },
    },
    internalFiles: [
      {
        id: "INT-FILE-03",
        name: "relatorio-bolsistas-interno-ext03.xlsx",
        storageBucketPrivateKey: "s3://internal-ext-bucket/prj-03/relatorio-bolsistas-interno-ext03.xlsx",
      },
    ],
    removalJustifications: [],
    unpublishedAuditToken: "INTERNAL_AUDIT_TOKEN_PRJ_03",
  },

  "PRJ-PORTAL-PUB-04": {
    id: "PRJ-PORTAL-PUB-04",
    slug: "gemeo-digital-subestacao-eletrica",
    type: "PI",
    status: "PUBLISHED",
    publishedByDocente: true,
    publishedAt: "2026-10-10T11:30:00.000Z",
    updatedAt: "2026-10-10T11:30:00.000Z",
    course: "Engenharia Elétrica",
    semester: "2026.1",
    tags: ["gemeo-digital", "eficiencia-energetica", "subestacao"],
    publicTitle: "Gêmeo Digital para Manutenção Preditiva em Subestações Elétricas",
    publicSummary:
      "Modelagem supervisória para simulação térmica e diagnóstico preditivo de transformadores.",
    advisorPublicName: "Prof. Me. Ricardo Tavares",
    teamPublicNames: ["Camila Rocha"],
    photoAuthorized: true,
    photos: [
      {
        id: "PH-PUB-04",
        url: "https://cdn.unisenai.edu.br/public/portal/prj-04-gemeo-digital.png",
        alt: "Dashboard público do gêmeo digital da subestação",
        authorized: true,
      },
    ],
    ownerDocenteId: "USR-QA018-DOC-03",
    ownerCpf: "000.000.018-06",
    ownerEmailPrivate: "ricardo.privado@interno.unisenai.edu.br",
    internalNotesSecret: "[SECRET_INTERNAL_NOTE_SMARTGRID_04] Observação interna da banca parcial.",
    participantsPrivate: [],
    gradesByStudent: {
      "USR-QA018-ALU-04": { finalGrade: 9.1, rubricBreakdown: { entregas: 9.1, defesa: 9.1 } },
    },
    hoursByStudent: {},
    internalFiles: [],
    removalJustifications: [],
    unpublishedAuditToken: "INTERNAL_AUDIT_TOKEN_PRJ_04",
  },

  "PRJ-PORTAL-PUB-05": {
    id: "PRJ-PORTAL-PUB-05",
    slug: "irrigacao-inteligente-hortas-comunitarias",
    type: "EXT",
    status: "PUBLISHED",
    publishedByDocente: true,
    publishedAt: "2026-10-05T09:15:00.000Z",
    updatedAt: "2026-10-05T09:15:00.000Z",
    course: "Engenharia de Computação",
    semester: "2026.1",
    tags: ["iot", "sustentabilidade", "agro"],
    publicTitle: "Sistema Solar de Irrigação Inteligente para Hortas Comunitárias",
    publicSummary:
      "Automação de baixo custo com sensores de umidade de solo e energia fotovoltaica em hortas urbanas.",
    advisorPublicName: "Profa. Dra. Helena Costa",
    teamPublicNames: ["Diego Martins", "Fernanda Silva"],
    photoAuthorized: true,
    photos: [
      {
        id: "PH-PUB-05",
        url: "https://cdn.unisenai.edu.br/public/portal/prj-05-irrigacao-solar.png",
        alt: "Módulo fotovoltaico e sensores instalados na horta comunitária",
        authorized: true,
      },
    ],
    ownerDocenteId: "USR-QA018-DOC-02",
    ownerCpf: "000.000.018-03",
    ownerEmailPrivate: "helena.privado@interno.unisenai.edu.br",
    internalNotesSecret: "[SECRET_INTERNAL_NOTE_AGRO_05] Aguardando validação de 4h finais.",
    participantsPrivate: [],
    gradesByStudent: {},
    hoursByStudent: {
      "USR-QA018-ALU-05": { submittedHours: 24, validatedHours: 20, pendingReason: "Em análise pelo docente" },
    },
    internalFiles: [],
    removalJustifications: [],
    unpublishedAuditToken: "INTERNAL_AUDIT_TOKEN_PRJ_05",
  },

  // =========================================================================
  // ITENS NÃO PUBLICADOS (Rascunho, Arquivado e Retirado — NUNCA DEVEM SAIR NO PORTAL)
  // =========================================================================
  "PRJ-PORTAL-DRAFT-06": {
    id: "PRJ-PORTAL-DRAFT-06",
    slug: "criptografia-pos-quantica-controladores-clp",
    type: "PI",
    status: "DRAFT",
    publishedByDocente: false,
    publishedAt: null,
    updatedAt: "2026-10-25T10:00:00.000Z",
    course: "Engenharia de Computação",
    semester: "2026.2",
    tags: ["iot", "seguranca", "industria-4.0"],
    publicTitle: "[DRAFT_QUANTUM_SECRET_06] Proposta em Rascunho Não Publicada",
    publicSummary: "Especificação preliminar em rascunho que não pode aparecer no catálogo público.",
    advisorPublicName: "Prof. Dr. Marcos Vinícius",
    teamPublicNames: ["Aluno Rascunho"],
    photoAuthorized: true,
    photos: [
      {
        id: "PH-DRAFT-06",
        url: "/internal/media/prj-06-rascunho-secreto.jpg",
        alt: "Foto interna de rascunho",
        authorized: true,
      },
    ],
    ownerDocenteId: "USR-QA018-DOC-01",
    ownerCpf: "000.000.018-07",
    internalNotesSecret: "[DRAFT_QUANTUM_SECRET_06] Proposta ainda não aprovada pelo docente.",
    gradesByStudent: {},
    hoursByStudent: {},
    internalFiles: [],
  },

  "PRJ-PORTAL-ARCHIVED-07": {
    id: "PRJ-PORTAL-ARCHIVED-07",
    slug: "automacao-legada-caldeira-2024",
    type: "PI",
    status: "ARCHIVED",
    publishedByDocente: false,
    publishedAt: "2025-11-10T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    course: "Engenharia de Controle e Automação",
    semester: "2025.2",
    tags: ["iot", "industria-4.0"],
    publicTitle: "[ARCHIVED_LEGACY_SECRET_07] Projeto Arquivado Fora do Catálogo",
    publicSummary: "Projeto encerrado e arquivado pela orientação docente.",
    advisorPublicName: "Prof. Dr. Marcos Vinícius",
    teamPublicNames: ["Ex-Aluno"],
    photoAuthorized: false,
    photos: [],
    ownerDocenteId: "USR-QA018-DOC-01",
    ownerCpf: "000.000.018-07",
    internalNotesSecret: "[ARCHIVED_LEGACY_SECRET_07] Arquivado após encerramento de ciclo.",
    gradesByStudent: {},
    hoursByStudent: {},
    internalFiles: [],
  },

  "PRJ-PORTAL-WITHDRAWN-08": {
    id: "PRJ-PORTAL-WITHDRAWN-08",
    slug: "prototipo-sigilo-industrial-retirado",
    type: "PI",
    status: "WITHDRAWN",
    publishedByDocente: false,
    publishedAt: "2026-10-18T12:00:00.000Z",
    updatedAt: "2026-10-22T15:00:00.000Z",
    course: "Engenharia Elétrica",
    semester: "2026.2",
    tags: ["eficiencia-energetica"],
    publicTitle: "[WITHDRAWN_PATENT_SECRET_08] Projeto Retirado para Depósito de Patente",
    publicSummary: "Retirado do portal público a pedido do orientador.",
    advisorPublicName: "Prof. Me. Ricardo Tavares",
    teamPublicNames: ["Equipe Sigilo"],
    photoAuthorized: false,
    photos: [],
    ownerDocenteId: "USR-QA018-DOC-03",
    ownerCpf: "000.000.018-08",
    internalNotesSecret: "[WITHDRAWN_PATENT_SECRET_08] Retirado da vitrine pública.",
    gradesByStudent: {},
    hoursByStudent: {},
    internalFiles: [],
  },
};

export const DEFAULT_PORTAL_OG_IMAGE =
  "https://cdn.unisenai.edu.br/public/portal/default-unisenai-portal-cover.png";

/**
 * Fixture de projeção pública canônica esperada (Allowlist estrita de SPEC-PORTAL-001 / SPEC-PORTAL-002).
 */
export const QA018_EXPECTED_PUBLIC_PROJECTION_FIXTURES = {
  "PRJ-PORTAL-PUB-01": {
    id: "PRJ-PORTAL-PUB-01",
    slug: "monitoramento-iot-eficiencia-energetica",
    type: "PI",
    course: "Engenharia de Controle e Automação",
    semester: "2026.2",
    publishedAt: "2026-10-20T18:00:00.000Z",
    tags: ["iot", "eficiencia-energetica", "industria-4.0"],
    publicTitle: "Monitoramento IoT de Eficiência Energética em Células de Manufatura",
    publicSummary:
      "Protótipo integrador para telemetria de consumo elétrico e correção de fator de potência em bancadas industriais.",
    advisorPublicName: "Prof. Dr. Marcos Vinícius",
    teamPublicNames: ["Ana Clara Souza", "Lucas Ferreira"],
    photos: [
      {
        id: "PH-PUB-01",
        url: "https://cdn.unisenai.edu.br/public/portal/prj-01-bancada-iot.png",
        alt: "Bancada de telemetria IoT em operação no laboratório",
      },
    ],
    publicUrl: "/portal/projetos/monitoramento-iot-eficiencia-energetica",
  },
  "PRJ-PORTAL-PUB-02": {
    id: "PRJ-PORTAL-PUB-02",
    slug: "inspecao-visual-solda-visao-computacional",
    type: "PI",
    course: "Engenharia de Computação",
    semester: "2026.2",
    publishedAt: "2026-10-15T14:00:00.000Z",
    tags: ["visao-computacional", "ia", "industria-4.0"],
    publicTitle: "Inspeção Visual Automatizada de Cordões de Solda por Visão Computacional",
    publicSummary:
      "Sistema embarcado de classificação óptica de defeitos superficiais em linhas de soldagem robotizada.",
    advisorPublicName: "Profa. Dra. Helena Costa",
    teamPublicNames: ["Gabriel Santos", "Mariana Oliveira"],
    photos: [], // Vazio porque photoAuthorized === false no projeto
    publicUrl: "/portal/projetos/inspecao-visual-solda-visao-computacional",
  },
};

const ALLOWED_PUBLIC_ITEM_KEYS = new Set([
  "id",
  "slug",
  "type",
  "course",
  "semester",
  "publishedAt",
  "tags",
  "publicTitle",
  "publicSummary",
  "advisorPublicName",
  "teamPublicNames",
  "photos",
  "publicUrl",
]);

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskCpf(cpf) {
  if (!cpf || typeof cpf !== "string") return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Projeta um registro interno exclusivamente para o contrato público (Allowlist estrita).
 * Retorna null se o item não estiver elegível para exibição pública.
 */
export function projectPublicPortalItem(record) {
  if (!record || record.status !== "PUBLISHED" || record.publishedByDocente !== true) {
    return null;
  }

  const authorizedPhotos = record.photoAuthorized
    ? (record.photos || [])
        .filter((ph) => ph && ph.authorized === true && typeof ph.url === "string" && ph.url.startsWith("https://"))
        .map((ph) => ({
          id: ph.id,
          url: ph.url,
          alt: ph.alt,
        }))
    : [];

  return {
    id: record.id,
    slug: record.slug,
    type: record.type,
    course: record.course,
    semester: record.semester,
    publishedAt: record.publishedAt,
    tags: [...(record.tags || [])],
    publicTitle: record.publicTitle,
    publicSummary: record.publicSummary,
    advisorPublicName: record.advisorPublicName,
    teamPublicNames: [...(record.teamPublicNames || [])],
    photos: authorizedPhotos,
    publicUrl: `/portal/projetos/${record.slug}`,
  };
}

/**
 * Ordenação canônica determinística para paginação estável:
 * 1º: publishedAt DESC (mais recente primeiro)
 * 2º: id ASC (desempate determinístico estrito quando timestamps coincidem)
 */
export function comparePortalItemsCanonical(a, b) {
  const timeA = Date.parse(a.publishedAt);
  const timeB = Date.parse(b.publishedAt);
  if (timeA !== timeB) {
    return timeB - timeA;
  }
  return a.id.localeCompare(b.id, "en", { sensitivity: "base" });
}

/**
 * Cria o motor integrado de validação do Portal Público (API + SSR + Metadata + Cache com Purge).
 */
export function createPortalPublicCatalogHarness(initialRecords = QA018_PRIVATE_PERSISTENCE_FIXTURES) {
  const store = structuredClone(initialRecords);
  const apiCache = new Map();
  const ssrCache = new Map();
  const metadataCache = new Map();
  const auditLogs = [];
  let revisionCounter = 1;
  let logSeq = 0;

  function recordAuditLog(entry) {
    logSeq += 1;
    auditLogs.push({
      logSeq,
      timestamp: "2026-11-05T22:00:00.000Z",
      ...entry,
    });
  }

  function findRawRecordByIdOrSlug(idOrSlug) {
    if (!idOrSlug || typeof idOrSlug !== "string") return null;
    if (store[idOrSlug]) return store[idOrSlug];
    return Object.values(store).find((item) => item.slug === idOrSlug) || null;
  }

  function invalidateProjectCaches(projectId, slug, reason) {
    const purgedKeys = [];
    for (const key of [...apiCache.keys()]) {
      if (key.startsWith("list:") || key === `detail:${projectId}` || key === `detail:${slug}`) {
        apiCache.delete(key);
        purgedKeys.push(`api:${key}`);
      }
    }
    for (const key of [...ssrCache.keys()]) {
      if (key.startsWith("ssr:list:") || key === `ssr:detail:${projectId}` || key === `ssr:detail:${slug}`) {
        ssrCache.delete(key);
        purgedKeys.push(`ssr:${key}`);
      }
    }
    for (const key of [...metadataCache.keys()]) {
      if (
        key.startsWith("meta:list:") ||
        key === `meta:detail:${projectId}` ||
        key === `meta:detail:${slug}` ||
        key === "meta:sitemap"
      ) {
        metadataCache.delete(key);
        purgedKeys.push(`meta:${key}`);
      }
    }
    revisionCounter += 1;
    return purgedKeys;
  }

  function validateAndApplyFilters(items, query = {}) {
    const allowedFilterKeys = new Set(["type", "course", "semester", "tag", "q", "page", "pageSize"]);
    for (const key of Object.keys(query)) {
      if (!allowedFilterKeys.has(key)) {
        return {
          valid: false,
          status: 422,
          code: "INVALID_FILTER_PARAM",
          message: `Parâmetro de filtro não suportado no catálogo público: ${key}`,
        };
      }
    }

    const { type, course, semester, tag, q } = query;

    if (type !== undefined && type !== "PI" && type !== "EXT") {
      return {
        valid: false,
        status: 422,
        code: "INVALID_FILTER_PARAM",
        message: "O filtro 'type' aceita exclusivamente os valores 'PI' ou 'EXT'.",
      };
    }

    if (q !== undefined && (typeof q !== "string" || q.length > 120)) {
      return {
        valid: false,
        status: 422,
        code: "INVALID_FILTER_PARAM",
        message: "O parâmetro de busca textual 'q' deve ser uma string de até 120 caracteres.",
      };
    }

    const normalizedQ = typeof q === "string" ? q.trim().toLowerCase() : "";
    const normalizedCourse = typeof course === "string" ? course.trim().toLowerCase() : "";
    const normalizedSemester = typeof semester === "string" ? semester.trim().toLowerCase() : "";
    const normalizedTag = typeof tag === "string" ? tag.trim().toLowerCase() : "";

    // Importante: filtra APENAS sobre os objetos já projetados pela allowlist pública!
    // Jamais avalia campos privados/internos.
    const filtered = items.filter((item) => {
      if (type && item.type !== type) return false;
      if (normalizedCourse && item.course.toLowerCase() !== normalizedCourse) return false;
      if (normalizedSemester && item.semester.toLowerCase() !== normalizedSemester) return false;
      if (normalizedTag && !item.tags.some((t) => t.toLowerCase() === normalizedTag)) return false;
      if (normalizedQ) {
        const searchablePublicText = [
          item.publicTitle,
          item.publicSummary,
          item.course,
          item.advisorPublicName,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchablePublicText.includes(normalizedQ)) return false;
      }
      return true;
    });

    return { valid: true, items: filtered };
  }

  function paginateCanonical(items, query = {}) {
    const rawPage = query.page === undefined ? 1 : Number(query.page);
    const rawPageSize = query.pageSize === undefined ? 6 : Number(query.pageSize);

    if (
      !Number.isInteger(rawPage) ||
      rawPage < 1 ||
      !Number.isInteger(rawPageSize) ||
      rawPageSize < 1 ||
      rawPageSize > 50
    ) {
      return {
        valid: false,
        status: 422,
        code: "INVALID_PAGINATION_PARAMS",
        message: "Parâmetros de paginação inválidos: 'page' >= 1 e 'pageSize' entre 1 e 50 são obrigatórios.",
      };
    }

    const sorted = [...items].sort(comparePortalItemsCanonical);
    const totalItems = sorted.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / rawPageSize);
    const startIndex = (rawPage - 1) * rawPageSize;
    const pageItems = startIndex < totalItems ? sorted.slice(startIndex, startIndex + rawPageSize) : [];

    return {
      valid: true,
      items: pageItems,
      pagination: {
        page: rawPage,
        pageSize: rawPageSize,
        totalItems,
        totalPages,
        hasNextPage: totalPages > 0 && rawPage < totalPages,
        hasPreviousPage: rawPage > 1 && totalItems > 0,
        isEmpty: pageItems.length === 0,
        stableSortKey: "publishedAt:desc,id:asc",
      },
    };
  }

  function listProjectsApi({ query = {}, headers = {} } = {}) {
    const cacheKey = `list:${JSON.stringify(query)}`;
    const cached = apiCache.get(cacheKey);
    const ifNoneMatch = headers["if-none-match"] || headers["If-None-Match"];

    if (cached) {
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        recordAuditLog({
          surface: "API_LIST",
          cacheStatus: "HIT_304",
          etag: cached.etag,
          status: 304,
        });
        return {
          status: 304,
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
            ETag: cached.etag,
            "X-Portal-Cache": "HIT",
          },
          body: null,
        };
      }
      recordAuditLog({
        surface: "API_LIST",
        cacheStatus: "HIT",
        etag: cached.etag,
        status: 200,
      });
      return {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
          ETag: cached.etag,
          "X-Portal-Cache": "HIT",
        },
        body: structuredClone(cached.body),
      };
    }

    const allPublicItems = Object.values(store)
      .map(projectPublicPortalItem)
      .filter(Boolean);

    const filterResult = validateAndApplyFilters(allPublicItems, query);
    if (!filterResult.valid) {
      return {
        status: filterResult.status,
        headers: { "Cache-Control": "no-store" },
        body: {
          code: filterResult.code,
          message: filterResult.message,
        },
      };
    }

    const pageResult = paginateCanonical(filterResult.items, query);
    if (!pageResult.valid) {
      return {
        status: pageResult.status,
        headers: { "Cache-Control": "no-store" },
        body: {
          code: pageResult.code,
          message: pageResult.message,
        },
      };
    }

    const etag = `W/"portal-list-rev-${revisionCounter}-${ pageResult.items.map((i) => i.id).join("_") || "empty" }"`;
    const responseBody = {
      code: pageResult.pagination.isEmpty ? "PORTAL_PUBLIC_LIST_EMPTY" : "PORTAL_PUBLIC_LIST_OK",
      data: {
        items: pageResult.items,
        pagination: pageResult.pagination,
        appliedFilters: {
          type: query.type || null,
          course: query.course || null,
          semester: query.semester || null,
          tag: query.tag || null,
          q: query.q || null,
        },
        emptyStateMessage: pageResult.pagination.isEmpty
          ? "Nenhum projeto publicado foi encontrado para os critérios informados."
          : null,
      },
    };

    apiCache.set(cacheKey, {
      etag,
      body: structuredClone(responseBody),
    });

    recordAuditLog({
      surface: "API_LIST",
      cacheStatus: "MISS",
      etag,
      status: 200,
      returnedIds: pageResult.items.map((i) => i.id),
    });

    return {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
        ETag: etag,
        "X-Portal-Cache": "MISS",
      },
      body: responseBody,
    };
  }

  function getProjectDetailApi(idOrSlug, { headers = {} } = {}) {
    const raw = findRawRecordByIdOrSlug(idOrSlug);
    const cacheKey = raw ? `detail:${raw.id}` : `detail:${idOrSlug}`;
    const cached = apiCache.get(cacheKey);
    const ifNoneMatch = headers["if-none-match"] || headers["If-None-Match"];

    if (cached) {
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        recordAuditLog({
          surface: "API_DETAIL",
          target: idOrSlug,
          cacheStatus: "HIT_304",
          etag: cached.etag,
          status: 304,
        });
        return {
          status: 304,
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
            ETag: cached.etag,
            "X-Portal-Cache": "HIT",
          },
          body: null,
        };
      }
      recordAuditLog({
        surface: "API_DETAIL",
        target: idOrSlug,
        cacheStatus: "HIT",
        etag: cached.etag,
        status: 200,
      });
      return {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
          ETag: cached.etag,
          "X-Portal-Cache": "HIT",
        },
        body: structuredClone(cached.body),
      };
    }

    const projected = projectPublicPortalItem(raw);
    if (!projected) {
      recordAuditLog({
        surface: "API_DETAIL",
        target: idOrSlug,
        cacheStatus: "BYPASS_UNPUBLISHED",
        status: 404,
      });
      return {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          "X-Portal-Cache": "BYPASS",
        },
        body: {
          code: "PORTAL_PROJECT_NOT_PUBLIC",
          message: "Projeto não encontrado ou não disponível no catálogo público.",
        },
      };
    }

    const etag = `W/"portal-item-${projected.id}-rev-${revisionCounter}"`;
    const responseBody = {
      code: "PORTAL_PUBLIC_DETAIL_OK",
      data: {
        project: projected,
      },
    };

    apiCache.set(`detail:${projected.id}`, {
      etag,
      body: structuredClone(responseBody),
    });
    apiCache.set(`detail:${projected.slug}`, {
      etag,
      body: structuredClone(responseBody),
    });

    recordAuditLog({
      surface: "API_DETAIL",
      target: projected.id,
      cacheStatus: "MISS",
      etag,
      status: 200,
    });

    return {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
        ETag: etag,
        "X-Portal-Cache": "MISS",
      },
      body: responseBody,
    };
  }

  function generateCatalogMetadata({ query = {} } = {}) {
    const cacheKey = `meta:list:${JSON.stringify(query)}`;
    if (metadataCache.has(cacheKey)) {
      return structuredClone(metadataCache.get(cacheKey));
    }

    const apiRes = listProjectsApi({ query });
    if (apiRes.status !== 200) {
      return {
        status: apiRes.status,
        title: "Filtro Inválido | Portal Público UniSENAI",
        description: "Parâmetros de consulta inválidos.",
        robots: "noindex, nofollow",
        canonical: "https://portal.unisenai.edu.br/portal/projetos",
        openGraph: {
          title: "Portal Público UniSENAI",
          description: "Catálogo público de Projetos Integradores e de Extensão.",
          image: DEFAULT_PORTAL_OG_IMAGE,
          type: "website",
        },
        jsonLd: null,
      };
    }

    const { items, pagination } = apiRes.body.data;
    const isEmpty = pagination.isEmpty;

    const meta = {
      status: 200,
      title: isEmpty
        ? "Nenhum projeto encontrado | Portal Público UniSENAI"
        : `Catálogo de Projetos Publicados (Página ${pagination.page}) | Portal Público UniSENAI`,
      description:
        "Vitrine pública de Projetos Integradores (PI) e de Extensão publicados pelo corpo docente do UniSENAI.",
      robots: isEmpty ? "noindex, follow" : "index, follow",
      canonical: `https://portal.unisenai.edu.br/portal/projetos?page=${pagination.page}`,
      openGraph: {
        title: "Catálogo de Projetos Publicados | Portal Público UniSENAI",
        description: "Conheça os Projetos Integradores e de Extensão publicados no UniSENAI.",
        image: items[0]?.photos?.[0]?.url || DEFAULT_PORTAL_OG_IMAGE,
        type: "website",
      },
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Catálogo Público de Projetos Acadêmicos UniSENAI",
        numberOfItems: items.length,
        itemListElement: items.map((item, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `https://portal.unisenai.edu.br${item.publicUrl}`,
          name: item.publicTitle,
        })),
      },
    };

    metadataCache.set(cacheKey, structuredClone(meta));
    return meta;
  }

  function generateProjectMetadata(idOrSlug) {
    const raw = findRawRecordByIdOrSlug(idOrSlug);
    const cacheKey = raw ? `meta:detail:${raw.id}` : `meta:detail:${idOrSlug}`;
    if (metadataCache.has(cacheKey)) {
      return structuredClone(metadataCache.get(cacheKey));
    }

    const projected = projectPublicPortalItem(raw);
    if (!projected) {
      return {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
        title: "Projeto não encontrado | Portal Público UniSENAI",
        description: "O projeto solicitado não está disponível no catálogo público.",
        robots: "noindex, nofollow",
        canonical: null,
        openGraph: {
          title: "Projeto não encontrado | Portal Público UniSENAI",
          description: "O conteúdo solicitado não é público ou foi removido.",
          image: DEFAULT_PORTAL_OG_IMAGE,
          type: "website",
        },
        jsonLd: null,
      };
    }

    const coverImage = projected.photos[0]?.url || DEFAULT_PORTAL_OG_IMAGE;
    const meta = {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
      },
      title: `${projected.publicTitle} | Portal Público UniSENAI`,
      description: projected.publicSummary,
      robots: "index, follow",
      canonical: `https://portal.unisenai.edu.br${projected.publicUrl}`,
      openGraph: {
        title: projected.publicTitle,
        description: projected.publicSummary,
        image: coverImage,
        type: "article",
        url: `https://portal.unisenai.edu.br${projected.publicUrl}`,
      },
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        identifier: projected.id,
        headline: projected.publicTitle,
        description: projected.publicSummary,
        datePublished: projected.publishedAt,
        keywords: projected.tags.join(", "),
        author: projected.teamPublicNames.map((name) => ({ "@type": "Person", name })),
        contributor: { "@type": "Person", name: projected.advisorPublicName },
        image: coverImage,
      },
    };

    metadataCache.set(`meta:detail:${projected.id}`, structuredClone(meta));
    metadataCache.set(`meta:detail:${projected.slug}`, structuredClone(meta));
    return meta;
  }

  function generatePublicSitemapXml() {
    if (metadataCache.has("meta:sitemap")) {
      return metadataCache.get("meta:sitemap");
    }
    const publishedItems = Object.values(store)
      .map(projectPublicPortalItem)
      .filter(Boolean)
      .sort(comparePortalItemsCanonical);

    const urlsXml = publishedItems
      .map(
        (item) =>
          `  <url><loc>https://portal.unisenai.edu.br${item.publicUrl}</loc><lastmod>${item.publishedAt}</lastmod></url>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>`;
    metadataCache.set("meta:sitemap", xml);
    return xml;
  }

  function renderCatalogSsr({ query = {} } = {}) {
    const cacheKey = `ssr:list:${JSON.stringify(query)}`;
    if (ssrCache.has(cacheKey)) {
      const cached = ssrCache.get(cacheKey);
      return {
        ...structuredClone(cached),
        headers: {
          ...cached.headers,
          "X-Portal-SSR-Cache": "HIT",
        },
      };
    }

    const apiRes = listProjectsApi({ query });
    const meta = generateCatalogMetadata({ query });

    if (apiRes.status !== 200) {
      return {
        status: apiRes.status,
        headers: { "Cache-Control": "no-store", "X-Portal-SSR-Cache": "BYPASS" },
        html: `<!DOCTYPE html><html lang="pt-BR"><head><title>${escapeHtml(meta.title)}</title><meta name="robots" content="${meta.robots}"/></head><body><main data-testid="portal-filter-error">${escapeHtml(apiRes.body.message)}</main></body></html>`,
        hydrationData: { pageProps: { error: apiRes.body } },
        metadata: meta,
      };
    }

    const { items, pagination, appliedFilters, emptyStateMessage } = apiRes.body.data;
    const hydrationPayload = {
      pageProps: {
        items,
        pagination,
        appliedFilters,
        emptyStateMessage,
      },
    };

    const bodyHtml = pagination.isEmpty
      ? `<section data-testid="portal-empty-state"><h2>Nenhum projeto encontrado</h2><p>${escapeHtml(emptyStateMessage)}</p></section>`
      : `<section data-testid="portal-catalog-grid">${items
          .map(
            (item) =>
              `<article data-testid="portal-project-card" data-project-id="${escapeHtml(item.id)}"><h2>${escapeHtml(item.publicTitle)}</h2><p>${escapeHtml(item.publicSummary)}</p><span class="course">${escapeHtml(item.course)}</span></article>`
          )
          .join("")}</section>`;

    const html = [
      "<!DOCTYPE html>",
      '<html lang="pt-BR">',
      "<head>",
      `  <title>${escapeHtml(meta.title)}</title>`,
      `  <meta name="description" content="${escapeHtml(meta.description)}" />`,
      `  <meta name="robots" content="${escapeHtml(meta.robots)}" />`,
      `  <meta property="og:title" content="${escapeHtml(meta.openGraph.title)}" />`,
      `  <meta property="og:description" content="${escapeHtml(meta.openGraph.description)}" />`,
      `  <meta property="og:image" content="${escapeHtml(meta.openGraph.image)}" />`,
      `  <link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
      `  <script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`,
      "</head>",
      "<body>",
      `  <main>${bodyHtml}</main>`,
      `  <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(hydrationPayload)}</script>`,
      "</body>",
      "</html>",
    ].join("\n");

    const result = {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
        "X-Portal-SSR-Cache": "MISS",
      },
      html,
      hydrationData: hydrationPayload,
      metadata: meta,
    };

    ssrCache.set(cacheKey, structuredClone(result));
    return result;
  }

  function renderProjectDetailSsr(idOrSlug) {
    const raw = findRawRecordByIdOrSlug(idOrSlug);
    const cacheKey = raw ? `ssr:detail:${raw.id}` : `ssr:detail:${idOrSlug}`;
    if (ssrCache.has(cacheKey)) {
      const cached = ssrCache.get(cacheKey);
      return {
        ...structuredClone(cached),
        headers: {
          ...cached.headers,
          "X-Portal-SSR-Cache": "HIT",
        },
      };
    }

    const detailRes = getProjectDetailApi(idOrSlug);
    const meta = generateProjectMetadata(idOrSlug);

    if (detailRes.status !== 200) {
      const notFoundHydration = {
        pageProps: {
          statusCode: 404,
          code: "PORTAL_PROJECT_NOT_PUBLIC",
          message: "Projeto não encontrado ou não disponível no catálogo público.",
        },
      };
      return {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Portal-SSR-Cache": "BYPASS",
        },
        html: [
          "<!DOCTYPE html>",
          '<html lang="pt-BR">',
          "<head>",
          `  <title>${escapeHtml(meta.title)}</title>`,
          `  <meta name="description" content="${escapeHtml(meta.description)}" />`,
          `  <meta name="robots" content="${escapeHtml(meta.robots)}" />`,
          `  <meta property="og:title" content="${escapeHtml(meta.openGraph.title)}" />`,
          `  <meta property="og:image" content="${escapeHtml(meta.openGraph.image)}" />`,
          "</head>",
          "<body>",
          '  <main data-testid="portal-not-found"><h1>404 - Projeto não disponível no catálogo público</h1></main>',
          `  <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(notFoundHydration)}</script>`,
          "</body>",
          "</html>",
        ].join("\n"),
        hydrationData: notFoundHydration,
        metadata: meta,
      };
    }

    const { project } = detailRes.body.data;
    const hydrationPayload = {
      pageProps: {
        project,
      },
    };

    const photosHtml =
      project.photos.length > 0
        ? project.photos
            .map(
              (ph) =>
                `<img data-testid="portal-project-photo" src="${escapeHtml(ph.url)}" alt="${escapeHtml(ph.alt)}" />`
            )
            .join("")
        : '<div data-testid="portal-no-authorized-photos">Sem fotos públicas autorizadas</div>';

    const html = [
      "<!DOCTYPE html>",
      '<html lang="pt-BR">',
      "<head>",
      `  <title>${escapeHtml(meta.title)}</title>`,
      `  <meta name="description" content="${escapeHtml(meta.description)}" />`,
      `  <meta name="robots" content="${escapeHtml(meta.robots)}" />`,
      `  <meta property="og:title" content="${escapeHtml(meta.openGraph.title)}" />`,
      `  <meta property="og:description" content="${escapeHtml(meta.openGraph.description)}" />`,
      `  <meta property="og:image" content="${escapeHtml(meta.openGraph.image)}" />`,
      `  <link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
      `  <script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`,
      "</head>",
      "<body>",
      `  <main data-testid="portal-project-detail" data-project-id="${escapeHtml(project.id)}">`,
      `    <h1>${escapeHtml(project.publicTitle)}</h1>`,
      `    <p>${escapeHtml(project.publicSummary)}</p>`,
      `    <div class="gallery">${photosHtml}</div>`,
      "  </main>",
      `  <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(hydrationPayload)}</script>`,
      "</body>",
      "</html>",
    ].join("\n");

    const result = {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=0",
        "X-Portal-SSR-Cache": "MISS",
      },
      html,
      hydrationData: hydrationPayload,
      metadata: meta,
    };

    ssrCache.set(`ssr:detail:${project.id}`, structuredClone(result));
    ssrCache.set(`ssr:detail:${project.slug}`, structuredClone(result));
    return result;
  }

  /**
   * Simula a retirada/despublicação de um projeto pelo docente orientador ou coordenação
   * (transição PUBLISHED -> WITHDRAWN / DRAFT / ARCHIVED) ou revogação de autorização de fotos,
   * acionando o purge imediato de todas as camadas de cache (API, SSR e Metadata).
   */
  function withdrawOrUpdateVisibility({
    projectId,
    newStatus = "WITHDRAWN",
    photoAuthorized,
    actorId = "USR-QA018-DOC-01",
    actorCpf = "000.000.018-01",
    actorToken = "AT_OPAQUE_QA018_DOC_01",
    reason = "Retirado do portal pelo docente orientador",
  }) {
    const record = store[projectId];
    if (!record) {
      return { status: 404, code: "PROJECT_NOT_FOUND" };
    }

    const previousStatus = record.status;
    if (newStatus) {
      record.status = newStatus;
      record.publishedByDocente = newStatus === "PUBLISHED";
    }
    if (typeof photoAuthorized === "boolean") {
      record.photoAuthorized = photoAuthorized;
    }
    record.updatedAt = "2026-11-05T22:05:00.000Z";

    const purgedCacheKeys = invalidateProjectCaches(record.id, record.slug, reason);

    recordAuditLog({
      surface: "VISIBILITY_CHANGE_CACHE_PURGE",
      projectId: record.id,
      previousStatus,
      newStatus: record.status,
      photoAuthorized: record.photoAuthorized,
      actorId,
      actorCpfMasked: maskCpf(actorCpf),
      token: actorToken ? "[REDACTED]" : null,
      purgedCacheKeys,
      cacheControlAfterWithdraw: "no-store, no-cache, must-revalidate",
    });

    return {
      status: 200,
      code: "VISIBILITY_UPDATED_AND_CACHE_PURGED",
      projectId: record.id,
      previousStatus,
      currentStatus: record.status,
      purgedCacheKeys,
    };
  }

  function getCacheSnapshot() {
    return {
      apiCacheKeys: [...apiCache.keys()],
      ssrCacheKeys: [...ssrCache.keys()],
      metadataCacheKeys: [...metadataCache.keys()],
      revisionCounter,
    };
  }

  function getAuditLogs() {
    return structuredClone(auditLogs);
  }

  return {
    listProjectsApi,
    getProjectDetailApi,
    generateCatalogMetadata,
    generateProjectMetadata,
    generatePublicSitemapXml,
    renderCatalogSsr,
    renderProjectDetailSsr,
    withdrawOrUpdateVisibility,
    getCacheSnapshot,
    getAuditLogs,
  };
}

function collectObjectKeysDeep(value, collected = new Set()) {
  if (!value || typeof value !== "object") return collected;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectKeysDeep(item, collected);
    }
    return collected;
  }
  for (const [k, v] of Object.entries(value)) {
    collected.add(k);
    collectObjectKeysDeep(v, collected);
  }
  return collected;
}

// ============================================================================
// CASOS DE TESTE AUTOMATIZADOS — QA-018 (SPEC-PORTAL-001 & SPEC-PORTAL-002)
// ============================================================================

test("QA-018 | CT-QA018-01 (SPEC-PORTAL-001 / SPEC-PORTAL-002 Somente Itens Publicados e Fotos Autorizadas): listagem, detalhe, SSR e sitemap expõem apenas projetos PUBLISHED, recusando DRAFT, ARCHIVED e WITHDRAWN com 404", () => {
  const portal = createPortalPublicCatalogHarness();

  // 1. Listagem geral retorna exatamente os 5 projetos PUBLISHED (e nenhum não publicado)
  const listRes = portal.listProjectsApi({ query: { page: 1, pageSize: 10 } });
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.code, "PORTAL_PUBLIC_LIST_OK");

  const returnedIds = listRes.body.data.items.map((item) => item.id);
  assert.deepEqual(returnedIds, [
    "PRJ-PORTAL-PUB-01",
    "PRJ-PORTAL-PUB-02",
    "PRJ-PORTAL-PUB-03",
    "PRJ-PORTAL-PUB-04",
    "PRJ-PORTAL-PUB-05",
  ]);
  assert.ok(!returnedIds.includes("PRJ-PORTAL-DRAFT-06"), "Rascunho (DRAFT) jamais deve aparecer no catálogo");
  assert.ok(!returnedIds.includes("PRJ-PORTAL-ARCHIVED-07"), "Arquivado (ARCHIVED) jamais deve aparecer no catálogo");
  assert.ok(!returnedIds.includes("PRJ-PORTAL-WITHDRAWN-08"), "Retirado (WITHDRAWN) jamais deve aparecer no catálogo");

  // 2. Validação de fotos autorizadas (AC-PORTAL-001-03 / AC-PI-004-04):
  // PRJ-PORTAL-PUB-01 tem 1 foto autorizada e 1 não autorizada -> expõe apenas a autorizada
  const pub01 = listRes.body.data.items.find((i) => i.id === "PRJ-PORTAL-PUB-01");
  assert.equal(pub01.photos.length, 1);
  assert.equal(pub01.photos[0].id, "PH-PUB-01");

  // PRJ-PORTAL-PUB-02 tem photoAuthorized=false -> array de fotos vazio
  const pub02 = listRes.body.data.items.find((i) => i.id === "PRJ-PORTAL-PUB-02");
  assert.deepEqual(pub02.photos, []);

  // 3. Acesso direto por ID e por slug a itens DRAFT, ARCHIVED e WITHDRAWN retorna 404 na API, SSR e Metadata
  const unpublishedTargets = [
    "PRJ-PORTAL-DRAFT-06",
    "criptografia-pos-quantica-controladores-clp",
    "PRJ-PORTAL-ARCHIVED-07",
    "PRJ-PORTAL-WITHDRAWN-08",
  ];

  for (const target of unpublishedTargets) {
    const apiDetail = portal.getProjectDetailApi(target);
    assert.equal(apiDetail.status, 404);
    assert.equal(apiDetail.body.code, "PORTAL_PROJECT_NOT_PUBLIC");
    assert.match(apiDetail.headers["Cache-Control"], /no-store/);

    const ssrDetail = portal.renderProjectDetailSsr(target);
    assert.equal(ssrDetail.status, 404);
    assert.match(ssrDetail.html, /data-testid="portal-not-found"/);

    const metaDetail = portal.generateProjectMetadata(target);
    assert.equal(metaDetail.status, 404);
    assert.equal(metaDetail.robots, "noindex, nofollow");
  }

  // 4. Sitemap público inclui apenas URLs de projetos publicados
  const sitemapXml = portal.generatePublicSitemapXml();
  assert.match(sitemapXml, /monitoramento-iot-eficiencia-energetica/);
  assert.ok(!sitemapXml.includes("criptografia-pos-quantica-controladores-clp"));
  assert.ok(!sitemapXml.includes("automacao-legada-caldeira-2024"));
  assert.ok(!sitemapXml.includes("prototipo-sigilo-industrial-retirado"));
});

test("QA-018 | CT-QA018-02 (SPEC-PORTAL-001 Filtros e Proteção contra Busca Oráculo): filtra por tipo, curso, semestre, tag e busca textual pública, bloqueando inferência sobre campos privados", () => {
  const portal = createPortalPublicCatalogHarness();

  // 1. Filtro por tipo (EXT)
  const extOnly = portal.listProjectsApi({ query: { type: "EXT" } });
  assert.equal(extOnly.status, 200);
  assert.deepEqual(
    extOnly.body.data.items.map((i) => i.id),
    ["PRJ-PORTAL-PUB-03", "PRJ-PORTAL-PUB-05"]
  );

  // 2. Filtro combinado (type=PI + semester=2026.2 + tag=industria-4.0)
  const combinedPi = portal.listProjectsApi({
    query: { type: "PI", semester: "2026.2", tag: "industria-4.0" },
  });
  assert.equal(combinedPi.status, 200);
  assert.deepEqual(
    combinedPi.body.data.items.map((i) => i.id),
    ["PRJ-PORTAL-PUB-01", "PRJ-PORTAL-PUB-02"]
  );

  // 3. Filtro por curso + busca textual pública (q="Subestações")
  const courseSearch = portal.listProjectsApi({
    query: { course: "Engenharia Elétrica", q: "Subestações" },
  });
  assert.equal(courseSearch.status, 200);
  assert.deepEqual(
    courseSearch.body.data.items.map((i) => i.id),
    ["PRJ-PORTAL-PUB-04"]
  );

  // 4. Proteção contra Busca Oráculo em campos privados ou projetos não publicados:
  // Buscar por marcadores que existem APENAS em internalNotesSecret, CPF, arquivos internos ou projetos DRAFT
  const privateOracleQueries = [
    "[SECRET_INTERNAL_NOTE_IOT_01]",
    "calibração no sensor 3",
    "000.000.018-01",
    "arquitetura-confidencial-pi01",
    "justificativa-remocao-sigilosa",
    "DRAFT_QUANTUM_SECRET_06",
    "pós-quântica",
  ];

  for (const secretTerm of privateOracleQueries) {
    const res = portal.listProjectsApi({ query: { q: secretTerm } });
    assert.equal(res.status, 200);
    assert.equal(
      res.body.data.items.length,
      0,
      `A busca pública jamais deve fazer match no termo privado/não publicado: ${secretTerm}`
    );
  }

  // 5. Parâmetros de filtro inválidos ou desconhecidos retornam 422 INVALID_FILTER_PARAM
  const invalidType = portal.listProjectsApi({ query: { type: "MESTRADO_INVALIDO" } });
  assert.equal(invalidType.status, 422);
  assert.equal(invalidType.body.code, "INVALID_FILTER_PARAM");

  const unknownParam = portal.listProjectsApi({ query: { includeDrafts: "true" } });
  assert.equal(unknownParam.status, 422);
  assert.equal(unknownParam.body.code, "INVALID_FILTER_PARAM");
});

test("QA-018 | CT-QA018-03 (SPEC-PORTAL-001 Paginação Estável): garante ordenação determinística (publishedAt DESC, id ASC), desempate estável e ausência de duplicatas ou omissões entre páginas", () => {
  const portal = createPortalPublicCatalogHarness();

  // Temos 5 projetos publicados:
  // 1. PRJ-PORTAL-PUB-01 (2026-10-20T18:00:00.000Z)
  // 2. PRJ-PORTAL-PUB-02 (2026-10-15T14:00:00.000Z) <- Empate exato de timestamp com PUB-03!
  // 3. PRJ-PORTAL-PUB-03 (2026-10-15T14:00:00.000Z) <- Desempate determinístico por id ASC
  // 4. PRJ-PORTAL-PUB-04 (2026-10-10T11:30:00.000Z)
  // 5. PRJ-PORTAL-PUB-05 (2026-10-05T09:15:00.000Z)

  const page1 = portal.listProjectsApi({ query: { page: 1, pageSize: 2 } });
  const page2 = portal.listProjectsApi({ query: { page: 2, pageSize: 2 } });
  const page3 = portal.listProjectsApi({ query: { page: 3, pageSize: 2 } });

  assert.equal(page1.status, 200);
  assert.equal(page2.status, 200);
  assert.equal(page3.status, 200);

  const idsPage1 = page1.body.data.items.map((i) => i.id);
  const idsPage2 = page2.body.data.items.map((i) => i.id);
  const idsPage3 = page3.body.data.items.map((i) => i.id);

  assert.deepEqual(idsPage1, ["PRJ-PORTAL-PUB-01", "PRJ-PORTAL-PUB-02"]);
  assert.deepEqual(idsPage2, ["PRJ-PORTAL-PUB-03", "PRJ-PORTAL-PUB-04"]);
  assert.deepEqual(idsPage3, ["PRJ-PORTAL-PUB-05"]);

  // Verifica metadados de paginação
  assert.deepEqual(page1.body.data.pagination, {
    page: 1,
    pageSize: 2,
    totalItems: 5,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
    isEmpty: false,
    stableSortKey: "publishedAt:desc,id:asc",
  });
  assert.equal(page2.body.data.pagination.hasNextPage, true);
  assert.equal(page2.body.data.pagination.hasPreviousPage, true);
  assert.equal(page3.body.data.pagination.hasNextPage, false);
  assert.equal(page3.body.data.pagination.hasPreviousPage, true);

  // Verifica ausência de duplicatas e omissões na união das páginas
  const combinedIds = [...idsPage1, ...idsPage2, ...idsPage3];
  const uniqueIds = new Set(combinedIds);
  assert.equal(uniqueIds.size, 5, "Não pode haver duplicatas nem itens omitidos entre as páginas");

  // Repete a consulta da página 1 e 2 para comprovar estabilidade determinística entre chamadas
  const page1Repeat = portal.listProjectsApi({ query: { page: 1, pageSize: 2 } });
  const page2Repeat = portal.listProjectsApi({ query: { page: 2, pageSize: 2 } });
  assert.deepEqual(
    page1Repeat.body.data.items.map((i) => i.id),
    idsPage1
  );
  assert.deepEqual(
    page2Repeat.body.data.items.map((i) => i.id),
    idsPage2
  );

  // Parâmetros de paginação inválidos -> 422 INVALID_PAGINATION_PARAMS
  assert.equal(portal.listProjectsApi({ query: { page: 0, pageSize: 2 } }).status, 422);
  assert.equal(portal.listProjectsApi({ query: { page: -1, pageSize: 2 } }).status, 422);
  assert.equal(portal.listProjectsApi({ query: { page: 1, pageSize: 0 } }).status, 422);
  assert.equal(portal.listProjectsApi({ query: { page: 1, pageSize: 500 } }).status, 422);
});

test("QA-018 | CT-QA018-04 (SPEC-PORTAL-001 Página Vazia): filtro sem resultado e página fora do intervalo retornam 200 OK com items=[], SSR empty-state e metadata noindex", () => {
  const portal = createPortalPublicCatalogHarness();

  // 1. Filtro válido sem projetos correspondentes
  const emptyFilterApi = portal.listProjectsApi({ query: { tag: "astrofisica-nuclear-inexistente" } });
  assert.equal(emptyFilterApi.status, 200);
  assert.equal(emptyFilterApi.body.code, "PORTAL_PUBLIC_LIST_EMPTY");
  assert.deepEqual(emptyFilterApi.body.data.items, []);
  assert.equal(emptyFilterApi.body.data.pagination.totalItems, 0);
  assert.equal(emptyFilterApi.body.data.pagination.totalPages, 0);
  assert.equal(emptyFilterApi.body.data.pagination.isEmpty, true);
  assert.equal(emptyFilterApi.body.data.pagination.hasNextPage, false);
  assert.equal(emptyFilterApi.body.data.pagination.hasPreviousPage, false);
  assert.match(emptyFilterApi.body.data.emptyStateMessage, /Nenhum projeto publicado foi encontrado/);

  // 2. Página solicitada além de totalPages (ex.: page=99)
  const outOfRangePageApi = portal.listProjectsApi({ query: { page: 99, pageSize: 2 } });
  assert.equal(outOfRangePageApi.status, 200);
  assert.equal(outOfRangePageApi.body.code, "PORTAL_PUBLIC_LIST_EMPTY");
  assert.deepEqual(outOfRangePageApi.body.data.items, []);
  assert.equal(outOfRangePageApi.body.data.pagination.totalItems, 5);
  assert.equal(outOfRangePageApi.body.data.pagination.totalPages, 3);
  assert.equal(outOfRangePageApi.body.data.pagination.isEmpty, true);

  // 3. Renderização SSR e Metadata da página vazia
  const emptySsr = portal.renderCatalogSsr({ query: { tag: "astrofisica-nuclear-inexistente" } });
  assert.equal(emptySsr.status, 200);
  assert.match(emptySsr.html, /data-testid="portal-empty-state"/);
  assert.ok(!emptySsr.html.includes('data-testid="portal-project-card"'));
  assert.equal(emptySsr.metadata.robots, "noindex, follow");
  assert.equal(emptySsr.metadata.jsonLd.numberOfItems, 0);
});

test("QA-018 | CT-QA018-05 (SPEC-PORTAL-001 Cache após Retirada / Despublicação): invalida imediatamente cache de API (ETag), SSR e Metadata quando item publicado é retirado, impedindo resposta stale", () => {
  const portal = createPortalPublicCatalogHarness();

  // 1. Aquecimento do cache (MISS -> HIT / 304) enquanto PRJ-PORTAL-PUB-01 está PUBLISHED
  const detailMiss = portal.getProjectDetailApi("PRJ-PORTAL-PUB-01");
  assert.equal(detailMiss.status, 200);
  assert.equal(detailMiss.headers["X-Portal-Cache"], "MISS");
  const initialEtag = detailMiss.headers.ETag;
  assert.ok(initialEtag);

  const detailHit = portal.getProjectDetailApi("PRJ-PORTAL-PUB-01");
  assert.equal(detailHit.status, 200);
  assert.equal(detailHit.headers["X-Portal-Cache"], "HIT");

  const detail304 = portal.getProjectDetailApi("PRJ-PORTAL-PUB-01", {
    headers: { "If-None-Match": initialEtag },
  });
  assert.equal(detail304.status, 304);

  const ssrMiss = portal.renderProjectDetailSsr("PRJ-PORTAL-PUB-01");
  assert.equal(ssrMiss.status, 200);
  assert.equal(ssrMiss.headers["X-Portal-SSR-Cache"], "MISS");

  const ssrHit = portal.renderProjectDetailSsr("PRJ-PORTAL-PUB-01");
  assert.equal(ssrHit.status, 200);
  assert.equal(ssrHit.headers["X-Portal-SSR-Cache"], "HIT");

  const listBefore = portal.listProjectsApi({ query: { page: 1, pageSize: 10 } });
  const listEtagBefore = listBefore.headers.ETag;
  assert.equal(listBefore.body.data.pagination.totalItems, 5);

  // 2. Docente responsável retira o projeto do catálogo público (PUBLISHED -> WITHDRAWN)
  const withdrawal = portal.withdrawOrUpdateVisibility({
    projectId: "PRJ-PORTAL-PUB-01",
    newStatus: "WITHDRAWN",
    actorId: "USR-QA018-DOC-01",
    actorCpf: "000.000.018-01",
    actorToken: "AT_OPAQUE_QA018_DOC_01",
    reason: "Retirada solicitada para revisão de propriedade intelectual",
  });
  assert.equal(withdrawal.status, 200);
  assert.equal(withdrawal.code, "VISIBILITY_UPDATED_AND_CACHE_PURGED");
  assert.ok(withdrawal.purgedCacheKeys.includes("api:detail:PRJ-PORTAL-PUB-01"));
  assert.ok(withdrawal.purgedCacheKeys.includes("ssr:ssr:detail:PRJ-PORTAL-PUB-01"));

  // 3. Consulta imediata após retirada (mesmo enviando If-None-Match com o ETag antigo!)
  // Jamais pode retornar 200 ou 304 stale; deve retornar 404 com Cache-Control: no-store
  const detailAfterWithdraw = portal.getProjectDetailApi("PRJ-PORTAL-PUB-01", {
    headers: { "If-None-Match": initialEtag },
  });
  assert.equal(detailAfterWithdraw.status, 404);
  assert.equal(detailAfterWithdraw.body.code, "PORTAL_PROJECT_NOT_PUBLIC");
  assert.match(detailAfterWithdraw.headers["Cache-Control"], /no-store/);

  // 4. Consulta por slug no SSR e no Metadata também reflete a retirada imediatamente
  const ssrAfterWithdraw = portal.renderProjectDetailSsr("monitoramento-iot-eficiencia-energetica");
  assert.equal(ssrAfterWithdraw.status, 404);
  assert.match(ssrAfterWithdraw.headers["Cache-Control"], /no-store/);
  assert.ok(!ssrAfterWithdraw.html.includes("Monitoramento IoT de Eficiência Energética"));

  const metaAfterWithdraw = portal.generateProjectMetadata("PRJ-PORTAL-PUB-01");
  assert.equal(metaAfterWithdraw.status, 404);
  assert.equal(metaAfterWithdraw.robots, "noindex, nofollow");
  assert.ok(!metaAfterWithdraw.title.includes("Monitoramento IoT"));

  // 5. Listagem pública e Sitemap não contêm mais o item retirado e geram novo ETag
  const listAfter = portal.listProjectsApi({ query: { page: 1, pageSize: 10 } });
  assert.equal(listAfter.status, 200);
  assert.equal(listAfter.body.data.pagination.totalItems, 4);
  assert.notEqual(listAfter.headers.ETag, listEtagBefore);
  assert.ok(!listAfter.body.data.items.some((i) => i.id === "PRJ-PORTAL-PUB-01"));

  const sitemapAfter = portal.generatePublicSitemapXml();
  assert.ok(!sitemapAfter.includes("monitoramento-iot-eficiencia-energetica"));

  // 6. Revogação da autorização de foto em projeto que permanece publicado (PRJ-PORTAL-PUB-03)
  // invalida imediatamente o cache e substitui og:image pela imagem institucional padrão
  const metaPub03Before = portal.generateProjectMetadata("PRJ-PORTAL-PUB-03");
  assert.equal(
    metaPub03Before.openGraph.image,
    "https://cdn.unisenai.edu.br/public/portal/prj-03-oficina-robotica.png"
  );

  portal.withdrawOrUpdateVisibility({
    projectId: "PRJ-PORTAL-PUB-03",
    newStatus: "PUBLISHED",
    photoAuthorized: false,
    reason: "Revogação de autorização de imagem pelo docente",
  });

  const detailPub03AfterPhotoRevoke = portal.getProjectDetailApi("PRJ-PORTAL-PUB-03");
  assert.equal(detailPub03AfterPhotoRevoke.status, 200);
  assert.deepEqual(detailPub03AfterPhotoRevoke.body.data.project.photos, []);

  const metaPub03AfterPhotoRevoke = portal.generateProjectMetadata("PRJ-PORTAL-PUB-03");
  assert.equal(metaPub03AfterPhotoRevoke.openGraph.image, DEFAULT_PORTAL_OG_IMAGE);
});

test("QA-018 | CT-QA018-06 (SPEC-PORTAL-001 / SPEC-PORTAL-002 Ausência de Campos Privados em API, SSR e Metadata): garante allowlist estrita e zero vazamento em JSON, HTML, __NEXT_DATA__, OpenGraph e JSON-LD", () => {
  const portal = createPortalPublicCatalogHarness();

  const listApi = portal.listProjectsApi({ query: { page: 1, pageSize: 10 } });
  const detailApi01 = portal.getProjectDetailApi("PRJ-PORTAL-PUB-01");
  const detailApi02 = portal.getProjectDetailApi("PRJ-PORTAL-PUB-02");
  const detailApi03 = portal.getProjectDetailApi("PRJ-PORTAL-PUB-03");
  const detailDraft = portal.getProjectDetailApi("PRJ-PORTAL-DRAFT-06");

  const catalogSsr = portal.renderCatalogSsr({ query: { page: 1, pageSize: 10 } });
  const detailSsr01 = portal.renderProjectDetailSsr("PRJ-PORTAL-PUB-01");
  const detailSsr02 = portal.renderProjectDetailSsr("PRJ-PORTAL-PUB-02");
  const detailSsr03 = portal.renderProjectDetailSsr("PRJ-PORTAL-PUB-03");
  const draftSsr = portal.renderProjectDetailSsr("PRJ-PORTAL-DRAFT-06");

  const metaCatalog = portal.generateCatalogMetadata({ query: { page: 1, pageSize: 10 } });
  const meta01 = portal.generateProjectMetadata("PRJ-PORTAL-PUB-01");
  const meta02 = portal.generateProjectMetadata("PRJ-PORTAL-PUB-02");
  const metaDraft = portal.generateProjectMetadata("PRJ-PORTAL-DRAFT-06");
  const sitemapXml = portal.generatePublicSitemapXml();

  // 1. Verifica que cada item retornado na API possui APENAS chaves da allowlist pública
  for (const item of listApi.body.data.items) {
    for (const key of Object.keys(item)) {
      assert.ok(
        ALLOWED_PUBLIC_ITEM_KEYS.has(key),
        `Chave não autorizada na projeção pública de item: ${key}`
      );
    }
  }

  // 2. Verifica ausência recursiva de qualquer chave privada proibida na API, no payload de hidratação SSR e no Metadata
  const allStructuredPayloads = [
    listApi.body,
    detailApi01.body,
    detailApi02.body,
    detailApi03.body,
    detailDraft.body,
    catalogSsr.hydrationData,
    detailSsr01.hydrationData,
    detailSsr02.hydrationData,
    detailSsr03.hydrationData,
    draftSsr.hydrationData,
    metaCatalog,
    meta01,
    meta02,
    metaDraft,
  ];

  const allKeysInPayloads = collectObjectKeysDeep(allStructuredPayloads);
  for (const forbiddenKey of QA018_FORBIDDEN_PRIVATE_KEYS) {
    assert.ok(
      !allKeysInPayloads.has(forbiddenKey),
      `Campo privado proibido encontrado em payload público/SSR/Metadata: ${forbiddenKey}`
    );
  }

  // 3. Verifica ausência absoluta de qualquer valor/marcador privado em API, HTML SSR, __NEXT_DATA__, Metadata e Sitemap
  const serializedPublicSurfaces = JSON.stringify({
    api: [listApi.body, detailApi01.body, detailApi02.body, detailApi03.body, detailDraft.body],
    ssrHtml: [catalogSsr.html, detailSsr01.html, detailSsr02.html, detailSsr03.html, draftSsr.html],
    ssrHydration: [
      catalogSsr.hydrationData,
      detailSsr01.hydrationData,
      detailSsr02.hydrationData,
      detailSsr03.hydrationData,
      draftSsr.hydrationData,
    ],
    metadata: [metaCatalog, meta01, meta02, metaDraft],
    sitemapXml,
  });

  for (const marker of QA018_FORBIDDEN_PRIVATE_MARKERS) {
    assert.ok(
      !serializedPublicSurfaces.includes(marker),
      `Vazamento detectado em superfície pública (API/SSR/Metadata) para o marcador privado: ${marker}`
    );
  }

  // 4. Verifica que PRJ-PORTAL-PUB-02 (photoAuthorized=false) usa imagem institucional padrão no og:image
  assert.equal(meta02.openGraph.image, DEFAULT_PORTAL_OG_IMAGE);
});

test("QA-018 | CT-QA018-07 (Fixtures Públicas/Privadas e Sanitização de Logs MH-SEC-003 / MH-SEC-004): confronta fixtures de persistência privada vs. projeção pública e audita logs", () => {
  const portal = createPortalPublicCatalogHarness();

  // 1. Confronta diretamente a projeção de PRJ-PORTAL-PUB-01 e PRJ-PORTAL-PUB-02 com as fixtures esperadas
  const projectedPub01 = projectPublicPortalItem(QA018_PRIVATE_PERSISTENCE_FIXTURES["PRJ-PORTAL-PUB-01"]);
  const projectedPub02 = projectPublicPortalItem(QA018_PRIVATE_PERSISTENCE_FIXTURES["PRJ-PORTAL-PUB-02"]);
  const projectedDraft06 = projectPublicPortalItem(QA018_PRIVATE_PERSISTENCE_FIXTURES["PRJ-PORTAL-DRAFT-06"]);

  assert.deepEqual(projectedPub01, QA018_EXPECTED_PUBLIC_PROJECTION_FIXTURES["PRJ-PORTAL-PUB-01"]);
  assert.deepEqual(projectedPub02, QA018_EXPECTED_PUBLIC_PROJECTION_FIXTURES["PRJ-PORTAL-PUB-02"]);
  assert.equal(projectedDraft06, null);

  // 2. Exercita operações e retirada para gerar trilha de auditoria e verifica sanitização dos logs
  portal.listProjectsApi({ query: { page: 1, pageSize: 3 } });
  portal.getProjectDetailApi("PRJ-PORTAL-PUB-01");
  portal.withdrawOrUpdateVisibility({
    projectId: "PRJ-PORTAL-PUB-01",
    newStatus: "WITHDRAWN",
    actorId: "USR-QA018-DOC-01",
    actorCpf: "000.000.018-01",
    actorToken: "AT_OPAQUE_QA018_DOC_01",
  });

  const logs = portal.getAuditLogs();
  assert.ok(logs.length >= 3);
  const serializedLogs = JSON.stringify(logs);

  assert.ok(!serializedLogs.includes("000.000.018-01"), "CPF em claro jamais deve constar nos logs");
  assert.ok(!serializedLogs.includes("AT_OPAQUE_QA018_DOC_01"), "Token bruto jamais deve constar nos logs");
  assert.ok(serializedLogs.includes("***.***.018-01"), "CPF deve estar mascarado nos logs de auditoria");
  assert.ok(serializedLogs.includes("[REDACTED]"), "Token deve estar redigido nos logs de auditoria");
});
