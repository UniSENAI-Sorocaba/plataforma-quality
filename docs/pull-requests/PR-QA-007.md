# Pull Request: [QA-007] Quality Gates de Cobertura de Código com Bloqueio Automatizado

**Título do PR Sugerido:** `feat(qa-007): implementa quality gates de cobertura com bloqueio abaixo do limite`  
**Branch Origem:** `feat/qa-007-coverage-gates`  
**Branch Destino:** `main`  
**Issue Relacionada:** Closes `QA-007`  
**Responsável:** Vitor Fazano (`@vfazano`)  
**Revisor Designado:** Gabriel Ribeiro (`@gabrielribeiro`)  
**Sprint / Prioridade:** S0 / P0  
**Dependências:** `INF-003`  

---

## 📋 Descrição do PR

Este Pull Request implementa a entrega de **Quality Gates de Cobertura de Código (QA-007)**, estabelecendo o mecanismo determinístico de validação e bloqueio de merge para todas as SPECs da matriz **QA-001** no ecossistema da Plataforma Digital UniSENAI.

### 🎯 Limiares Normativos Implementados
1. **Backend Geral:**
   - `lines >= 80%`
   - `branches >= 70%`
2. **Domínios Críticos (Auth, Permissões, Notas, Horas, Certificados):**
   - `lines >= 90%`
   - `branches >= 80%`
3. **Frontend Testável:**
   - `lines >= 70%`
4. **Enforcement (Bloqueio):**
   - Qualquer valor estritamente abaixo do limiar resulta em status `FAIL` e encerramento com `exit code 1`, interrompendo o pipeline de CI e impedindo o merge do PR.

---

## 🛠️ Alterações Realizadas

1. **`scripts/coverage-gate.mjs`**:
   - Mecanismo do quality gate com limiares configuráveis e suporte a relatórios de cobertura.
   - Avaliação por componente e domínio crítico.
   - Formatação clara em console e exportação em formato JSON para pipelines.
2. **`tests/repository/coverage-gate.test.mjs`**:
   - Suíte de testes unitários determinísticos cobrindo:
     - Aprovação com `PASS` e `exitCode 0` quando métricas atendem ou superam os limites.
     - Confirmação de bloqueio (`FAIL` e `exitCode 1`) para quebras em linhas de backend (< 80%).
     - Confirmação de bloqueio para quebras em branches de backend (< 70%).
     - Confirmação de bloqueio para quebras em domínios críticos (< 90% linhas ou < 80% branches).
     - Confirmação de bloqueio para quebras em frontend testável (< 70%).
     - Validação de que todas as 13 SPECs da matriz QA-001 estão mapeadas no inventário.
3. **`package.json`**:
   - Adicionado script `"coverage-gate": "node scripts/coverage-gate.mjs"`.
4. **`docs/coverage-gate-matrix.md`**:
   - Matriz detalhada correlacionando cada uma das 13 SPECs do MVP da QA-001 com a respectiva regra de cobertura.
5. **`docs/evidence/qa-007-coverage-gate-report.md`**:
   - Relatório de evidência oficial seguindo o padrão de governança, com logs de execução de PASS e FAIL reproduzíveis.
6. **`docs/ac-evidence-matrix.md`**:
   - Rastreabilidade atualizada com a entrada formal da issue `QA-007`.

---

## ✅ Checklist dos Critérios de Aceite

- [x] Todas as SPECs com lógica backend/frontend cobertas pela matriz QA-001 (13 SPECs mapeadas).
- [x] Validação de gates: backend lines >= 80% e branches >= 70%.
- [x] Validação de domínios críticos: lines >= 90% e branches >= 80%.
- [x] Validação de frontend testável >= 70%.
- [x] Confirmação e teste determinístico de bloqueio abaixo do limite (`exit code 1`).
- [x] Evidência: relatório de cobertura e execução do gate publicado em `docs/evidence/qa-007-coverage-gate-report.md`.
- [x] Revisão solicitada a Gabriel Ribeiro.

---

## 🔍 Como o Revisor Pode Validar

1. Checkout da branch:
   ```bash
   git checkout feat/qa-007-coverage-gates
   ```
2. Executar a suíte de testes do repositório:
   ```bash
   npm test
   ```
3. Executar o script do Quality Gate:
   ```bash
   npm run coverage-gate
   ```
4. Conferir a matriz em `docs/coverage-gate-matrix.md` e a evidência em `docs/evidence/qa-007-coverage-gate-report.md`.

