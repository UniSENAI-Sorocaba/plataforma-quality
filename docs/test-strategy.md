# Estratégia de testes

> Rascunho da QA-001. A estratégia organiza a cobertura do MVP; a aprovação depende dos critérios de aceite (ACs) publicados pelo Produto e da revisão de Gustavo.

## Escopo e fonte das regras

- Cobrir as 13 SPECs do MVP: AUTH-001 a 004, PI-001 a 004, EXT-001 a 003 e PORTAL-001 a 002, conforme o [índice de governança](https://github.com/UniSENAI-Sorocaba/plataforma-governance/tree/main/_KB/specs).
- Usar a [matriz AC → evidência](ac-evidence-matrix.md) para ligar cada AC aprovado à issue executora, responsável, tipo de verificação, ferramenta e evidência esperada. O inventário provisório das SPECs não substitui as linhas individuais por AC.
- A squad autora valida a unidade e a integração do seu componente. Quality organiza a rastreabilidade e valida fluxos integrados, contrato, jornadas, desempenho e segurança conforme as issues atribuídas.
- Sem AC aprovado, registrar a pendência ao PO. A squad não define sozinha um resultado esperado para regra de negócio indefinida.

## Pirâmide e ownership

| Camada | Local | Responsável pela evidência |
| --- | --- | --- |
| Unitário | repositório da aplicação | squad autora |
| Integração | aplicação/database | squad autora + Quality |
| Contrato | tests/contract | Quality + produtores/consumidores |
| E2E | tests/e2e | Quality |
| Performance | tests/performance | Quality + Cloud/Database |
| Segurança | tests/security | Quality/Security |

## Regra de resultado

- PASS: critério atendido com evidência reproduzível;
- WARN: risco ou lacuna exige justificativa e decisão humana;
- FAIL: Must Have, SPEC ou check obrigatório violado; impede merge.

Cada execução deve registrar baseline, commit do sistema sob teste, ambiente, dados sintéticos, resultado e artefatos. Segredos e dados pessoais não integram evidências.

## Fluxo de trabalho por entrega

1. Antes de planejar um cenário, localizar o AC aprovado e a issue de implementação. Se faltar qualquer um, registrar a lacuna na matriz e pedir decisão ao PO.
2. Definir na matriz quem valida, qual nível e ferramenta são adequados, qual dado fictício será usado e que evidência permitirá reproduzir o resultado.
3. Quando a funcionalidade estiver disponível, executar a validação na etapa correspondente da pipeline do GitHub Actions ou no ambiente acordado para a entrega. Registrar commit, baseline, data, ambiente temporário, entradas sanitizadas, resultado e links dos artefatos.
4. Se falhar, abrir defeito com passos de reprodução e vincular a issue responsável. Se houver risco aceito como WARN, registrar a justificativa e a decisão humana. Não marcar PASS sem evidência.
5. Antes de declarar uma SPEC coberta, comparar todos os seus ACs aprovados com a matriz. Gabriel confere a rastreabilidade; Gustavo revisa a cobertura e os riscos de segurança.

## Pendências para aprovação da QA-001

- Fellipe, como PO, precisa confirmar os ACs numerados e o estado dos refinamentos PG-006 a PG-012. O índice de SPECs ainda os apresenta como Draft em 09/10/2026.
- O vínculo de QA para EXT-001 e a validação funcional de PORTAL-002 ainda precisam ser decididos; a matriz registra essas lacunas.
- A referência de baseline da governança deve apontar para uma tag publicada antes de uma checagem remota emitir PASS verificável. Essa publicação é uma dependência de governança separada da definição dos ACs pelo PO.
- Este documento e a matriz só podem ser considerados aprovados após a revisão de Gustavo e a conferência de que nenhum AC aprovado ficou sem issue, responsável e evidência prevista.
