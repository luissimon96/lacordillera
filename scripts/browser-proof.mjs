// Prova em modo consumidor: sobe o _site num servidor local, abre num navegador
// Chromium headless (CDP) e interage como um usuário — adiciona vinhos, confere a
// caixa de 6, o carrinho, a gaveta e o FAQ. Sem dependências externas.
// Uso: npm run build && npm run proof:browser
// Sem navegador disponível → sai com 0 (skip) para não quebrar ambientes sem UI.
import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, statSync, createReadStream } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_site');
const DEBUG_PORT = 9333;
const TMP = join(tmpdir(), 'lc-edge-profile');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.css': 'text/css',
};

const CANDIDATES = {
  win32: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
};

function findBrowser() {
  const list = CANDIDATES[process.platform] || [];
  const found = list.find((p) => existsSync(p));
  if (found) return found;
  for (const bin of ['google-chrome', 'chromium', 'msedge']) {
    try {
      const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().split(/\r?\n/).find(Boolean);
      if (out) return out.trim();
    } catch { /* não existe */ }
  }
  return null;
}

const failures = [];
const ok = (cond, msg, extra) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}${!cond && extra !== undefined ? ` -> ${JSON.stringify(extra)}` : ''}`);
  if (!cond) failures.push(msg);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function serve() {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    const file = join(OUT, p === '/' ? 'index.html' : p);
    if (!file.startsWith(OUT) || !existsSync(file) || statSync(file).isDirectory()) {
      res.statusCode = 404; res.end('404'); return;
    }
    res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function waitForDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return res.json();
    } catch { /* ainda subindo */ }
    await sleep(500);
  }
  throw new Error('DevTools do navegador não respondeu');
}

const browser = findBrowser();
if (!browser) {
  console.log('proof:browser — nenhum Chromium/Edge encontrado; pulando (exit 0).');
  process.exit(0);
}
if (!existsSync(OUT)) {
  console.error('_site não existe — rode `npm run build` antes.');
  process.exit(1);
}

let seq = 0;
function makeSend(ws) {
  return (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMsg);
      msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const server = await serve();
const url = `http://127.0.0.1:${server.address().port}/`;
console.log(`proof:browser — servindo ${url} em ${browser}`);

