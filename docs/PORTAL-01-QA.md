# PORTAL‑01‑QA – Guia de Qualidade para o Portal

## 📋 Visão geral

| Campo                     | Valor |
|---------------------------|-------|
| **Work ID**               | `PORTAL‑01‑QA` |
| **Objetivo**              | Definir e documentar o processo de qualidade (testes, evidências, métricas) para o **Portal** da Plataforma. |
| **Prioridade / Sprint**   | `P0 / S0` |
| **Responsável**           | **[Nome do responsável]** |
| **Revisor**               | **[Nome do revisor]** |
| **Dependência**           | Nenhuma (é uma tarefa raiz). |
| **Repositório**           | `plataforma/plataforma-quality` |
| **Links úteis**           | - Issue: https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/PORTAL-01-QA (criar)  
- Specs: https://github.com/UniSENAI-Sorocaba/plataforma-governance/tree/main/_KB/specs |

---

## 1️⃣ Escopo esperado

1. **Mapeamento de SPECs** do Portal (ex.: `SPEC‑PORTAL‑001`, `SPEC‑PORTAL‑002`).
2. **Criação de templates** para casos de teste, evidências e defeitos (já existentes em `templates/`).
3. **Definição de métricas de qualidade**: cobertura de SPEC, taxa de falhas, tempo médio de correção.
4. **Automação**: scripts de CI que executem os testes de UI (ex.: Cypress) e publiquem evidências.
5. **Documentação**: guia passo‑a‑passo (este arquivo) e matriz de rastreabilidade (`docs/portal-ac-evidence-matrix.md`).

---

## 2️⃣ Resumo das SPECs do Portal

| SPEC | Escopo | Campos principais | Regra chave |
|------|--------|-------------------|------------|
| **SPEC‑PORTAL‑001** | Navegação principal (home, menu, busca) | `Tela`, `Ação do usuário`, `Estado antes/depois`, `Resultado esperado`, `Screenshot` | Screenshots ≥ 1280 × 720 PNG. |
| **SPEC‑PORTAL‑002** | Acessibilidade (WCAG 2.1) | `Elemento`, `Critério WCAG`, `Resultado esperado`, `Evidência` | Deve citar número da norma (ex.: `1.4.3`). |

> **Observação:** Os campos acima são os que devem aparecer nos *templates* de caso e evidência.

---

## 3️⃣ Templates (já disponíveis)

- **Caso de teste** – `templates/template-case.md`
- **Evidência** – `templates/template-evidence.md`
- **Defeito** – `templates/template-defect.md`

> **Dica:** copie-os para `templates/portal/` se quiser separar os templates do Portal dos demais.

---

## 4️⃣ Passo a passo detalhado

1. **Criar branch** (já feita) e **push** para o remoto:
   ```powershell
   git push -u origin feature/portal-01-qa
   ```
2. **Criar diretório de templates do Portal** (opcional):
   ```powershell
   mkdir templates/portal
   cp templates/template-*.md templates/portal/
   ```
3. **Criar exemplos reais** (ex.: teste de login no portal):
   - Copie `templates/template-case.md` para `templates/portal/example-login-case.md` e preencha com os campos da SPEC‑PORTAL‑001.
   - Gere a evidência usando Cypress e salve em `templates/portal/example-login-evidence.md`.
4. **Atualizar a matriz de rastreabilidade** (`docs/portal-ac-evidence-matrix.md`):
   ```markdown
   | Issue | SPEC/AC | Nível | Automação | Evidência | Estado |
   | --- | --- | --- | --- | --- | --- |
   | #PORTAL‑01‑QA | SPEC‑PORTAL‑001 | Alta | Sim (Cypress) | `templates/portal/example-login-evidence.md` | Concluído |
   ```
5. **Documentar no CI** – adicione ao `github/workflows/portal-ci.yml` um job que rode os testes Cypress e publique os artefatos.
6. **Abrir Pull Request** apontando para `develop` (ou branch padrão) com `Closes #PORTAL-01-QA` no corpo.

---

## 5️⃣ Checklist de conclusão
- [ ] Mapear SPECs do Portal.
- [ ] Copiar/ajustar templates para a pasta `templates/portal/`.
- [ ] Criar ao menos um caso de teste e evidência reais.
- [ ] Atualizar a matriz de rastreabilidade (`docs/portal-ac-evidence-matrix.md`).
- [ ] Adicionar job CI no workflow `portal-ci.yml`.
- [ ] Criar PR com `Closes #PORTAL-01-QA`.

---

## 6️⃣ Boas práticas
- Nomear arquivos de teste como `PORTAL‑01‑QA‑001‑<descrição>.md`.
- Manter screenshots em `evidencias/portal/` e referenciá‑las via caminho relativo.
- Atualizar a matriz sempre que um novo caso ou defeito for adicionado.
- Revisar com o time de UI/UX para validar os critérios de acessibilidade.

---

*Este guia serve como ponto de partida para garantir a qualidade do Portal dentro da plataforma.*
