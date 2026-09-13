# Estratégia de testes

## Pirâmide e ownership

| Camada | Local | Responsável pela evidência |
| --- | --- | --- |
| Unitário | repositório da aplicação | squad autora |
| Integração | aplicação/database | squad autora + Quality |
| Contrato | `tests/contract` | Quality + produtores/consumidores |
| E2E | `tests/e2e` | Quality |
| Performance | `tests/performance` | Quality + Cloud/Database |
| Segurança | `tests/security` | Quality/Security |

## Regra de resultado

- `PASS`: critério atendido com evidência reproduzível;
- `WARN`: risco ou lacuna exige justificativa e decisão humana;
- `FAIL`: Must Have, SPEC ou check obrigatório violado; impede merge.

Cada execução deve registrar baseline, commit do sistema sob teste, ambiente, dados sintéticos, resultado e artefatos. Segredos e dados pessoais não integram evidências.
