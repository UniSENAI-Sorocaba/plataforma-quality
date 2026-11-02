# Defeitos Encontrados na Auditoria de Acessibilidade (QA-020)

---

## Defeito 1: Botão de fechar modal de entregáveis sem nome acessível

- **Issue/AC relacionado:** QA-020 / SPEC-PI-004 (WCAG 4.1.2 Nome, Função, Valor)
- **Ambiente e versão:** Staging / Frontend Preview (`FE-017` / axe-core v4.10.2)
- **Severidade e prioridade:** Alta / P1 (Bloqueante para leitor de tela)
- **Pré-condições:** Estar autenticado como aluno e abrir o modal "Submeter Entregável" no dashboard do Projeto Integrador.
- **Passos para reproduzir:**
  1. Acessar a página de entregáveis da equipe (`/projetos-integradores/equipe/entregaveis`).
  2. Clicar em "Novo Entregável".
  3. Navegar com o leitor de tela (NVDA/VoiceOver) até o ícone `X` no canto superior direito do modal.
- **Resultado observado:** O leitor de tela anuncia apenas *"botão"* sem nenhuma descrição sobre o que o botão faz.
- **Resultado esperado:** O elemento `<button>` deve possuir o atributo `aria-label="Fechar janela de envio"` para anunciar *"Fechar janela de envio, botão"*.
- **Evidência sem dados sensíveis:**
  ```html
  <!-- Código Atual com Violação -->
  <button class="modal-close-icon"><svg>...</svg></button>
  
  <!-- Correção Obrigatória -->
  <button class="modal-close-icon" aria-label="Fechar janela de envio"><svg aria-hidden="true">...</svg></button>
  ```
- **Owner sugerido:** Squad Frontend (`FE-017`)

---

## Defeito 2: Relação de contraste insuficiente no badge de status de inscrição de extensão

- **Issue/AC relacionado:** QA-020 / SPEC-EXT-001 (WCAG 1.4.3 Contraste Mínimo)
- **Ambiente e versão:** Staging / Frontend Preview (`FE-017` / Lighthouse v12.2.0)
- **Severidade e prioridade:** Média / P2
- **Pré-condições:** Acessar a listagem de atividades de extensão com atividade em estado "Inscrições em Breve".
- **Passos para reproduzir:**
  1. Acessar `/extensao/atividades`.
  2. Localizar o card com o badge de status "Em breve".
  3. Inspecionar as cores do badge com ferramenta de contraste.
- **Resultado observado:** Texto amarelo claro `#F5D061` sobre fundo cinza claro `#F1F3F5` com relação de contraste calculada de **`1.85:1`** (muito abaixo do mínimo exigido de `4.5:1`).
- **Resultado esperado:** Relação de contraste igual ou superior a `4.5:1`. Exemplo: texto `#744210` sobre fundo `#FEFCBF` (contraste de `5.2:1`).
- **Evidência sem dados sensíveis:** Relatório gerado pela ferramenta `axe-core`: `color-contrast - Elements must have sufficient color contrast (1.85:1 expected 4.5:1)`.
- **Owner sugerido:** Squad Frontend (`FE-017`)

