#!/usr/bin/env node
// Proxy HTTP mínimo para chamar a API Generative Language (Gemini)
// Sem dependências externas para facilitar execução local.

const http = await import('node:http');
const { URL } = await import('node:url');
const fs = await import('node:fs');
const path = await import('node:path');
const { env } = process;

// Carrega .env local (opcional) na pasta do backend para facilitar desenvolvimento
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, { encoding: 'utf8' });
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Não sobrescreve variáveis já fornecidas pelo ambiente
      if (!process.env[key]) process.env[key] = val;
    });
  }
} catch (e) {
  console.warn('Falha ao carregar .env local:', e?.message || e);
}

const PORT = parseInt(env.PORT || process.env.PORT || '3000', 10);
const GEMINI_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
const MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash-preview-09-2025';

if (!GEMINI_KEY) {
  console.warn('Atenção: variável de ambiente GEMINI_API_KEY não definida. O endpoint iniciará, mas chamadas ao Gemini falharão.');
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*', // Em produção restrinja este valor
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(payload);
}

async function callGemini(prompt, base64Data, mimeType) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY não configurada no servidor');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
        ]
      }
    ]
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000); // 30s

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Gemini API retornou ${resp.status}: ${body}`);
    }

    const json = await resp.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || null;
    return { raw: json, text };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (url.pathname === '/analyze' && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;

      if (!body) return sendJson(res, 400, { error: 'Body vazio' });

      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        return sendJson(res, 400, { error: 'JSON inválido' });
      }

      const { prompt, image, mimeType } = data;
      if (!prompt || typeof prompt !== 'string') return sendJson(res, 400, { error: 'Campo `prompt` obrigatório' });
      if (!image || typeof image !== 'string') return sendJson(res, 400, { error: 'Campo `image` (base64) obrigatório' });

      // Proteção simples: limitar tamanho base64 (ex: 6MB base64 ~ 4.5MB bin)
      if (image.length > 6 * 1024 * 1024) return sendJson(res, 413, { error: 'Image demasiado grande' });

      const result = await callGemini(prompt, image, mimeType);
      return sendJson(res, 200, { ok: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error('Erro em /analyze:', err);
      return sendJson(res, 500, { error: err.message || String(err) });
    }
  }

  // Root: instruções rápidas
  if (url.pathname === '/' && req.method === 'GET') {
    return sendJson(res, 200, { message: 'Proxy Gemini ativo. POST /analyze { prompt, image (base64), mimeType? }' });
  }

  // Ping para checar saúde do serviço (não aciona Gemini)
  if (url.pathname === '/ping' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, service: 'gemini-proxy', node: process.version });
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Backend proxy iniciado em http://localhost:${PORT} (NODE ${process.version})`);
});
