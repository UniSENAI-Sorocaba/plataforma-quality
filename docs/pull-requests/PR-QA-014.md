# Pull Request: [QA-014] Validação e Testes de Segurança para Upload de Entregáveis (SPEC-PI-004)

**Título do PR Sugerido:** `feat(qa-014): validação e testes de segurança para upload de entregáveis (SPEC-PI-004)`  
**Branch Origem:** `feat/qa-014-pi-entregaveis-upload`  
**Branch Destino:** `main`  
**Issue Relacionada:** Closes `QA-014`  
**Responsável:** Bianca Cirilo (`@biancacirilo`)  
**Revisor Designado:** Gustavo (`@gustavo`)  
**Sprint / Prioridade:** S2 / P0  
**Dependências:** `BE-012–013`  

---

## 📋 Descrição do PR

Este Pull Request entrega o planejamento, matriz de cenários, automação de testes de segurança/integridade e relatório com metadados sanitizados para a **SPEC-PI-004** (Upload e Gestão de Entregáveis do Projeto Integrador).

> **Nota sobre o estado de execução:**  
> A persistência física direta contra buckets de armazenamento em nuvem (S3/MinIO) em ambiente integrado aguarda a disponibilização dos endpoints pelas dependências de backend `BE-012` e `BE-013`. Este PR antecipa as regras de negócio, os contratos de API, os testes automatizados determinísticos e as evidências sanitizadas (*Shift-Left Testing*).

---

## 🛠️ Alterações Realizadas

1. **`docs/test-cases/QA-014-upload-entregaveis.md`** (Novo):
   - Mapeamento detalhado dos 7 cenários obrigatórios da SPEC-PI-004:
     - `TC-UPL-01`: Upload com tipo e tamanho válidos, hash íntegro e aluno autorizado.
     - `TC-UPL-02`: Upload com tipo inválido (bloqueio de executáveis/mime mismatch — `415`).
     - `TC-UPL-03`: Upload com tamanho excessivo (> 25MB — `413`).
     - `TC-UPL-04`: Tentativa de upload com URL pré-assinada expirada (`403`/`410`).
     - `TC-UPL-05`: Tentativa de download/acesso a entregável revogado (`410`).
     - `TC-UPL-06`: Falha de integridade com hash SHA-256 divergente (`422`).
     - `TC-UPL-07`: Bloqueio de upload de aluno em equipe na qual não está alocado (`403`).
   - Especificação de massa sintética e parâmetros LGPD/segurança.

2. **`tests/api/qa-014-upload-validation.test.mjs`** (Novo):
   - Módulo automatizado com funções de validação e suíte completa de testes unitários garantindo que cada cenário produz exatamente o status code e código de erro especificados.

3. **`docs/evidence/qa-014-upload-entregaveis-report.md`** (Novo):
   - Relatório de evidência oficial seguindo o padrão de governança, apresentando as chamadas HTTP (requests/responses) 100% sanitizadas, sem dados pessoais ou segredos de storage expostos.

4. **`docs/ac-evidence-matrix.md` e `package.json`**:
   - Rastreabilidade de critérios de aceite atualizada e adição dos comandos `npm run test:api` e `npm run test:all`.

---

## ✅ Checklist dos Critérios de Aceite

- [x] SPEC-PI-004 mapeada e coberta integralmente.
- [x] Teste de upload com tipo e tamanho válidos.
- [x] Teste de upload com tipo inválido (`415 Unsupported Media Type`).
- [x] Teste de upload com tamanho inválido (`413 Payload Too Large`).
- [x] Teste de URL temporária expirada (`403 Forbidden`).
- [x] Teste de acesso a objeto revogado (`410 Gone`).
- [x] Teste de integridade com hash SHA-256 divergente (`422 Unprocessable Entity`).
- [x] Teste de usuário sem autorização na equipe (`403 Forbidden`).
- [x] Evidência publicada com metadados sanitizados em `docs/evidence/qa-014-upload-entregaveis-report.md`.
- [x] Revisão solicitada a Gustavo.

---

## 🔍 Como o Revisor Pode Validar

1. Fazer checkout da branch:
   ```bash
   git checkout feat/qa-014-pi-entregaveis-upload
   ```
2. Executar os testes automatizados da API de entregáveis:
   ```bash
   npm run test:api
   ```
3. Conferir a especificação em `docs/test-cases/QA-014-upload-entregaveis.md` e o relatório de evidências sanitizadas em `docs/evidence/qa-014-upload-entregaveis-report.md`.

