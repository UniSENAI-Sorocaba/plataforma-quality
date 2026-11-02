# Registro Consolidado de Defeitos da Regressão (QA-023 / QA-019–022)

Este documento registra todas as falhas identificadas durante a execução da suíte de regressão consolidada cobrindo as verticais de Performance (`QA-019`), Acessibilidade (`QA-020`), Contratos (`QA-021`) e Segurança (`QA-022`).

---

## Defeito 1: Violação de Latência p95 no Catálogo Público de Projetos

- **Issue/AC relacionado:** QA-019 / SPEC-PORTAL-001 (Threshold k6: p95 <= 500ms a 200 RPS)
- **Severidade:** Média (P2 — Degradação de Experiência sob Carga)
- **Status:** Aberto
- **Owner:** Squad Portal & Backend (`BE-015`)
- **Ambiente e versão:** Staging / Cluster Kubernetes (k6 v0.54.0)
- **Pré-condições:** Banco de dados populado com 500 projetos e massa de teste sintética ativa.
- **Passos para reproduzir:**
  1. Executar o cenário de carga k6: `k6 run --vus 50 --duration 3m tests/performance/portal-catalogo.js`.
  2. Submeter tráfego sustentado de 200 RPS no endpoint `GET /api/v1/portal/projetos?pagina=1&tamanho=20`.
  3. Coletar a métrica `http_req_duration{p(95)}`.
- **Resultado observado:** O percentil 95 de tempo de resposta atingiu **`680 ms`**, ultrapassando o limite normativo estipulado em **`500 ms`**.
- **Resultado esperado:** O percentil 95 deve permanecer igual ou inferior a `500 ms` sob carga nominal de 200 RPS.
- **Evidência sem dados sensíveis:** Relatório k6 consolidado anexado em `docs/evidence/qa-023-consolidated-regression-report.md`.

---

## Defeito 2: Botão de Fechar Modal de Entregáveis Sem Nome Acessível

- **Issue/AC relacionado:** QA-020 / SPEC-PI-004 (WCAG 2.1 AA — Critério 4.1.2 Nome, Função, Valor)
- **Severidade:** Alta (P1 — Barreira para Usuários de Tecnologia Assistiva)
- **Status:** Aberto
- **Owner:** Squad Frontend (`FE-017`)
- **Ambiente e versão:** Staging / Frontend Preview (`axe-core v4.10.2`)
- **Pré-condições:** Usuário autenticado como aluno na tela de entregáveis do Projeto Integrador.
- **Passos para reproduzir:**
  1. Acessar `/projetos-integradores/equipe/entregaveis`.
  2. Abrir o modal "Novo Entregável".
  3. Navegar com o leitor de tela (NVDA) até o ícone `X` de fechamento do modal.
- **Resultado observado:** O botão é anunciado apenas como *"botão"* sem texto perceptível ou `aria-label`.
- **Resultado esperado:** O botão deve conter `aria-label="Fechar janela de envio"` para ser lido como *"Fechar janela de envio, botão"*.
- **Evidência sem dados sensíveis:** `<button class="close-modal"><svg ... /></button>` (falta `aria-label`).

---

## Defeito 3: Relação de Contraste Insuficiente no Badge de Status de Extensão

- **Issue/AC relacionado:** QA-020 / SPEC-EXT-001 (WCAG 2.1 AA — Critério 1.4.3 Contraste Mínimo)
- **Severidade:** Média (P2 — Dificuldade Visual de Leitura)
- **Status:** Aberto
- **Owner:** Squad Frontend (`FE-017`)
- **Ambiente e versão:** Staging / Frontend Preview (`Lighthouse v12.2.0`)
- **Pré-condições:** Acessar listagem de editais com atividade no estado "Em Breve".
- **Passos para reproduzir:**
  1. Acessar `/extensao/atividades`.
  2. Inspecionar o elemento do badge `<span class="badge-status-breve">Em breve</span>`.
  3. Verificar as cores computadas no inspetor CSS.
- **Resultado observado:** Texto `#F5D061` sobre fundo `#F1F3F5` com contraste calculado de **`1.85:1`** (abaixo de 4.5:1).
- **Resultado esperado:** Relação de contraste mínima de `4.5:1` (ex.: texto `#744210` sobre fundo `#FEFCBF`, contraste `5.2:1`).
- **Evidência sem dados sensíveis:** Relatório de contraste do motor axe-core.

---

## Defeito 4: Discrepância de Tipo de Dado no Contrato OpenAPI de Autenticação

- **Issue/AC relacionado:** QA-021 / SPEC-AUTH-001 (Compatibilidade OpenAPI 3.1)
- **Severidade:** Média (P2 — Risco de Incompatibilidade de Tipagem no SDK/Frontend)
- **Status:** Em correção
- **Owner:** Squad Backend (`BE-006`)
- **Ambiente e versão:** Staging / API Gateway
- **Pré-condições:** Disparar requisição válida no endpoint de login.
- **Passos para reproduzir:**
  1. Enviar `POST /api/v1/auth/login` com credenciais sintéticas válidas.
  2. Validar o payload retornado contra o schema `OpenAPI 3.1` oficial (`contracts/openapi-auth.yaml`).
- **Resultado observado:** O campo `expiresIn` no JSON de resposta foi serializado como string `"3600"` em vez de inteiro numérico `3600`.
- **Resultado esperado:** O campo `expiresIn` deve respeitar rigorosamente a tipagem `type: integer` definida no contrato da governança.
- **Evidência sem dados sensíveis:** Payload sanitizado: `{"token": "<TOKEN>", "expiresIn": "3600"}`.

