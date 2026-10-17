// Testes de integração das funções serverless: chamamos o handler real com
// requisição/resposta simuladas (sem rede e sem Stripe) para provar o contrato HTTP.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const shippingQuote = require('../api/shipping-quote');
const createCheckout = require('../api/create-checkout-session');
const { CATALOG } = require('../api/_lib/catalog');

function mockReq({ method = 'POST', headers = {}, body } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.headers = headers;
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(body));
    req.emit('end');
  });
  return req;
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    json: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(payload) {
      this.json = payload ? JSON.parse(payload) : null;
    },
  };
}

async function call(handler, opts) {
  const req = mockReq(opts);
  const res = mockRes();
  await handler(req, res);
  return res;
}

const ORIGIN = 'https://luissimon96.github.io';
const json = (obj) => JSON.stringify(obj);

test('shipping-quote: cota o frete e devolve CORS para a origem do site', async () => {
  const res = await call(shippingQuote, {
    headers: { origin: ORIGIN, 'content-type': 'application/json' },
    body: json({ items: [{ id: CATALOG.wines[0].id, quantity: 1 }], cep: '01310100' }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['access-control-allow-origin'], ORIGIN);
  assert.ok(res.json.shippingCents > 0);
  assert.equal(res.json.freeShipping, false);
  assert.equal(res.json.region, 'Sudeste (SP)');
});

test('shipping-quote: caixa de 6 itens zera o frete', async () => {
  const res = await call(shippingQuote, {
    headers: { origin: ORIGIN },
    body: json({ items: [{ id: CATALOG.combos[0].id, quantity: 6 }], cep: '01310100' }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.freeShipping, true);
  assert.equal(res.json.shippingCents, 0);
});

test('shipping-quote: responde ao preflight com 204', async () => {
  const res = await call(shippingQuote, { method: 'OPTIONS', headers: { origin: ORIGIN } });
  assert.equal(res.statusCode, 204);
});

test('shipping-quote: rejeita método diferente de POST', async () => {
  const res = await call(shippingQuote, { method: 'GET', headers: { origin: ORIGIN } });
  assert.equal(res.statusCode, 405);
});

test('shipping-quote: rejeita item inexistente com 400', async () => {
  const res = await call(shippingQuote, {
    headers: { origin: ORIGIN },
    body: json({ items: [{ id: 'wine-fantasma', quantity: 1 }], cep: '01310100' }),
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.json.error, /desconhecido/i);
});

test('shipping-quote: não libera CORS para origem estranha', async () => {
  const res = await call(shippingQuote, {
    headers: { origin: 'https://site-malicioso.example' },
    body: json({ items: [{ id: CATALOG.wines[0].id, quantity: 1 }], cep: '01310100' }),
  });
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('checkout: valida o carrinho antes de falar com o Stripe (400)', async () => {
  const res = await call(createCheckout, {
    headers: { origin: ORIGIN },
    body: json({ items: [], cep: '01310100' }),
  });
  assert.equal(res.statusCode, 400);
});

test('checkout: sem STRIPE_SECRET_KEY falha de forma explícita (500)', async () => {
  const saved = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    const res = await call(createCheckout, {
      headers: { origin: ORIGIN },
      body: json({ items: [{ id: CATALOG.wines[0].id, quantity: 1 }], cep: '01310100' }),
    });
    assert.equal(res.statusCode, 500);
    assert.match(res.json.error, /STRIPE_SECRET_KEY/);
  } finally {
    if (saved !== undefined) process.env.STRIPE_SECRET_KEY = saved;
  }
});
