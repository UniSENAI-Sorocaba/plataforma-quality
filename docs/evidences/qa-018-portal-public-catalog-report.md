# Relatório de Validação, Fixtures Públicas/Privadas e Segurança do Catálogo Público: `QA-018` (`SPEC-PORTAL-001`)

- **Issue de Qualidade:** [`QA-018` (`plataforma-quality#18`)](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/18) — `[QA-018] SPEC-PORTAL-001: Testar somente itens publicados, filtros, paginação estável, página vazia, cache após retirada e ausência de campos privados em API, SSR e metadata`
- **Metadados da Issue:**
  - **Work ID:** `QA-018`
  - **Prioridade / Sprint:** `P0` / `S3`
  - **Estimativa:** `5 SP`
  - **Responsável inicial:** Bianca Cirilo (execução e automação consolidadas no repositório com Ahslam Mendes)
  - **Revisor:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependências:** `BE-018` (complementado pelos refinamentos normativos `PG-011` e `PG-012` em `plataforma-governance`)
  - **Origem:** Importado da baseline Markdown; o GitHub Project é a fonte do estado.
- **SPECs, Critérios de Aceite e Regras Normativas Cobertos:**
  - `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05` — vitrine/catálogo público expondo somente itens publicados pelo docente responsável, filtros, paginação determinística estável, tratamento de página vazia, invalidação/expurgo imediato de cache após retirada/despublicação e ausência de campos privados em API, SSR e metadata)
  - `SPEC-PORTAL-002` (`AC-PORTAL-002-01..03` — exposição de mídias/fotos somente mediante autorização explícita do docente responsável e privacidade por padrão)
  - `SPEC-PI-001` (`AC-PI-001-02` — isolamento de propostas em rascunho), `SPEC-PI-003` (`AC-PI-003-04` — sigilo de notas individuais), `SPEC-PI-004` (`AC-PI-004-01`, `AC-PI-004-04` — restrição de arquivos internos e autorização de fotos), `SPEC-EXT-002` / `SPEC-EXT-003` (ocultação de horas individuais no catálogo público)
  - **Must Haves:** `MH-GOV-001`, `MH-GOV-002`, `MH-QA-001`, `MH-QA-002`, `MH-SEC-003`, `MH-SEC-004`, `ADR-008`
