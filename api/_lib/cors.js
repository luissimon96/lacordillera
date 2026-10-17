// CORS restrito à(s) origem(ns) do site. Configure SITE_ORIGINS (separado por vírgula)
// em produção; o default cobre o GitHub Pages atual.
const DEFAULT_ORIGINS = ['https://luissimon96.github.io'];

function allowedOrigins() {
  const extra = (process.env.SITE_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

module.exports = { applyCors, handlePreflight, allowedOrigins };
