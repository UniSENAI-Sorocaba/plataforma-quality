# Defeito – Falha ao autenticar usuário

- Issue / AC relacionado: #4
- Ambiente e versão: dev – 1.2.3
- Severidade e prioridade: Alta – P0
- Pré‑condições: Usuário `test_user@example.com` já cadastrado.
- Passos para reproduzir:
  1. Acessar `https://dev.example.com/login`.
  2. Inserir email `test_user@example.com` e senha errada `wrongPass!`.
  3. Clicar em **Entrar**.
- Resultado observado: Mensagem de erro genérica e código HTTP 500.
- Resultado esperado: Mensagem de credenciais inválidas (HTTP 401).
- Evidência sem dados sensíveis: `evidencias/login_error.png`
- Owner sugerido: Bianca Cirilo

