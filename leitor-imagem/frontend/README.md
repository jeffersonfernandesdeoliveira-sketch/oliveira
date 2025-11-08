# Frontend do Leitor de Imagens com Gemini

Este é o frontend da aplicação de análise de imagens usando a API Gemini.

## Deploy no Netlify

1. Faça o push do código para o GitHub
2. No Netlify:
   - Conecte com seu repositório GitHub
   - Configure o deploy:
     - Base directory: leitor-imagem/frontend
     - Build command: (deixe em branco)
     - Publish directory: leitor-imagem/frontend
3. Configure as variáveis de ambiente:
   - `__firebase_config`: Configuração do Firebase (JSON)
   - `__app_id`: ID da aplicação
   - `__backend_url`: URL do backend (ex: https://seu-backend.herokuapp.com/analyze)
   - `__backend_ping`: URL de ping do backend (ex: https://seu-backend.herokuapp.com/ping)

O arquivo `netlify.toml` já está configurado para lidar com rotas do SPA.