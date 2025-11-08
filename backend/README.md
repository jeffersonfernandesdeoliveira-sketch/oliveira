# Backend proxy minimal (Node)

Este pequeno servidor Node recebe requisições POST em /analyze com um JSON contendo `prompt`, `image` (base64) e `mimeType` (opcional). O servidor chama a API Generative Language (Gemini) usando a variável de ambiente `GEMINI_API_KEY` e retorna o texto extraído.

Como usar (desenvolvimento):

1. Copie `.env.example` para `.env` e preencha `GEMINI_API_KEY`, ou exporte a variável diretamente no ambiente.
2. Rode o servidor (ex.: em background):

```bash
# usando variável de ambiente
GEMINI_API_KEY="sua_chave_aqui" node server.js

# ou 1) copiar .env.example -> .env e 2) executar
node server.js
```

3. Exemplo de request (curl):

```bash
curl -s -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Transcreva o texto","image":"<BASE64>","mimeType":"image/png"}'
```

Notas:
- Este proxy simples não implementa autenticação. Em produção, proteja o endpoint (auth, rate-limiting, CORS restrito).
- Recomendado rodar em Node >=18 (usa fetch nativo).
