# Caso de teste de exemplo – Login de usuário

- Issue: #4
- SPEC / critério de aceite: SPEC-AUTH-002 – Autenticação via email/senha
- Baseline de governança: https://github.com/UniSENAI-Sorocaba/plataforma-governance/blob/main/_KB/specs/SPEC-AUTH-002.md
- Pré‑condições e dados sintéticos: CPF `111.222.333-44` com senha `Senha123!` já criado na base de testes.
- Ambiente: dev – versão 1.2.3
- Owner: Bianca Cirilo
- Severidade: Baixa
- Reproduzibilidade: Fácil

## Passos
1. Acessar `https://dev.example.com/login`.
2. Inserir cpf `111.222.333-44` e senha `Senha123!`.
3. Clicar em **Entrar**.

## Resultado esperado
- Redirecionamento para a dashboard.
- Header HTTP `200 OK`.
- JSON da sessão contendo "status":"ok".

## Evidência esperada
- Tipo: screenshot
- Localização: `evidencias/login_success.png`

