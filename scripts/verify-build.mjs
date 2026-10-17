// Verifica o artefato publicado (_site) antes do deploy: arquivos presentes,
// nada de vazamento de fonte, JSON-LD válido e ausência de texto corrompido.
// Uso: npm run proof:build   (exige `npm run build` antes)
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_site');

const required = [
  'index.html', 'sucesso.html', 'cancelado.html', '404.html',
  'favicon.svg', 'robots.txt', 'sitemap.xml', '.nojekyll',
  'assets/js/main.js', 'assets/js/catalog.js', 'assets/js/box.js', 'assets/js/success.js',
  'data/products.json', 'pages/prazos.html', 'pages/troca-devolucao.html',
  'pages/termos.html', 'pages/privacidade.html',
];
const forbidden = ['node_modules', 'api', 'tests', 'scripts', 'package.json', 'vercel.json', '.github'];

let failuresTheCount = 0;
const ok = (cond, msg, extra) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}${!cond && extra !== undefined ? ` -> ${JSON.stringify(extra)}` : ''}`);
  if (!cond) failuresTheCount++;
};

if (!existsSync(OUT)) {
  console.error('_site não existe — rode `npm run build` antes.');
  process.exit(1);
}

for (const f of required) ok(existsSync(join(OUT, f)), `existe ${f}`);
for (const f of forbidden) ok(!existsSync(join(OUT, f)), `não vaza para o site: ${f}`);

const html = readFileSync(join(OUT, 'index.html'), 'utf8');
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
ok(!!match, 'JSON-LD injetado em index.html');
if (match) {
  const ld = JSON.parse(match[1]);
  const items = ld.hasOfferCatalog?.itemListElement || [];
  ok(ld['@type'] === 'WineStore', 'JSON-LD @type = WineStore');
  ok(items.length === 15, `JSON-LD com 15 produtos (achou ${items.length})`);
  ok(items.every((i) => i.itemOffered?.offers?.price), 'todo produto do JSON-LD tem preço');
}

const catalog = JSON.parse(readFileSync(join(OUT, 'data/products.json'), 'utf8'));
ok(catalog.wines.length === 12 && catalog.combos.length === 3, 'catálogo íntegro dentro do site');

const TEXT_EXT = new Set(['.html', '.js', '.json', '.xml', '.txt', '.svg']);
const corrupted = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!TEXT_EXT.has(extname(p)) || !statSync(p).isFile()) continue;
    if (/\ufffd|â€|Ã¡|Ã©|Ã³|Ã§/.test(readFileSync(p, 'utf8'))) corrupted.push(p.replace(ROOT, ''));
  }
};
walk(OUT);
ok(corrupted.length === 0, 'sem texto corrompido (mojibake) no build', corrupted);

console.log(failuresTheCount === 0 ? '\nARTEFATO OK' : `\n${failuresTheCount} FALHA(S)`);
process.exit(failuresTheCount === 0 ? 0 : 1);