rmSync(TMP, { recursive: true, force: true });
const proc = spawn(browser, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${TMP}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

let ws;
try {
  await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('nenhuma aba do navegador encontrada');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const send = makeSend(ws);

  const pageErrors = [];
  const consoleErrors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`eval falhou: ${r.exceptionDetails.text} :: ${expression}`);
    return r.result.value;
  };
  const waitFor = async (expression, label, timeoutMs = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await evaluate(expression)) return;
      await sleep(250);
    }
    throw new Error(`timeout esperando: ${label}`);
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  await waitFor('document.readyState === "complete"', 'load da página');

  ok(await evaluate('!document.getElementById("age-gate").classList.contains("hidden")'), 'age gate bloqueia visitante novo');
  await evaluate('document.getElementById("age-gate-confirm").click()');
  ok(await evaluate('!document.getElementById("age-gate")'), 'age gate some após confirmar 18+');

  await waitFor('document.querySelectorAll("#wines-container article").length === 12', '12 vinhos renderizados');
  ok(await evaluate('document.querySelectorAll("#wines-container article").length') === 12, 'renderiza 12 vinhos');
  ok(await evaluate('document.querySelectorAll("#combos-container article").length') === 3, 'renderiza 3 combos');
  ok(await evaluate('document.querySelector("#wines-container h3").textContent') === 'El Supremo Malbec', 'primeiro vinho correto');
  ok((await evaluate('document.querySelector("#combos-container .line-through").textContent')).includes('359,70'), 'preço de combo formatado em BRL');
  ok(await evaluate('document.getElementById("checkout-btn").disabled'), 'checkout desabilitado com carrinho vazio');

  await evaluate('(() => { const i = document.getElementById("cep-input"); i.value = "01310100"; i.dispatchEvent(new Event("input")); })()');
  ok(await evaluate('document.getElementById("cep-input").value') === '01310-100', 'máscara de CEP aplicada');

  for (let i = 0; i < 6; i++) {
    await evaluate('document.querySelector(\'[data-wine="wine-1"][data-delta="1"]\').click()');
  }
  await sleep(250);
  ok(await evaluate('document.getElementById("box-bottle-count").textContent') === '6', 'contador da caixa chega a 6');
  ok(await evaluate('document.getElementById("cart-badge-count").textContent') === '6', 'badge do carrinho mostra 6');
  ok(await evaluate('document.getElementById("shipping-status-badge").textContent') === 'FRETE GRÁTIS', 'badge de frete grátis liberado');
  ok(await evaluate('document.getElementById("cart-shipping-fee").textContent') === 'Grátis', 'frete exibido como Grátis');
  ok(await evaluate('document.getElementById("box-progress-bar").style.width') === '100%', 'barra de progresso em 100%');
  ok(await evaluate('JSON.parse(localStorage.getItem("la_cordillera_cart_v2"))[0].quantity') === 6, 'carrinho persistido no localStorage');
  ok(await evaluate('document.getElementById("box-slots-container").querySelectorAll("div").length') === 6, 'caixa mostra 6 slots');
  ok(await evaluate('!document.getElementById("checkout-btn").disabled'), 'checkout habilitado com itens');

  await evaluate('document.querySelector(\'[data-add-combo="combo-1"]\').click()');
  await sleep(250);
  ok(await evaluate('document.getElementById("cart-badge-count").textContent') === '7', 'combo soma 1 item (total 7)');
  ok(await evaluate('document.querySelectorAll("#cart-items-list > div").length') === 2, 'carrinho lista 2 linhas distintas');
  ok((await evaluate('document.getElementById("cart-subtotal").textContent')).replace(/\s/g, '').includes('1.019,30'), 'subtotal calculado corretamente');

  ok(await evaluate('document.getElementById("cart-drawer").hasAttribute("inert")'), 'gaveta fechada está inert');
  await evaluate('document.querySelector("[data-toggle-cart]").click()');
  await sleep(450);
  ok(await evaluate('!document.getElementById("cart-drawer").classList.contains("translate-x-full")'), 'gaveta abre ao clicar no carrinho');
  ok(await evaluate('!document.getElementById("cart-drawer").hasAttribute("inert")'), 'gaveta aberta é focável');

  await evaluate('document.querySelector(\'[data-remove="combo-1"]\').click()');
  await sleep(250);
  ok(await evaluate('document.getElementById("cart-badge-count").textContent') === '6', 'remoção do combo volta para 6');

  await evaluate('document.querySelector("[data-faq-question]").click()');
  ok(await evaluate('document.querySelector("[data-faq-question]").getAttribute("aria-expanded")') === 'true', 'FAQ expande com aria-expanded');

  ok(pageErrors.length === 0, 'nenhuma exceção de página', pageErrors);
  const relevant = consoleErrors.filter((e) => !/tailwind|cdn|net::ERR|Failed to load resource|viacep/i.test(e));
  ok(relevant.length === 0, 'nenhum erro de console relevante', relevant);

  const statuses = await evaluate(`(async () => {
    const urls = ['', 'assets/js/main.js', 'assets/js/catalog.js', 'assets/js/box.js', 'assets/js/cart.js',
      'assets/js/data.js', 'assets/js/ui.js', 'assets/js/shipping.js', 'assets/js/checkout.js',
      'assets/js/analytics.js', 'assets/js/config.js', 'data/products.json', 'favicon.svg'];
    const out = {};
    for (const u of urls) { const r = await fetch(u); out[u || 'index'] = r.status; }
    return out;
  })()`);
  const bad = Object.entries(statuses).filter(([, s]) => s !== 200);
  ok(bad.length === 0, 'todos os assets carregam com 200', bad);
} catch (err) {
  failures.push(err.message);
  console.error('ERRO:', err.message);
} finally {
  try { if (ws) ws.close(); } catch { /* noop */ }
  try { execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* noop */ }
  try { proc.kill(); } catch { /* noop */ }
  server.close();
  await sleep(1000);
  try { rmSync(TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch { /* perfil preso */ }
}

console.log(failures.length === 0 ? '\nPROVA NO NAVEGADOR: OK' : `\n${failures.length} FALHA(S): ${failures.join(' | ')}`);
process.exit(failures.length === 0 ? 0 : 1);
