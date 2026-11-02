# Pull Request: [EXT-05] Cenários de Teste, Matriz de Regras e Template de Evidências

**Título do PR Sugerido:** `docs(qa): cenários de teste, matriz de regras e template de evidência para EXT-05`  
**Branch Origem Sugerida:** `feat/ext-05-qa-inscricao-extensao`  
**Branch Destino:** `main`  
**Issue Principal:** [EXT-05 — Issue #25](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/25)  
**Responsável:** Vitor Fazano (`@vfazano`)  
**Revisor Designado:** Gabriel Ribeiro (`@gabrielribeiro`)  
**Sprint:** S4  
**Dependências:** `EXT-05-BE`, `EXT-05-FE` e `EXT-05-DB`  

---

## 📋 Descrição do PR

Este Pull Request implementa a primeira fase da issue **EXT-05** (*Shift-Left Testing*), entregando o planejamento formal, a matriz de cobertura de regras de negócio, a modelagem dos casos de teste (API e UI) e o esqueleto de evidências sanitizadas.

> **Nota de Bloqueio Operacional:**  
> A execução prática dos testes (chamadas reais de API e interação com as telas) aguarda a conclusão e disponibilização das dependências de Backend (`EXT-05-BE`), Frontend (`EXT-05-FE`) e Banco de Dados (`EXT-05-DB`). Este PR consolida todos os artefatos de qualidade que devem preceder a homologação.

---

## 🛠️ Alterações Realizadas

### 1. Modelagem dos Casos de Teste e Regras de Negócio
- **Arquivo Criado:** `docs/test-cases/EXT-05-validacao-inscricao.md`
- **Conteúdo:**
  - Mapeamento de 7 casos de teste cobrindo todas as exigências da issue:
    - `TC-EXT-05-01`: Inscrição válida (dentro da janela e aluno elegível).
    - `TC-EXT-05-02`: Inscrição antes do prazo (bloqueio por janela futura).
    - `TC-EXT-05-03`: Inscrição depois do prazo (bloqueio por janela expirada).
    - `TC-EXT-05-04`: Inscrição de pessoa inelegível (bloqueio por perfil/situação acadêmica).
    - `TC-EXT-05-05`: Inscrição repetida/duplicada (unicidade da inscrição ativa).
    - `TC-EXT-05-06`: Transição de estado proibida (integridade da máquina de estados no DB).
    - `TC-EXT-05-07`: Transição de estado não autorizada por perfil comum (RBAC).
  - Levantamento de dúvidas para validação com o Product Owner (PO).
  - Definição da massa de dados fictícia/sintética (alunos e atividades) em conformidade com a LGPD.

### 2. Template e Estrutura de Evidências Sanitizadas
- **Arquivo Criado:** `docs/evidence/EXT-05-evidence.md`
- **Conteúdo:**
  - Estrutura padronizada (conforme `templates/evidence.md`) para registrar os payloads HTTP (`request`/`response`), códigos de status e prints de UI de forma 100% sanitizada, sem exposição de dados pessoais reais.

### 3. Rastreabilidade de Critérios de Aceite (AC)
- **Arquivo Modificado:** `docs/ac-evidence-matrix.md`
- **Conteúdo:**
  - Inclusão da rastreabilidade da issue `EXT-05` apontando para os casos de teste e sinalizando o status de dependência.

---

## 🚦 Status dos Critérios de Aceite da Issue

| Critério de Aceite | Status | Detalhes |
|---|---|---|
| Tabela ligando cada caso a uma regra | ✅ Concluído | Tabela detalhada em `docs/test-cases/EXT-05-validacao-inscricao.md` |
| Anotação de dúvidas para o PO | ✅ Concluído | 5 tópicos de alinhamento registrados |
| Definição de usuários e atividades fictícios | ✅ Concluído | Perfis sintéticos definidos (LGPD Compliant) |
| Execução dos casos por API e Tela | ⏳ Bloqueado | Aguardando entrega de `EXT-05-BE` e `EXT-05-FE` |
| Evidências e payloads sanitizados | 📝 Preparado | Template estruturado em `docs/evidence/EXT-05-evidence.md` |
| Defeitos reportados | ⏳ Pendente | Será executado se houver divergências durante a rodada de testes |
| Revisão solicitada a Gabriel | 👤 Pendente | Gabriel Ribeiro vinculado como revisor deste PR |

---

## 🔍 Como o Revisor Pode Validar

1. Fazer o checkout da branch:
   ```bash
   git checkout feat/ext-05-qa-inscricao-extensao
   ```
2. Verificar se a matriz em `docs/test-cases/EXT-05-validacao-inscricao.md` atende integralmente à issue principal EXT-05.
3. Verificar a conformidade do arquivo `docs/evidence/EXT-05-evidence.md` com as diretrizes de governança e ausência de dados sensíveis.
4. Validar o rastreamento em `docs/ac-evidence-matrix.md`.