- **Baseline de Governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`

---

## 1. Confirmação de Dependências, Contrato/SPEC e Matriz de Critérios (`SPEC-PORTAL-001` / `BE-018`)

> **Nota normativa e de dependências (`_KB/README.md`):**
> 1. A dependência técnica `BE-018` no repositório `plataforma-backend` ainda não foi publicada em ambiente integrado de homologação.
> 2. Na baseline `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`, as especificações `SPEC-PORTAL-001` e `SPEC-PORTAL-002` possuem regras confirmadas no Caderno de Validações (`_KB/product/official-validation-decisions.md`), mas permanecem em estado `Draft` aguardando o fechamento formal de `PG-011` e `PG-012`.
> 3. A suíte determinística [`tests/api/qa-018-portal-public-catalog.test.mjs`](../../tests/api/qa-018-portal-public-catalog.test.mjs) exercita integralmente os 6 eixos funcionais e de segurança exigidos no critério de aceite da `QA-018` sobre fixtures públicas/privadas versionadas, mantendo o parecer integrado como **`WARN`** até a conclusão de `BE-018` e `PG-011`/`PG-012`.

| # | Eixo do Critério de Aceite (`QA-018` / `SPEC-PORTAL-001`) | Regra Validada no Contrato (API, SSR, Metadata e Cache) | Caso de Teste (`tests/api/qa-018-portal-public-catalog.test.mjs`) | Status na Suíte QA | Status Integrado (`BE-018` / `PG-011..012`) |
| :-: | :--- | :--- | :--- | :---: | :---: |
| **1** | **Somente itens publicados e fotos autorizadas** | Listagem (`GET /api/v1/portal/projects`), detalhe (`GET /api/v1/portal/projects/:id`), SSR (`GET /portal/projetos/:slug`) e `/portal/sitemap.xml` retornam exclusivamente itens com `status="PUBLISHED"` e `publishedByDocente=true`; itens `DRAFT`, `ARCHIVED` e `WITHDRAWN` retornam `404 PORTAL_PROJECT_NOT_PUBLIC` sem vazar título; fotos exigem `photoAuthorized=true` e `photo.authorized=true`. | `CT-QA018-01` | `PASS` | `WARN` (Aguarda `BE-018`) |
| **2** | **Filtros e proteção contra busca oráculo** | Filtragem determinística e combinável por `type` (`PI` \| `EXT`), `course`, `semester`, `tag` e busca textual `q` restrita à projeção pública; buscas por termos presentes apenas em campos privados/rascunhos retornam `0` itens (`items: []`); parâmetros desconhecidos ou inválidos retornam `422 INVALID_FILTER_PARAM`. | `CT-QA018-02` | `PASS` | `WARN` (Aguarda `BE-018`) |
| **3** | **Paginação estável** | Ordenação canônica determinística por `publishedAt DESC, id ASC` (`stableSortKey: "publishedAt:desc,id:asc"`), garantindo desempate estável para timestamps idênticos (`PRJ-PORTAL-PUB-02` vs. `PRJ-PORTAL-PUB-03`), zero duplicatas e zero omissões entre páginas consecutivas, e `422 INVALID_PAGINATION_PARAMS` para `page <= 0` ou `pageSize` fora de `1..50`. | `CT-QA018-03` | `PASS` | `WARN` (Aguarda `BE-018`) |
| **4** | **Página vazia (`Empty State`)** | Filtro sem correspondência ou página além de `totalPages` (`page=99`) retorna `200 OK` com `code="PORTAL_PUBLIC_LIST_EMPTY"`, `items: []`, `isEmpty: true`, SSR com `data-testid="portal-empty-state"` sem cards residuais e metadata com `robots="noindex, follow"`. | `CT-QA018-04` | `PASS` | `WARN` (Aguarda `BE-018`) |
| **5** | **Cache após retirada (`Unpublish / Purge`)** | Ao retirar um projeto publicado (`PUBLISHED -> WITHDRAWN`) ou revogar autorização de foto, expurga imediatamente as chaves de cache em API (`ETag`), SSR e Metadata; requisições subsequentes (mesmo com `If-None-Match` antigo) retornam `404 PORTAL_PROJECT_NOT_PUBLIC` e `Cache-Control: no-store, no-cache, must-revalidate` (nunca `200`/`304` stale). | `CT-QA018-05` | `PASS` | `WARN` (Aguarda `BE-018`) |
| **6** | **Ausência de campos privados em API, SSR e Metadata** | Allowlist estrita de 13 campos públicos; varredura recursiva garante ausência absoluta de `internalNotesSecret`, `ownerCpf`, `ownerEmailPrivate`, `participantsPrivate`, `gradesByStudent`, `hoursByStudent`, `internalFiles`, `removalJustifications` e fotos não autorizadas em JSON da API, HTML SSR, `<script id="__NEXT_DATA__">`, OpenGraph, JSON-LD e Sitemap. | `CT-QA018-06`, `CT-QA018-07` | `PASS` | `WARN` (Aguarda `BE-018`) |

---

## 2. Casos de Teste Executados (`templates/test-case.md`)

- **Issue:** `QA-018` (`plataforma-quality#18`)
- **SPEC / critério de aceite:** `SPEC-PORTAL-001` — *"Testar somente itens publicados, filtros, paginação estável, página vazia, cache após retirada e ausência de campos privados em API, SSR e metadata. Evidência: fixtures públicas/privadas e relatório."*
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Pré-condições e dados sintéticos (`QA018_PRIVATE_PERSISTENCE_FIXTURES`):**
  - **5 projetos publicados (`PUBLISHED`):**
    - `PRJ-PORTAL-PUB-01` (`PI` | `Engenharia de Controle e Automação` | `2026.2` | `publishedAt: 2026-10-20T18:00:00.000Z` | `photoAuthorized: true` com 1 foto autorizada `PH-PUB-01` e 1 foto interna não autorizada `PH-PRIV-01` | contém nota secreta `[SECRET_INTERNAL_NOTE_IOT_01]`, CPF `000.000.018-01`, nota individual `9.6`, arquivo interno `arquitetura-confidencial-pi01.pdf` e justificativa de remoção sigilosa)
    - `PRJ-PORTAL-PUB-02` (`PI` | `Engenharia de Computação` | `2026.2` | `publishedAt: 2026-10-15T14:00:00.000Z` | `photoAuthorized: false` com foto interna `PH-PRIV-02` | contém `[SECRET_INTERNAL_NOTE_VISION_02]` e `laudo-avaliacao-restrito-pi02.pdf`)
    - `PRJ-PORTAL-PUB-03` (`EXT` | `Engenharia de Controle e Automação` | `2026.2` | `publishedAt: 2026-10-15T14:00:00.000Z` — empate intencional de timestamp com `PUB-02` | `photoAuthorized: true` | contém `[SECRET_INTERNAL_NOTE_ROBOTICS_03]`, `hoursByStudent` e `relatorio-bolsistas-interno-ext03.xlsx`)
    - `PRJ-PORTAL-PUB-04` (`PI` | `Engenharia Elétrica` | `2026.1` | `publishedAt: 2026-10-10T11:30:00.000Z` | `photoAuthorized: true`)
    - `PRJ-PORTAL-PUB-05` (`EXT` | `Engenharia de Computação` | `2026.1` | `publishedAt: 2026-10-05T09:15:00.000Z` | `photoAuthorized: true`)
  - **3 projetos não publicados (bloqueados no Portal Público):**
    - `PRJ-PORTAL-DRAFT-06` (`DRAFT` | `publishedByDocente: false` | título confidencial `[DRAFT_QUANTUM_SECRET_06]`)
    - `PRJ-PORTAL-ARCHIVED-07` (`ARCHIVED` | `publishedByDocente: false` | título `[ARCHIVED_LEGACY_SECRET_07]`)
    - `PRJ-PORTAL-WITHDRAWN-08` (`WITHDRAWN` | `publishedByDocente: false` | título `[WITHDRAWN_PATENT_SECRET_08]`)
