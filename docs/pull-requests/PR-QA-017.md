# Pull Request: [QA-017] Validação de Emissão, Integridade por QR/Hash e Revogação Minimizada de Certificados (SPEC-EXT-003)

**Título do PR Sugerido:** `feat(qa-017): validação de emissão, integridade por QR/Hash e revogação minimizada de certificados (SPEC-EXT-003)`  
**Branch Origem:** `feat/qa-017-ext-certificados-revogacao`  
**Branch Destino:** `main`  
**Issue Relacionada:** Closes `QA-017`  
**Responsável:** Vitor Fazano (`@vfazano`)  
**Revisor Designado:** Gustavo (`@gustavo`)  
**Sprint / Prioridade:** S3 / P0 (5 SP)  
**Dependências:** `BE-017`  

---

## 📋 Descrição do PR

Este Pull Request implementa a entrega de testes e conformidade para a **SPEC-EXT-003** (Emissão, Validação e Revogação de Certificados de Atividades de Extensão), estabelecendo a cobertura de integridade criptográfica, validação pública e privacidade por design (LGPD).

> **Nota sobre o estado de execução:**  
> A geração em lote e persistência em banco de dados em ambiente integrado de staging aguarda a conclusão do backend pela dependência `BE-017`. Este PR entrega todos os contratos, cenários de teste, suíte automatizada determinística e evidências de validação pública com motivo minimizado (*Shift-Left Testing*).

---

## 🛠️ Cenários Cobertos e Implementações

1. **`docs/test-cases/QA-017-certificados-revogacao.md`** (Novo):
   - Mapeamento dos 5 cenários mandatórios da SPEC-EXT-003:
     - `TC-CERT-01`: Emissão autorizada com carga horária integralizada (`201 Created`).
     - `TC-CERT-02`: Validação pública por QR Code / Hash oficial (`200 OK` — `AUTENTICO`).
     - `TC-CERT-03`: Detecção e rejeição de certificado adulterado com hash divergente (`422 Unprocessable Entity` — `ADULTERADO`).
     - `TC-CERT-04`: Código inválido ou não cadastrado (`404 Not Found`).
     - `TC-CERT-05`: Consulta pública a certificado revogado com **motivo minimizado**, sem vazamento de notas internas ou justificativas sigilosas (`410 Gone` — `REVOGADO`).
   - Especificação de massa de teste e dados sintéticos em conformidade com a LGPD.

2. **`tests/api/qa-017-certificates-validation.test.mjs`** (Novo):
   - Suíte de testes automatizados unitários cobrindo o ciclo de vida completo do certificado e assertando que notas confidenciais nunca são expostas na rota pública.

3. **`docs/evidence/qa-017-certificados-report.md`** (Novo):
   - Relatório de evidência oficial contendo o modelo sintético do certificado, chamadas HTTP de validação registradas e parecer de segurança e privacidade.

4. **`docs/ac-evidence-matrix.md` e `package.json`**:
   - Rastreabilidade atualizada com a issue `QA-017` e adição dos comandos `npm run test:api`.

---

## ✅ Checklist dos Critérios de Aceite

- [x] SPEC-EXT-003 mapeada e coberta integralmente.
- [x] Teste de emissão autorizada (perfil coordenação e carga horária completa).
- [x] Teste de hash / QR Code válido com retorno de autenticidade.
- [x] Teste de certificado adulterado com rejeição imediata (`422`).
- [x] Teste de código inválido com retorno `404 Not Found`.
- [x] Teste de revogação com motivo minimizado (bloqueio de dados sensíveis pela LGPD).
- [x] Evidências anexadas com arquivos sintéticos em `docs/evidence/qa-017-certificados-report.md`.
- [x] Revisão solicitada a Gustavo.

---

## 🔍 Como o Revisor Pode Validar

1. Fazer checkout da branch:
   ```bash
   git checkout feat/qa-017-ext-certificados-revogacao
   ```
2. Executar os testes automatizados da API de certificados:
   ```bash
   npm run test:api
   ```
3. Conferir a matriz em `docs/test-cases/QA-017-certificados-revogacao.md` e o relatório em `docs/evidence/qa-017-certificados-report.md`.

