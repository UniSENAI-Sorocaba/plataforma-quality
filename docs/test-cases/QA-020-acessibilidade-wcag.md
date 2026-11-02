# Casos de Teste: QA-020 — Auditoria de Acessibilidade WCAG 2.1 AA nas Telas Críticas

- **Issue / Work ID:** QA-020
- **SPECs no Escopo:** `SPEC-AUTH-001..004`, `SPEC-PI-001..004`, `SPEC-EXT-001..003` e `SPEC-PORTAL-001..002` (Telas Críticas das 13 SPECs do MVP)
- **Prioridade / Sprint:** P0 / S4
- **Estimativa:** 5 SP
- **Responsável:** Bianca Cirilo (`@biancacirilo`)
- **Revisor Designado:** Paola (`@paola`)
- **Dependências:** `FE-017` (Frontend: Telas críticas das jornadas de autenticação, projetos integradores, extensão e portal)
- **Baseline de Governança:** `governance-v0.1.0` (commit `379131e3fa7c0411d5055b14b6bb30dd0853a3b5`)
- **Padrão Normativo:** Diretrizes de Acessibilidade para Conteúdo Web (WCAG 2.1 nível AA)
- **Ferramentas Auditadas:** `axe-core v4.10.2`, `Lighthouse v12.2.0`, `Screen Reader Simulator / NVDA`

---

## 1. Critérios de Avaliação WCAG 2.1 AA

| Critério | Diretriz WCAG | Requisito Mandatório | Tolerância |
|---|---|---|:---:|
| **1. Navegação por Teclado** | 2.1.1 (Teclado) e 2.1.2 (Sem Armadilhas) | Todos os componentes operáveis via teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`). Nenhuma armadilha de foco em modais. | Zero bloqueios |
| **2. Foco Visível** | 2.4.7 (Foco Visível) | Indicador visual de foco nítido e com contraste ($\ge 3:1$) em botões, links, inputs e caixas de diálogo. Proibido `outline: none` sem substituto. | Zero bloqueios |
| **3. Nomes Acessíveis** | 4.1.2 (Nome, Função, Valor) | Todo elemento interativo (ícones de fechar, botões de ação) possui nome acessível discernível por tecnologias assistivas via texto visível ou `aria-label`. | Zero bloqueios |
| **4. Labels em Formulários** | 3.3.2 (Rótulos ou Instruções) e 1.3.1 | Todo campo `<input>`, `<select>`, `<textarea>` possui `<label>` associado programaticamente via atributo `for`/`id` ou `aria-labelledby`. | Zero bloqueios |
| **5. Contraste de Cores** | 1.4.3 (Contraste Mínimo) | Relação de contraste $\ge 4.5:1$ para texto regular e $\ge 3:0:1$ para texto grande e componentes gráficos de interface. | Zero bloqueios |
| **6. Leitor de Tela** | 1.3.1 (Informações e Relações) e 4.1.3 (Mensagens de Status) | Uso de landmarks semânticos (`main`, `nav`, `header`), hierarquia de títulos correta (`h1` a `h3`) e `aria-live="polite"` para alertas dinâmicos. | Zero bloqueios |
| **7. Ausência de Bloqueios** | Princípio da Robustez | Nenhuma violação categorizada como *Critical* ou *Serious* pelo motor do axe-core nas jornadas primárias. | Bloqueio de merge |

---

## 2. Matriz de Telas Críticas x SPECs Auditadas

| Módulo / Jornada | Telas Críticas Auditadas | SPECs Vinculadas | Principais Componentes sob Teste |
|---|---|---|---|
| **Autenticação e Sessão** | Tela de Login, Recuperação de Senha e Seleção de Perfil | `SPEC-AUTH-001..004` | Formulário de credenciais, mensagem de erro de login, toggle de visibilidade de senha, seletor de perfil. |
| **Projetos Integradores** | Dashboard da Equipe, Envio de Entregáveis e Consulta de Notas | `SPEC-PI-001..004` | Modal de upload de arquivos, tabela de notas das bancas, botões de ação e alertas de prazos. |
| **Atividades de Extensão** | Catálogo de Editais, Inscrição e Validação de Certificado | `SPEC-EXT-001..003` | Formulário de inscrição, badge de status de vagas, leitor/input de QR Code e consulta pública de certificado. |
| **Portal Institucional** | Vitrine Pública de Projetos e Painel de Métricas de Impacto | `SPEC-PORTAL-001..002` | Cards de projetos com links externos, gráficos acessíveis com alternativas textuais (`aria-describedby`), filtros de busca. |

---

## 3. Matriz de Casos de Teste de Acessibilidade

| ID | Cenário | Passos de Teste | Resultado Esperado |
|---|---|---|---|
| **TC-WCAG-01** | Ciclo Completo de Tabulação no Login | Navegar na tela de Login apenas com a tecla `Tab` | O foco percorre: Logo $\to$ Campo E-mail $\to$ Campo Senha $\to$ Botão Revelar Senha $\to$ Link "Esqueci a senha" $\to$ Botão "Entrar". O foco nunca se perde ou fica invisível. |
| **TC-WCAG-02** | Indicador de Foco em Modais de Upload | Abrir modal de submissão de entregável no PI e pressionar `Tab` | O foco é direcionado para dentro do modal (foco preso ao modal aberto / *focus trap* intencional). Ao pressionar `Esc`, o modal fecha e o foco retorna ao botão de disparo. |
| **TC-WCAG-03** | Validação de Contraste em Botões Primários e Secundários | Inspecionar relação de contraste das cores do design system UniSENAI | Botões com texto e fundo satisfazendo no mínimo 4.5:1 em repouso e em estado de `:hover`/`:focus`. |
| **TC-WCAG-04** | Leitura de Erros de Formulário por Tecnologias Assistivas | Submeter formulário de inscrição em atividade com campos vazios | Mensagem de erro lida imediatamente pelo leitor de tela sem necessidade de mover o cursor manualmente (`aria-live="assertive"` ou `role="alert"`). |
| **TC-WCAG-05** | Nomes Acessíveis em Ícones Interativos de Download/Visualização | Inspecionar botões de download e exclusão de entregáveis e certificados | Botões sem texto visível possuem `aria-label="Baixar entregável"` ou `aria-label="Excluir arquivo"`. Nenhum botão é anunciado como "botão não rotulado". |