- **Ambiente:** Node.js Test Runner (`node --test tests/api/qa-018-portal-public-catalog.test.mjs`)

### Passos

1. **`CT-QA018-01` (Somente Itens Publicados e Fotos Autorizadas):** Consultar listagem pública, detalhe por ID/slug, SSR e `/portal/sitemap.xml`; confirmar presença exclusiva de `PRJ-PORTAL-PUB-01..05`, filtragem de fotos não autorizadas (`PH-PRIV-01` e `PH-PRIV-02` omitidas) e retorno `404 PORTAL_PROJECT_NOT_PUBLIC` para `DRAFT`, `ARCHIVED` e `WITHDRAWN`.
2. **`CT-QA018-02` (Filtros e Bloqueio de Busca Oráculo em Campos Privados):** Aplicar filtros isolados e combinados (`type`, `course`, `semester`, `tag`, `q`), verificar que buscas por strings existentes apenas em campos privados/rascunhos (`[SECRET_INTERNAL_NOTE_IOT_01]`, `000.000.018-01`, `arquitetura-confidencial-pi01`, `DRAFT_QUANTUM_SECRET_06`) retornam `0` resultados e que filtros inválidos retornam `422 INVALID_FILTER_PARAM`.
3. **`CT-QA018-03` (Paginação Estável):** Percorrer `page=1..3` com `pageSize=2`, validar desempate determinístico `publishedAt DESC, id ASC` entre `PRJ-PORTAL-PUB-02` e `PRJ-PORTAL-PUB-03` (ambos em `2026-10-15T14:00:00.000Z`), confirmar zero duplicatas e zero omissões entre páginas e testar recusa `422 INVALID_PAGINATION_PARAMS` para parâmetros fora do domínio.
4. **`CT-QA018-04` (Página Vazia):** Consultar filtro sem correspondência (`tag=astrofisica-nuclear-inexistente`) e página fora do alcance (`page=99&pageSize=2`), validando `200 OK`, `items: []`, `isEmpty: true`, SSR `data-testid="portal-empty-state"` e metadata `robots="noindex, follow"`.
5. **`CT-QA018-05` (Cache após Retirada / Despublicação):** Aquecer o cache de API (`MISS` -> `HIT` / `304` com `ETag`) e SSR (`MISS` -> `HIT`) de `PRJ-PORTAL-PUB-01`; acionar retirada (`withdrawOrUpdateVisibility` -> `WITHDRAWN`); repetir consulta enviando `If-None-Match` com o `ETag` anterior e validar expurgo imediato (`404 PORTAL_PROJECT_NOT_PUBLIC` + `Cache-Control: no-store, no-cache, must-revalidate`) em API, SSR, Metadata, listagem e sitemap; validar também revogação de autorização de foto em `PRJ-PORTAL-PUB-03`.
6. **`CT-QA018-06` e `CT-QA018-07` (Ausência de Campos Privados em API, SSR e Metadata + Fixtures Públicas/Privadas):** Inspecionar recursivamente todas as chaves e strings serializadas da API JSON, HTML SSR, `<script id="__NEXT_DATA__">`, OpenGraph, JSON-LD, Sitemap e logs de auditoria contra `QA018_FORBIDDEN_PRIVATE_KEYS` e `QA018_FORBIDDEN_PRIVATE_MARKERS`.

