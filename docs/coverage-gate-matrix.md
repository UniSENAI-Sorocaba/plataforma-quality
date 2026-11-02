# Matriz de Quality Gates de Cobertura (QA-007)

> **Autoridade e Rastreabilidade:** Cobertura de todas as 13 SPECs da matriz normatica [QA-001](ac-evidence-matrix.md).  
> **Responsável:** Vitor Fazano (`vfazano`)  
> **Revisor Designado:** Gabriel Ribeiro (`@gabrielribeiro`)  
> **Dependência:** `INF-003` (Execução de testes e extração de relatórios em pipeline de CI)

---

## 1. Limiares Obrigatórios de Quality Gate

Conforme os critérios de aceite da issue **QA-007**, qualquer pull request ou build cujas métricas ficarem abaixo dos valores mínimos será **estritamente bloqueado** (`exit code = 1`):

| Escopo do Componente | Métrica: Linhas (Lines) | Métrica: Ramificações (Branches) | Comportamento Abaixo do Limite |
|---|:---:|:---:|:---:|
| **Backend Geral** (APIs, serviços, repositórios) | **>= 80%** | **>= 70%** | **FAIL** (Bloqueio de merge) |
| **Domínios Críticos** (Auth, Permissões, Notas, Horas, Certificados) | **>= 90%** | **>= 80%** | **FAIL** (Bloqueio de merge) |
| **Frontend Testável** (Lógica, hooks, utils, componentes críticos) | **>= 70%** | N/A | **FAIL** (Bloqueio de merge) |

---

## 2. Rastreabilidade com as 13 SPECs da Matriz QA-001

Todas as SPECs com lógica de backend e frontend foram classificadas quanto à criticidade e limiar exigido:

| SPEC | Descrição | Componentes | Classificação | Limiar Linhas | Limiar Branches |
|---|---|---|:---:|:---:|:---:|
| **SPEC-AUTH-001** | Login e Autenticação | Backend + Frontend | **Crítico** | >= 90% (BE) / >= 70% (FE) | >= 80% (BE) |
| **SPEC-AUTH-002** | Sessão e Ciclo do Token | Backend | **Crítico** | >= 90% (BE) | >= 80% (BE) |
| **SPEC-AUTH-003** | Controle de Acesso (RBAC/ABAC) | Backend + Frontend | **Crítico** | >= 90% (BE) / >= 70% (FE) | >= 80% (BE) |
| **SPEC-AUTH-004** | Auditoria e Privacidade | Backend | **Crítico** | >= 90% (BE) | >= 80% (BE) |
| **SPEC-PI-001** | Propostas e Equipes | Backend + Frontend | Geral | >= 80% (BE) / >= 70% (FE) | >= 70% (BE) |
| **SPEC-PI-002** | Bancas Avaliadoras | Backend + Frontend | Geral | >= 80% (BE) / >= 70% (FE) | >= 70% (BE) |
| **SPEC-PI-003** | Notas e Conceitos | Backend + Frontend | **Crítico** | >= 90% (BE) / >= 70% (FE) | >= 80% (BE) |
| **SPEC-PI-004** | Entregáveis e Uploads | Backend + Frontend | Geral | >= 80% (BE) / >= 70% (FE) | >= 70% (BE) |
| **SPEC-EXT-001** | Editais de Extensão | Backend + Frontend | Geral | >= 80% (BE) / >= 70% (FE) | >= 70% (BE) |
| **SPEC-EXT-002** | Horas e Atividades Complementares | Backend + Frontend | **Crítico** | >= 90% (BE) / >= 70% (FE) | >= 80% (BE) |
| **SPEC-EXT-003** | Certificados e Revogação | Backend + Frontend | **Crítico** | >= 90% (BE) / >= 70% (FE) | >= 80% (BE) |
| **SPEC-PORTAL-001** | Catálogo e Vitrine Pública | Backend + Frontend | Geral | >= 80% (BE) / >= 70% (FE) | >= 70% (BE) |
| **SPEC-PORTAL-002** | Métricas de Impacto | Backend + Frontend | Geral | >= 80% (BE) / >= 70% (FE) | >= 70% (BE) |

---

## 3. Automação do Gate no Repositório

O repositório `plataforma-quality` disponibiliza o script avaliador e os testes que asseguram a execução do gate:
- **Script Executor:** `scripts/coverage-gate.mjs`
- **Suíte de Testes do Gate:** `tests/repository/coverage-gate.test.mjs`
- **Comando de Verificação:** `npm test` ou `npm run coverage-gate`

