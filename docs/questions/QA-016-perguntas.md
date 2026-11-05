# QA-016 — Perguntas pendentes (bloqueiam cenários)

Issue: QA-016 · SPEC-PI-003 (Draft) · Contrato core 0.1.0 (Draft, não normativo).
Regra do QA: não escolher fórmula, arredondamento nem definição de vínculo por conta própria. Cada linha abaixo trava um cenário até haver resposta.

| # | Pergunta | Quem responde | Impacto (cenário bloqueado) | Hipótese NÃO adotada |
| --- | --- | --- | --- | --- |
| Q1 | Qual a fórmula de `finalGrade` (pesos por critério, tratamento de critério sem peso ou avaliação ausente) e como o docente define a rubrica? O contrato 0.1.0 só tem `technicalGrade`, `presentationGrade` e `artifactGrade` fixos, sem pesos. | PO (PG-008) + Backend (BE-015) | DET-01..03 e PRE-06. AC-PI-003-02 exige peso desigual e mais de um critério, com esperado derivado da fórmula aprovada | Média simples ou pesos 40/30/30 |
| Q2 | Qual a escala, a precisão e o arredondamento do `finalGrade` (half-up, half-even, truncar)? | PO + Backend | PRE-06 (bordas x.xx5) | Half-up com 2 casas |
| Q3 | O que é "avaliador vinculado"? Orientador do projeto, membro da banca (BE-011), docente designado pela coordenação? As respostas do caderno dizem que não haverá bancas, mas o contrato usa `boards`. Qual das duas vale? | PO + Backend (BE-011) | VIN-05 (hoje WARN) | Vinculado = orientador do projeto |
| Q4 | O mesmo avaliador pode lançar mais de uma avaliação para a mesma banca/projeto? Resposta 46 diz que não há número fixo de avaliações, mas não trata de duplicidade. | PO + time de banco (pendência 4 do contrato) | VIN-06 (hoje WARN) | Duplicidade proibida com 409 |
| Q5 | "Preservação da versão anterior" (card QA-016) vale, ou prevalece "não manter histórico" (respostas 50/62 do caderno e AC-PI-003-05)? Se vale, como a versão anterior é observada (endpoint, campo, evento de auditoria BE-016)? | PO | VER-05. VER-01..04 testam só a preservação em falha de atualização, que não depende da resposta | Guardar histórico de notas |
| Q6 | Quais perfis criam, editam, finalizam, reabrem e leem avaliações e notas, e qual erro é esperado (401, 403 ou 404 para ocultar existência)? Quais endpoints finalizam e reabrem, já que o contrato 0.1.0 não os tem? | PO + Backend (BE-004/BE-010) | PER-01..05 | 403 para tudo |
| Q7 | Valores com zero à direita além da 2ª casa (`8.550`) valem como `8.55`? | Backend | PRE-07 (hoje WARN) | Aceitar e normalizar |
| Q8 | Erro de tipo no corpo (`"abc"`, `true`) deve devolver `VALIDATION_ERROR` (contrato) ou `REQUEST_ERROR`? O código da develop lê o corpo ilegível por `handleExceptionInternal`, que devolve `REQUEST_ERROR`, código que o contrato não lista (a confirmar na execução). | Backend | LIM-02c/d/e e VIN-04 (WARN de divergência de contrato) | Atualizar o contrato sem consultar |
| Q9 | A baseline de governança fixada neste repositório (`governance-v0.1.0`, `379131e`) traz a SPEC-PI-003 sem os AC-PI-003-01..06. Esses ACs existem na `main` da governança (`cca216f`). Qual baseline vale para o QA-016? | Governança | Rastreabilidade de todos os ACs citados | Trocar a baseline por conta própria |

## Como usar

1. Levar Q1 a Q9 ao PO/Backend antes de preencher `fixtures/qa-016-notas.json` (`determinismo` e `arredondamento`).
2. Resposta recebida → registrar aqui (data, quem respondeu, decisão) e transformar o cenário bloqueado em teste executável.