### Resultado esperado

- `CT-QA018-01` a `CT-QA018-07` aprovados (`7/7 PASS`), comprovando isolamento estrito entre fixtures privadas de persistência e projeções públicas em API, SSR e Metadata, paginação estável e invalidação imediata de cache após retirada.

### Evidência esperada

- Execução determinística de `npm test` (`39/39 PASS`) e `npm run compliance`, comparativo documentado de fixtures públicas vs. privadas, payloads de API/SSR/Metadata e registro de bloqueios/defeitos.

---

## 3. Registro de Evidência: Fixtures Públicas/Privadas, API, SSR, Metadata e Cache (`templates/evidence.md`)

- **Issue / AC:** `QA-018` (`plataforma-quality#18`) — `SPEC-PORTAL-001` (Somente itens publicados, filtros, paginação estável, página vazia, cache após retirada e ausência de campos privados em API, SSR e metadata)
- **Commit do sistema sob teste:** `a75d237` (`plataforma-quality`)
- **Baseline de governança:** `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Ambiente e data/hora UTC:** `ci-local (Windows / Node.js test runner)` — `2026-11-05T22:12:00Z`
- **Executor/ferramenta:** `npm test` (`node --test`) + `npm run compliance` (`node scripts/spec-compliance.mjs`)
- **Resultado:** `WARN` (Suíte de API/SSR/Metadata/Cache `tests/api/qa-018-portal-public-catalog.test.mjs`: `7/7 PASS` e suíte global do repositório: `39/39 PASS`; estado integrado da entrega `WARN` devido à dependência externa de `BE-018` no `plataforma-backend`, fechamento de `PG-011`/`PG-012` e publicação da tag `governance-v0.1.0`)
- **Artefatos/logs:**
  - Suíte automatizada e fixtures públicas/privadas: [`tests/api/qa-018-portal-public-catalog.test.mjs`](../../tests/api/qa-018-portal-public-catalog.test.mjs)
  - Relatório de evidências: [`docs/evidences/qa-018-portal-public-catalog-report.md`](./qa-018-portal-public-catalog-report.md)
  - Matriz de rastreabilidade: [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md)
- **Observações e riscos:** Nenhum dado pessoal real, token real ou segredo foi utilizado. Todas as 12 chaves privadas proibidas e 24 marcadores sensíveis sintéticos das fixtures internas foram 100% bloqueados nas superfícies públicas (API, SSR e Metadata).

### 3.1. Evidência de Fixtures Públicas vs. Privadas (`CT-QA018-06` e `CT-QA018-07`)

#### A) Fixture Privada de Persistência Interna (`QA018_PRIVATE_PERSISTENCE_FIXTURES["PRJ-PORTAL-PUB-01"]`)

```json
{
  "id": "PRJ-PORTAL-PUB-01",
  "slug": "monitoramento-iot-eficiencia-energetica",
  "type": "PI",
  "status": "PUBLISHED",
  "publishedByDocente": true,
  "publishedAt": "2026-10-20T18:00:00.000Z",
  "course": "Engenharia de Controle e Automação",
  "semester": "2026.2",
  "tags": ["iot", "eficiencia-energetica", "industria-4.0"],
  "publicTitle": "Monitoramento IoT de Eficiência Energética em Células de Manufatura",
  "publicSummary": "Protótipo integrador para telemetria de consumo elétrico e correção de fator de potência em bancadas industriais.",
  "advisorPublicName": "Prof. Dr. Marcos Vinícius",
  "teamPublicNames": ["Ana Clara Souza", "Lucas Ferreira"],
  "photoAuthorized": true,
  "photos": [
    {
      "id": "PH-PUB-01",
      "url": "https://cdn.unisenai.edu.br/public/portal/prj-01-bancada-iot.png",
      "alt": "Bancada de telemetria IoT em operação no laboratório",
      "authorized": true
    },
    {
      "id": "PH-PRIV-01",
      "url": "/internal/media/prj-01-quadro-branco-nao-autorizado.jpg",
      "alt": "Rascunho interno sem autorização de imagem",
      "authorized": false
    }
  ],
  "ownerDocenteId": "USR-QA018-DOC-01",
  "ownerCpf": "000.000.018-01",
  "ownerEmailPrivate": "marcos.privado@interno.unisenai.edu.br",
  "internalNotesSecret": "[SECRET_INTERNAL_NOTE_IOT_01] Pendência de calibração no sensor 3.",
  "participantsPrivate": [
    { "id": "USR-QA018-ALU-01", "cpf": "000.000.018-02", "email": "ana.privado@aluno.unisenai.edu.br" }
  ],
  "gradesByStudent": {
    "USR-QA018-ALU-01": { "finalGrade": 9.6, "rubricBreakdown": { "entregas": 10, "defesa": 9.2 } }
  },
  "internalFiles": [
    {
      "id": "INT-FILE-01",
      "name": "arquitetura-confidencial-pi01.pdf",
      "storageBucketPrivateKey": "s3://internal-pi-bucket/prj-01/arquitetura-confidencial-pi01.pdf"
    }
  ],
  "removalJustifications": [
    { "studentId": "USR-QA018-ALU-99", "reason": "justificativa-remocao-sigilosa-transferencia-turma" }
  ],
  "unpublishedAuditToken": "INTERNAL_AUDIT_TOKEN_PRJ_01"
}
```

#### B) Fixture Pública Sanitizada Projetada na API, SSR (`__NEXT_DATA__`) e Metadata (`QA018_EXPECTED_PUBLIC_PROJECTION_FIXTURES["PRJ-PORTAL-PUB-01"]`)

```json
{
  "id": "PRJ-PORTAL-PUB-01",
  "slug": "monitoramento-iot-eficiencia-energetica",
  "type": "PI",
  "course": "Engenharia de Controle e Automação",
  "semester": "2026.2",
  "publishedAt": "2026-10-20T18:00:00.000Z",
  "tags": ["iot", "eficiencia-energetica", "industria-4.0"],
  "publicTitle": "Monitoramento IoT de Eficiência Energética em Células de Manufatura",
  "publicSummary": "Protótipo integrador para telemetria de consumo elétrico e correção de fator de potência em bancadas industriais.",
  "advisorPublicName": "Prof. Dr. Marcos Vinícius",
  "teamPublicNames": ["Ana Clara Souza", "Lucas Ferreira"],
  "photos": [
    {
      "id": "PH-PUB-01",
      "url": "https://cdn.unisenai.edu.br/public/portal/prj-01-bancada-iot.png",
      "alt": "Bancada de telemetria IoT em operação no laboratório"
    }
  ],
  "publicUrl": "/portal/projetos/monitoramento-iot-eficiencia-energetica"
}
```

### 3.2. Evidência de Paginação Estável, Página Vazia e Cache após Retirada (`CT-QA018-03`, `CT-QA018-04` e `CT-QA018-05`)

```json
{
  "paginacaoEstavel_publishedAtDesc_idAsc": {
    "page1_size2": ["PRJ-PORTAL-PUB-01", "PRJ-PORTAL-PUB-02"],
    "page2_size2": ["PRJ-PORTAL-PUB-03", "PRJ-PORTAL-PUB-04"],
    "page3_size2": ["PRJ-PORTAL-PUB-05"],
    "desempateTimestampIdentico_2026_10_15T14_00_00Z": [
      "PRJ-PORTAL-PUB-02",
      "PRJ-PORTAL-PUB-03"
    ],
    "intersecaoEntrePaginas": 0,
    "totalUnicos": 5
  },
  "paginaVazia": {
    "apiStatus": 200,
    "code": "PORTAL_PUBLIC_LIST_EMPTY",
    "items": [],
    "isEmpty": true,
    "ssrMarker": "data-testid=\"portal-empty-state\"",
    "metadataRobots": "noindex, follow"
  },
  "cacheAposRetirada_PRJ_PORTAL_PUB_01": {
    "antesDaRetirada": {
      "firstCall": { "status": 200, "xPortalCache": "MISS", "etag": "W/\"portal-item-PRJ-PORTAL-PUB-01-rev-1\"" },
      "secondCallWithIfNoneMatch": { "status": 304, "xPortalCache": "HIT" },
      "ssrSecondCall": { "status": 200, "xPortalSsrCache": "HIT" }
    },
    "eventoDeRetirada": {
      "action": "withdrawOrUpdateVisibility",
      "previousStatus": "PUBLISHED",
      "currentStatus": "WITHDRAWN",
      "actorCpfMasked": "***.***.018-01",
      "token": "[REDACTED]",
      "purgedCacheKeys": [
        "api:list:{\"page\":1,\"pageSize\":10}",
        "api:detail:PRJ-PORTAL-PUB-01",
        "api:detail:monitoramento-iot-eficiencia-energetica",
        "ssr:ssr:detail:PRJ-PORTAL-PUB-01",
        "ssr:ssr:detail:monitoramento-iot-eficiencia-energetica"
      ]
    },
    "aposRetirada_mesmoComIfNoneMatchAntigo": {
      "apiDetailStatus": 404,
      "apiCode": "PORTAL_PROJECT_NOT_PUBLIC",
      "cacheControl": "no-store, no-cache, must-revalidate",
      "ssrDetailStatus": 404,
      "metadataStatus": 404,
      "metadataRobots": "noindex, nofollow"
    }
  }
}
```

---

## 4. Defeitos, Bloqueios e Divergências Normativas Registrados (`templates/defect.md`)

### Defeito / Bloqueio 1: Ausência dos endpoints públicos e do mecanismo de invalidação de cache (`BE-018`) no repositório `plataforma-backend`

- **Issue/AC relacionado:** `QA-018` (`plataforma-quality#18`), `BE-018` / `SPEC-PORTAL-001` (`AC-PORTAL-001-01..05`) e `SPEC-PORTAL-002` (`AC-PORTAL-002-01..03`)
- **Ambiente e versão:** Integração `plataforma-backend` / `plataforma-frontend` — Sprint `S3`
- **Severidade e prioridade:** Alta (`High`) / `P0` (Impede promoção do parecer integrado de `WARN` para `PASS`)
- **Pré-condições:** Consultar as rotas públicas `/api/v1/portal/projects` e `/api/v1/portal/projects/:id` no repositório `plataforma-backend`.
- **Passos para reproduzir:**
  1. Verificar o estado de entrega da issue `BE-018` no repositório `plataforma-backend`.
  2. Tentar executar a bateria de testes de catálogo público, paginação estável e expurgo de cache após retirada (`tests/api/qa-018-portal-public-catalog.test.mjs`) contra o ambiente HTTP real de staging.
