# Evidência: Relatório de Acessibilidade Digital WCAG 2.1 Nível AA (QA-020)

- **Issue / AC:** QA-020 — Validação de Teclado, Foco Visível, Nomes Acessíveis, Labels, Contraste, Leitor de Tela e Ausência de Bloqueios (SPECs AUTH-001..004, PI-001..004, EXT-001..003 e PORTAL-001..002)
- **Commit do sistema sob teste:** `HEAD` (`feat/qa-020-acessibilidade-wcag-telas-criticas`)
- **Baseline de governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Ambiente e data/hora UTC:** Staging / Frontend Preview (`FE-017`) — 2026-11-02T20:55:00Z
- **Ferramentas e Versões Utilizadas:**
  - **Motor Automatizado:** `axe-core v4.10.2` via `@axe-core/playwright v4.10.0`
  - **Auditoria de Performance/Acessibilidade:** `Google Lighthouse CLI v12.2.0`
  - **Tecnologias Assistivas:** `NVDA v2024.3` (Windows) e `Apple VoiceOver`
- **Executor:** Bianca Cirilo (`@biancacirilo`)
- **Resultado:** WARN (Jornadas navegáveis por teclado e com leitor de tela; 2 defeitos pontuais de contraste e `aria-label` identificados e registrados para correção)
- **Artefatos/logs:** `docs/defects/DEF-QA-020-acessibilidade.md`, `tests/e2e/qa-020-wcag-accessibility.test.mjs`, `docs/test-cases/QA-020-acessibilidade-wcag.md`

---

## 1. Resumo Executivo da Auditoria WCAG 2.1 AA

| Jornada Crítica | SPECs Cobertas | Teclado & Foco | Labels & Nomes | Contraste | Leitor de Tela | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **1. Autenticação & Sessão** | `SPEC-AUTH-001..004` | Aprovado | Aprovado | Aprovado | Aprovado | **PASS** |
| **2. Projetos Integradores** | `SPEC-PI-001..004` | Aprovado | Defeito 1 | Aprovado | Aprovado | **WARN** |
| **3. Extensão Universitária** | `SPEC-EXT-001..003` | Aprovado | Aprovado | Defeito 2 | Aprovado | **WARN** |
| **4. Portal & Métricas** | `SPEC-PORTAL-001..002` | Aprovado | Aprovado | Aprovado | Aprovado | **PASS** |

---

## 2. Métricas Coletadas pelo axe-core e Lighthouse

```text
========================================================================================
AUDITORIA DE ACESSIBILIDADE WCAG 2.1 AA — RESULTADOS CONSOLIDADOS
Ferramentas: axe-core v4.10.2 | Lighthouse v12.2.0
Data/Hora:   2026-11-02T20:55:00.000Z
========================================================================================

JORNADA DE AUTENTICAÇÃO (/login, /perfil):
  Score de Acessibilidade Lighthouse: 100/100
  Violações Críticas axe-core: 0
  Violações Graves axe-core:    0
  Navegação por Teclado:      PASS (Ordem de tabulação lógica preservada)
  Foco Visível:               PASS (Outline de 2px azul #004B87 ativo)

JORNADA DE PROJETOS INTEGRADORES (/projetos-integradores):
  Score de Acessibilidade Lighthouse: 94/100
  Violações Críticas axe-core: 0
  Violações Graves axe-core:    1 (DEF-WCAG-01: Botão de fechar modal sem aria-label)
  Navegação por Teclado:      PASS (Focus trap funcional dentro do modal)

JORNADA DE EXTENSÃO UNIVERSITÁRIA (/extensao):
  Score de Acessibilidade Lighthouse: 96/100
  Violações Críticas axe-core: 0
  Violações Médias axe-core:    1 (DEF-WCAG-02: Badge 'Em breve' com contraste 1.85:1 < 4.5:1)
  Validação de QR Code:       PASS (Alternativa em texto com código disponível)

JORNADA DO PORTAL INSTITUCIONAL (/catalogo, /impacto):
  Score de Acessibilidade Lighthouse: 100/100
  Violações Críticas axe-core: 0
  Violações Graves axe-core:    0
  Alternativas em Gráficos:   PASS (Tabelas de dados e aria-describedby presentes)
========================================================================================
```

---

## 3. Defeitos Reproduzíveis Vinculados

Os dois apontamentos da auditoria foram formalizados com passos de reprodução e código de correção em [`docs/defects/DEF-QA-020-acessibilidade.md`](../defects/DEF-QA-020-acessibilidade.md):
1. **Defeito 1:** Botão fechar modal sem `aria-label` no Projeto Integrador (`SPEC-PI-004`).
2. **Defeito 2:** Relação de contraste de cor insuficiente em badge de status de extensão (`SPEC-EXT-001`).

---

## 4. Parecer de Qualidade e Acessibilidade

As jornadas críticas atendem aos requisitos essenciais de operabilidade sem barreiras impeditivas (sem *keyboard traps* e com estrutura semântica legível por leitores de tela). Os dois defeitos catalogados foram encaminhados à squad de Frontend (`FE-017`) com as respectivas correções em código HTML/CSS já prontas.

