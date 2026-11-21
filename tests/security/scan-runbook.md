# Security release gate

Executar no artefato imutável da release, a partir da raiz do workspace:

```bash
mvn --batch-mode verify                 # SAST/coverage do backend
npm audit --audit-level=high             # dependências do frontend/quality
terraform -chdir=plataforma-infrastructure/environments/production validate
trivy image --severity HIGH,CRITICAL IMAGE_REF
docker run --rm -t owasp/zap2docker-stable zap-baseline.py -t "$BASE_URL" -r zap.html
```

Critérios: nenhum HIGH/CRITICAL sem exceção documentada, endpoint de saúde público respondendo e relatório anexado à evidência da release. Os scans de imagem/DAST só são considerados executados quando houver `IMAGE_REF` e `BASE_URL` de staging reais; comandos não executados não devem ser reportados como aprovados.