- **Resultado observado:** A dependência `BE-018` ainda não foi entregue no `plataforma-backend`, não existindo endpoint HTTP público ativo nem webhook/evento de invalidação de cache SSR/CDN após despublicação.
- **Resultado esperado:** Quando `BE-018` for disponibilizado, o backend e o SSR do Portal devem projetar exclusivamente os 13 campos da allowlist pública (`QA018_EXPECTED_PUBLIC_PROJECTION_FIXTURES`), ordenar por `publishedAt DESC, id ASC`, filtrar apenas sobre campos públicos e invalidar imediatamente o cache ao retirar ou despublicar um projeto, cumprindo 100% das asserções de [`tests/api/qa-018-portal-public-catalog.test.mjs`](../../tests/api/qa-018-portal-public-catalog.test.mjs).
- **Evidência sem dados sensíveis:** Suíte [`tests/api/qa-018-portal-public-catalog.test.mjs`](../../tests/api/qa-018-portal-public-catalog.test.mjs) e matriz [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md).
- **Owner sugerido:** Squad **Backend** (`BE-018`) e **Frontend/Portal** (hidratação SSR e metadata).

---

### Defeito / Bloqueio 2: Reconciliação normativa pendente em `PG-011` e `PG-012` para `SPEC-PORTAL-001` e `SPEC-PORTAL-002`

