// Guarda determinística da documentação de go-live: garante que os docs existem,
// que TODA variável de ambiente lida pelo código aparece em docs/GO-LIVE.md
// (achado clássico: env nova entra no código e o dono não sabe que precisa configurar)
// e que as pendências do dono têm prioridade. Roda contra os arquivos reais em disco.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GO_LIVE = path.join(ROOT, 'docs', 'GO-LIVE.md');
const PENDENCIAS = path.join(ROOT, 'docs', 'PENDENCIAS.md');
const API_DIR = path.join(ROOT, 'api');

function read(file) {
  assert.ok(fs.existsSync(file), `arquivo ausente: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

function envVarsUsed() {
  const found = new Set();
  for (const file of sourceFiles(API_DIR)) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      found.add(match[1]);
    }
  }
  return [...found].sort();
}

test('README, GO-LIVE e PENDENCIAS existem', () => {
  read(path.join(ROOT, 'README.md'));
  read(GO_LIVE);
  read(PENDENCIAS);
});

test('toda variável de ambiente do código está documentada no GO-LIVE', () => {
  const used = envVarsUsed();
  assert.ok(used.length >= 5, `esperava variáveis de ambiente no código, achei ${used.length}`);
  const doc = read(GO_LIVE);
  const missing = used.filter((name) => !doc.includes(name));
  assert.deepEqual(missing, [], `variáveis sem documentação: ${missing.join(', ')}`);
});

test('pendências do dono estão priorizadas (P1/P2/P3)', () => {
  const doc = read(PENDENCIAS);
  for (const level of ['P1', 'P2', 'P3']) {
    assert.ok(doc.includes(level), `docs/PENDENCIAS.md não menciona ${level}`);
  }
});
