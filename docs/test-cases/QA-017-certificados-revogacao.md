# Casos de Teste: QA-017 — Emissão, Validação e Revogação de Certificados de Extensão

- **Issue / Work ID:** QA-017
- **SPEC:** `SPEC-EXT-003` (Certificados e Revogação em Atividades de Extensão)
- **Prioridade / Sprint:** P0 / S3
- **Estimativa:** 5 SP
- **Responsável:** Vitor Fazano (`vfazano`)
- **Revisor Designado:** Gustavo (`@gustavo`)
- **Dependências:** `BE-017` (Endpoints de emissão, geração de QR code, hash de autenticidade, validação pública e revogação)
- **Baseline de Governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Status:** Planejado e testado (Execução integrada aguardando deploy de `BE-017`)

---

## 1. Regras de Negócio e Diretrizes de Governança (SPEC-EXT-003)

1. **Emissão Autorizada:** Apenas perfis autorizados (Coordenação de Extensão, Gestores ou jobs automáticos de conclusão) podem emitir certificados para alunos que integralizaram a carga horária da atividade.
2. **Identificador Único e QR Code:** Cada certificado gerado recebe um código alfanumérico único de autenticidade (ex.: `CERT-EXT-2026-XXXX`) e uma URL de validação pública codificada em QR Code.
3. **Garantia de Integridade Criptográfica (Hash SHA-256):** O PDF e os dados do certificado possuem um hash criptográfico gerado na emissão. Qualquer alteração em nome, carga horária ou data invalida o hash.
4. **Consulta Pública de Autenticidade:** Qualquer terceiro pode validar o certificado pelo código ou leitura do QR Code sem necessidade de autenticação.
5. **Revogação com Motivo Minimizado (LGPD & Privacy by Design):** Em caso de revogação (ex.: fraude, cancelamento de matrícula, duplicidade), a API pública deve sinalizar `REVOGADO`, exibindo apenas um motivo padronizado e minimizado (ex.: *"Revogado por decisão administrativa"*), sem expor detalhes disciplinares ou dados pessoais sensíveis.

---

## 2. Matriz de Casos de Teste

| ID | Cenário | Condição de Entrada (Massa Sintética) | Regra / Política | Status Esperado | Resultado Esperado |
|---|---|---|---|:---:|---|
| **TC-CERT-01** | Emissão Autorizada | Aluno `USR-ALUNO-01` com 100% de presença na atividade `ACT-EXT-01`, emitido por `USR-COORD-01` | Carga horária cumprida e emissor com perfil autorizado | `201 Created` / `200 OK` | Certificado gerado; código `CERT-EXT-9901` e hash SHA-256 atribuídos; status `EMITIDO`. |
| **TC-CERT-02** | Validação Pública por Hash/QR | Consulta do código `CERT-EXT-9901` com hash coincidente | Acesso público à autenticidade do documento | `200 OK` | Status `AUTENTICO`; exibe nome do aluno, curso, atividade, carga horária e data. |
| **TC-CERT-03** | Certificado Adulterado (Tampering) | Tentativa de validação com hash divergente do gravado na emissão | Integridade e autenticidade criptográfica estritas | `422 Unprocessable Entity` | Status `ADULTERADO`; aviso explícito de falha de integridade; documento inválido. |
| **TC-CERT-04** | Código Inválido / Inexistente | Consulta pública de código não registrado (`CERT-EXT-INVALIDO`) | Busca em base oficial de certificados | `404 Not Found` | Retorno `CERTIFICADO_NAO_ENCONTRADO`; nenhum dado exposto. |
| **TC-CERT-05** | Revogação com Motivo Minimizado | Consulta pública de certificado revogado (`CERT-EXT-9902`) | LGPD e minimização de dados públicos | `410 Gone` ou `200 OK` com flag `revogado: true` | Status `REVOGADO`; exibe motivo público genérico; **bloqueia** justificativas internas/sensíveis. |

---

## 3. Dados e Arquivos Sintéticos de Teste (LGPD Compliant)

- **Certificado Válido:**
  - Código: `CERT-EXT-2026-9901`
  - Aluno Fictício: `Aluno Sintético UniSENAI A`
  - Atividade: `Workshop de Robótica Sustentável`
  - Carga Horária: `40 horas`
  - Hash SHA-256 Oficial: `a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0`
  - URL de QR Code: `https://validar.unisenai.edu.br/certificados/CERT-EXT-2026-9901`
- **Certificado Revogado:**
  - Código: `CERT-EXT-2026-9902`
  - Motivo Público Exibido (Minimizado): `"Revogado por reprocessamento administrativo"`
  - Justificativa Interna Sigilosa (Oculta na API pública): `"Substituição de cadastro por erro na carga horária da turma"`