- **Issue/AC relacionado:** `QA-018` (`plataforma-quality#18`), `PG-011` (`plataforma-governance#11`), `PG-012` (`plataforma-governance#12`) / `SPEC-PORTAL-001` e `SPEC-PORTAL-002`
- **Ambiente e versão:** Base normativa `plataforma-governance` (`_KB/specs/SPEC-PORTAL-001` e `SPEC-PORTAL-002` em `Draft`) — Baseline `governance-v0.1.0@379131e3fa7c0411d5055b14b6bb30dd0853a3b5`
- **Severidade e prioridade:** Média (`Medium`) / `P1` (Exige decisão humana do PO / Governança — `WARN`)
- **Pré-condições:** Inspecionar o estado das especificações `SPEC-PORTAL-001` e `SPEC-PORTAL-002` e as issues `PG-011` / `PG-012` no repositório `plataforma-governance`.
- **Passos para reproduzir:**
  1. Verificar que `SPEC-PORTAL-001` e `SPEC-PORTAL-002` ainda constam como `Draft` no índice normativo até a conclusão de `PG-011` e `PG-012`.
  2. Executar `npm run compliance` para verificar a publicação da tag `governance-v0.1.0`.
- **Resultado observado:** Os critérios de visibilidade pública (apenas publicados pelo docente responsável, sem notas/horas/arquivos internos e fotos somente com autorização explícita) já estão decididos no Caderno de Validações, mas aguardam promoção formal de `Draft` para `Approved` em `PG-011`/`PG-012` e publicação da tag `governance-v0.1.0`.
- **Resultado esperado:** Fechamento de `PG-011` e `PG-012` pelo PO e publicação da tag `governance-v0.1.0` na Governança.
- **Evidência sem dados sensíveis:** Relatório de execução do `spec-compliance` (`8 PASS | 1 WARN | 0 FAIL`) e matriz [`docs/ac-evidence-matrix.md`](../ac-evidence-matrix.md).
- **Owner sugerido:** **Product Owner** (Fellipe Raszejas — `PG-011`, `PG-012`).

