# Pull Request: [QA-020] Auditoria de Acessibilidade WCAG 2.1 AA nas Telas Críticas e Registro de Defeitos

**Título do PR Sugerido:** `feat(qa-020): auditoria de acessibilidade WCAG 2.1 AA nas telas críticas e registro de defeitos`  
**Branch Origem:** `feat/qa-020-acessibilidade-wcag-telas-criticas`  
**Branch Destino:** `main`  
**Issue Relacionada:** Closes `QA-020`  
**Responsável:** Bianca Cirilo (`@biancacirilo`)  
**Revisor Designado:** Paola (`@paola`)  
**Sprint / Prioridade:** S4 / P0 (5 SP)  
**Dependências:** `FE-017`  

---

## 📋 Descrição do PR

Este Pull Request entrega a auditoria completa de acessibilidade digital em conformidade com as diretrizes **WCAG 2.1 Nível AA** nas telas críticas das 13 SPECs do MVP (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002`).

> **Ferramentas Auditadas e Versões:**  
> - `axe-core v4.10.2` via `@axe-core/playwright`  
> - `Lighthouse CLI v12.2.0`  
> - Leitores de tela `NVDA v2024.3` e `Apple VoiceOver`  

---

## 🛠️ Cenários Cobertos e Implementações

1. **`docs/test-cases/QA-020-acessibilidade-wcag.md`** (Novo):
   - Mapeamento e metodologia de teste cobrindo os 7 critérios essenciais:
     - Navegação por teclado completa e sem armadilhas de foco (*no keyboard traps*).
     - Foco visual nítido e contrastante em todos os elementos interativos.
     - Nomes acessíveis para botões, links e ícones interativos.
     - Associação explícita de `<label>` e `<input>`.
     - Contraste de cor mínimo de 4.5:1 (texto normal) e 3:1 (texto grande/UI).
     - Leitor de tela com hierarquia semântica e alertas dinâmicos (`aria-live`).
     - Ausência de bloqueios nas jornadas críticas de login, PI, extensão e portal.

2. **`tests/e2e/qa-020-wcag-accessibility.test.mjs`** (Novo):
   - Suíte automatizada com funções determinísticas de cálculo de luminância/contraste, auditoria de labels, nomes acessíveis e preservação de foco visual.

3. **`docs/defects/DEF-QA-020-acessibilidade.md`** (Novo):
   - Registro de 2 defeitos reproduzíveis com passos detalhados e sugestão de correção em código:
     - `DEF-WCAG-01`: Botão de fechar modal de entregáveis sem `aria-label` (Projeto Integrador).
     - `DEF-WCAG-02`: Relação de contraste insuficiente no badge de status "Em breve" (Extensão).

4. **`docs/evidence/qa-020-wcag-report.md`** (Novo):
   - Relatório oficial de evidência WCAG 2.1 AA consolidado por jornada e com parecer de qualidade de acessibilidade.

5. **`docs/ac-evidence-matrix.md` e `package.json`**:
   - Rastreabilidade atualizada com a issue `QA-020` e adição do comando `npm run test:e2e`.

---

## ✅ Checklist dos Critérios de Aceite

- [x] Cobertura de telas críticas para todas as SPECs (`SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002`).
- [x] Validação de navegação por teclado e ausência de bloqueios/armadilhas.
- [x] Validação de foco visível em todos os controles interativos.
- [x] Validação de nomes acessíveis em botões e ícones.
- [x] Validação de labels em campos de formulários.
- [x] Validação de contraste de cores ($\ge 4.5:1$).
- [x] Validação de leitor de tela e estrutura semântica.
- [x] Relatório WCAG com ferramenta/versão publicado em `docs/evidence/qa-020-wcag-report.md`.
- [x] Defeitos reproduzíveis registrados em `docs/defects/DEF-QA-020-acessibilidade.md`.
- [x] Revisão solicitada a Paola.

---

## 🔍 Como o Revisor Pode Validar

1. Fazer checkout da branch:
   ```bash
   git checkout feat/qa-020-acessibilidade-wcag-telas-criticas
   ```
2. Executar os testes automatizados de regras WCAG:
   ```bash
   npm run test:e2e
   ```
3. Conferir o relatório de evidências em `docs/evidence/qa-020-wcag-report.md` e os defeitos catalogados em `docs/defects/DEF-QA-020-acessibilidade.md`.

