# Pull Request: [QA-023] Suíte de Regressão Consolidada e Catálogo de Falhas (QA-019–022)

**Título do PR Sugerido:** `feat(qa-023): suíte de regressão consolidada e catálogo de falhas para QA-019..022`  
**Branch Origem:** `feat/qa-023-regressao-consolidada-qa019-022`  
**Branch Destino:** `main`  
**Issue Relacionada:** Closes `QA-023`  
**Responsável:** Vitor Fazano (`@vfazano`)  
**Revisor Designado:** Gabriel Ribeiro (`@gabrielribeiro`)  
**Sprint / Prioridade:** S5 / P0 (8 SP)  
**Dependências:** `QA-019–022`  

---

## 📋 Descrição do PR

Este Pull Request implementa a entrega de **Regressão Consolidada (QA-023)**, integrando e avaliando as suítes de testes executadas nas entregas transversais de qualidade da Sprint S5:
1. **QA-019:** Performance e Carga (k6);
2. **QA-020:** Acessibilidade Digital (WCAG 2.1 Nível AA);
3. **QA-021:** Contratos de API (OpenAPI 3.1 & JSON Schemas);
4. **QA-022:** Segurança, Auditoria e Conformidade com a LGPD.

---

## 🛠️ Cenários Cobertos e Implementações

1. **`scripts/regression-suite.mjs`** (Novo):
   - Motor orquestrador da regressão consolidada que processa os resultados das 4 suítes e valida a obrigatoriedade estrita dos 5 campos mandatários em todas as falhas reportadas (**Severidade, Reprodução, Owner, Issue e Status**).

2. **`tests/repository/regression-suite.test.mjs`** (Novo):
   - Suíte de testes unitários que valida a integridade do motor de regressão, a cobertura das suítes QA-019..022 e a exigência de todos os campos nos relatórios de defeito.

3. **`docs/defects/DEF-QA-023-regressao-consolidada.md`** (Novo):
   - Catálogo estruturado de todas as falhas detectadas na rodada de regressão com dados reproduzíveis e código de exemplo:
     - `DEF-1` (QA-019 / Performance): Latência p95 de 680ms no catálogo público do portal (`SPEC-PORTAL-001`).
     - `DEF-2` (QA-020 / Acessibilidade): Botão de fechar modal de entregáveis sem `aria-label` (`SPEC-PI-004`).
     - `DEF-3` (QA-020 / Acessibilidade): Relação de contraste insuficiente em badge de status de extensão (`SPEC-EXT-001`).
     - `DEF-4` (QA-021 / Contrato): Discrepância na tipagem do campo `expiresIn` no contrato OpenAPI de login (`SPEC-AUTH-001`).

4. **`docs/evidence/qa-023-consolidated-regression-report.md`** (Novo):
   - Relatório oficial de evidência consolidando o dashboard das 4 suítes, as falhas mapeadas e o parecer de qualidade para release.

5. **`docs/ac-evidence-matrix.md` e `package.json`**:
   - Rastreabilidade de critérios de aceite atualizada e adição do comando `npm run regression`.

---

## ✅ Checklist dos Critérios de Aceite

- [x] Todas as SPECs exercitadas por QA-019–022 cobertas na regressão consolidada.
- [x] Execução da regressão das 4 suítes (Performance, Acessibilidade, Contratos e Segurança).
- [x] Toda falha possui relatório estruturado com **Severidade**, **Reprodução**, **Owner**, **Issue** e **Status**.
- [x] Evidência publicada em `docs/evidence/qa-023-consolidated-regression-report.md`.
- [x] Defeitos e issues vinculadas catalogados em `docs/defects/DEF-QA-023-regressao-consolidada.md`.
- [x] Revisão solicitada a Gabriel Ribeiro.

---

## 🔍 Como o Revisor Pode Validar

1. Fazer checkout da branch:
   ```bash
   git checkout feat/qa-023-regressao-consolidada-qa019-022
   ```
2. Executar a suíte de testes de regressão:
   ```bash
   npm test
   ```
3. Executar o script da suíte de regressão consolidada:
   ```bash
   npm run regression
   ```
4. Conferir o relatório consolidado em `docs/evidence/qa-023-consolidated-regression-report.md` e os defeitos catalogados em `docs/defects/DEF-QA-023-regressao-consolidada.md`.