---

## 5. Parecer de Qualidade e Segurança, Limitações e Vínculo de PR (`QA-018`)

- **Parecer Técnico de Qualidade e Segurança:** **`WARN`**
  - **Validação Automatizada de Catálogo Público, SSR, Metadata, Cache e Privacidade (`PASS`):** `7/7` baterias aprovadas em [`tests/api/qa-018-portal-public-catalog.test.mjs`](../../tests/api/qa-018-portal-public-catalog.test.mjs) (`39/39` testes totais no repositório via `npm test`), comprovando exibição exclusiva de itens publicados e fotos autorizadas, filtros combináveis imunes a busca oráculo sobre campos privados, paginação estável (`publishedAt DESC, id ASC`), renderização segura de página vazia, expurgo imediato de cache após retirada/despublicação e ausência total de campos privados em API, SSR (`__NEXT_DATA__`), OpenGraph, JSON-LD e Sitemap.
  - **Motivo do `WARN` (Exige Decisão Humana):**
    1. Dependência `BE-018` ainda pendente de entrega no repositório `plataforma-backend`;
    2. Fechamento formal de `PG-011` e `PG-012` pendente para promoção de `SPEC-PORTAL-001..002` no repositório `plataforma-governance`;
    3. Tag `governance-v0.1.0` ainda pendente de publicação no repositório `plataforma-governance` (`MH-GOV-002`).
- **Limitações e Follow-ups:**
  - Assim que `BE-018` for entregue no backend e integrado ao frontend do Portal, apontar o executor de `tests/api/qa-018-portal-public-catalog.test.mjs` para a URL de staging para validar os headers HTTP reais de cache (`ETag`/`Cache-Control`) e a hidratação SSR real, promovendo o estado da `QA-018` de `WARN` para `PASS`.
- **Vínculo de PR e Revisão:**
  - **Issue vinculada:** `Closes #18` ([`plataforma-quality#18`](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/18))
  - **Work ID / Prioridade / Sprint / Estimativa:** `QA-018` | `P0/S3` | `5 SP`
  - **Responsável inicial:** Bianca Cirilo
  - **Revisor indicado:** Gabriel Ribeiro (`@GabrielRibeiro`)
  - **Dependência registrada:** `BE-018`
