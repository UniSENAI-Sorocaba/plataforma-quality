# Matriz critério de aceite → evidência

> Rascunho da QA-001, conferido em 09/10/2026. O índice de governança ainda marca as 13 SPECs do MVP como Draft. O inventário abaixo orienta a distribuição; ele **não comprova cobertura de critérios de aceite (ACs)**. Só registrar AC como aprovado após confirmação do PO.

## Fontes e regra de preenchimento

- [Índice das SPECs](https://github.com/UniSENAI-Sorocaba/plataforma-governance/tree/main/_KB/specs) e refinamentos [PG-006](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6) a [PG-012](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/12) no repositório de governança.
- Para cada AC aprovado, criar uma linha na seção “Matriz por AC aprovado” com código exato da SPEC e do AC, issue executora, tipo de verificação, ferramenta, responsável, evidência esperada e estado.
- Não usar uma linha de SPEC como substituta de linhas por AC. Se o critério, a regra de negócio ou o vínculo com uma issue estiver indefinido, registrar “Pendente do PO” e manter a lacuna visível.
- Antes de pedir aprovação, comparar a lista de ACs de cada SPEC aprovada com esta matriz. Nenhum AC pode ficar sem linha; nenhuma linha pode ficar sem responsável e evidência esperada.

## Inventário provisório das SPECs

| SPEC | Refinamento de Produto | Issue(s) de QA candidata(s) | Responsável atual | Verificação e evidência previstas | Situação |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 — login | [PG-006](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6) | [QA-008](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/8) | Ahslam | Fluxos de login pela API; relatório e respostas sanitizadas | ACs pendentes do PO |
| AUTH-002 — sessão | [PG-006](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6) | [QA-008](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/8) | Ahslam | Refresh, logout e reutilização de token; relatório sanitizado | ACs pendentes do PO |
| AUTH-003 — permissões | [PG-006](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6) | [QA-009](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/9), [AUTH-08-QA](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/31) | Ahslam | Matriz de acesso por perfil, API e navegação; respostas e telas sanitizadas | ACs pendentes do PO |
| AUTH-004 — auditoria | [PG-006](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/6) | [QA-022](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/22) | Gabriel Camargo | Registros de auditoria e privacidade; relatório sanitizado | ACs pendentes do PO |
| PI-001 — propostas e equipes | [PG-007](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/7), [PG-008](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/8) | [QA-011](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/11) | Gabriel Camargo | Transições e concorrência; cenários e relatório | ACs pendentes do PO |
| PI-002 — bancas | [PG-007](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/7), [PG-008](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/8) | [QA-013](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/13) | Ahslam | Conflitos e avaliador inválido; cenários e relatório | ACs pendentes do PO |
| PI-003 — notas | [PG-007](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/7), [PG-008](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/8) | [QA-016](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/16) | Gabriel Camargo | Cálculo, limites e permissões; cenários e relatório | ACs pendentes do PO |
| PI-004 — entregáveis | [PG-007](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/7), [PG-008](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/8) | [QA-014](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/14) | Vitor Fazano | Upload, expiração e autorização; relatório sanitizado | ACs pendentes do PO |
| EXT-001 — editais | [PG-009](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/9), [PG-010](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/10) | A vincular | A definir | Confirmar com o PO a issue de QA que validará os critérios de edital | ACs e vínculo pendentes |
| EXT-002 — horas | [PG-009](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/9), [PG-010](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/10) | [QA-015](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/15) | Guilherme Arruda | Decisão, total e auditoria; relatório e registros sanitizados | ACs pendentes do PO |
| EXT-003 — certificados | [PG-009](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/9), [PG-010](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/10) | [QA-017](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/17) | Vitor Fazano | Validade, adulteração e revogação; relatório | ACs pendentes do PO |
| PORTAL-001 — catálogo | [PG-011](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/11), [PG-012](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/12) | [QA-018](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/18), [PORTAL-01-QA](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/33) | Ahslam e Bianca | Catálogo e entrada pública; cenários e relatório | ACs pendentes do PO |
| PORTAL-002 — impacto | [PG-011](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/11), [PG-012](https://github.com/UniSENAI-Sorocaba/plataforma-governance/issues/12) | [QA-022](https://github.com/UniSENAI-Sorocaba/plataforma-quality/issues/22) cobre privacidade; validação funcional a vincular | A definir | Confirmar a issue de QA da jornada de impacto com o PO | ACs e vínculo pendentes |

## Matriz por AC aprovado

Ainda não há AC aprovado confirmado para transcrever nesta seção. Preencher uma linha **por AC**, após validação do PO, no formato:

| SPEC/AC | Issue executora | Tipo de verificação | Ferramenta prevista | Responsável | Evidência esperada | Estado |
| --- | --- | --- | --- | --- | --- | --- |

O GitHub Project mantém o estado operacional das issues. Esta matriz registra a rastreabilidade entre regra aprovada, execução e evidência.
