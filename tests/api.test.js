// Testes da precificação/frete do servidor (fonte: data/products.json real).
// Sem rede: rodam contra o catálogo em disco, como em produção.
const test = require('node:test');
const assert = require('node:assert/strict');

const { buildOrder, ValidationError } = require('../api/_lib/pricing');
const { CATALOG } = require('../api/_lib/catalog');
const { buildEmailBody } = require('../api/_lib/email');

const WINE = CATALOG.wines[0];
const COMBO = CATALOG.combos[0];

test('recalcula o subtotal a partir do catálogo e ignora preço enviado pelo cliente', () => {
  const order = buildOrder({
    items: [{ id: WINE.id, quantity: 2, price: 0.01 }],
    cep: '01310100',
  });
  assert.equal(order.subtotalCents, Math.round(WINE.price * 100) * 2);
  assert.equal(order.units, 2);
});

test('frete grátis a partir de 6 itens somando avulsos', () => {
  const order = buildOrder({ items: [{ id: WINE.id, quantity: 6 }], cep: '01310100' });
  assert.equal(order.freeShipping, true);
  assert.equal(order.shippingCents, 0);
  assert.equal(order.totalCents, order.subtotalCents);
});

test('combo conta como 1 item e entra no frete grátis com 6 unidades', () => {
  const order = buildOrder({
    items: [{ id: COMBO.id, quantity: 6 }],
    cep: '01310100',
  });
  assert.equal(order.units, 6);
  assert.equal(order.freeShipping, true);
  assert.equal(order.subtotalCents, Math.round(COMBO.promoPrice * 100) * 6);
});

test('5 itens não têm frete grátis e o frete é cobrado', () => {
  const order = buildOrder({ items: [{ id: WINE.id, quantity: 5 }], cep: '01310100' });
  assert.equal(order.freeShipping, false);
  assert.ok(order.shippingCents > 0);
  assert.equal(order.totalCents, order.subtotalCents + order.shippingCents);
});

test('frete varia por região do CEP', () => {
  const sp = buildOrder({ items: [{ id: WINE.id, quantity: 1 }], cep: '01310100' });
  const norte = buildOrder({ items: [{ id: WINE.id, quantity: 1 }], cep: '66000000' });
  assert.equal(sp.region, 'Sudeste (SP)');
  assert.ok(norte.shippingCents > sp.shippingCents);
});

test('peso acima de 3kg adiciona taxa por quilo excedente', () => {
  const single = buildOrder({ items: [{ id: WINE.id, quantity: 1 }], cep: '01310100' });
  const many = buildOrder({ items: [{ id: WINE.id, quantity: 5 }], cep: '01310100' });
  assert.ok(many.weightKg > single.weightKg);
  assert.ok(many.shippingCents > single.shippingCents);
});

test('rejeita produto desconhecido', () => {
  assert.throws(
    () => buildOrder({ items: [{ id: 'wine-inexistente', quantity: 1 }], cep: '01310100' }),
    ValidationError,
  );
});

test('rejeita carrinho vazio', () => {
  assert.throws(() => buildOrder({ items: [], cep: '01310100' }), ValidationError);
});

test('rejeita quantidade inválida', () => {
  assert.throws(
    () => buildOrder({ items: [{ id: WINE.id, quantity: 0 }], cep: '01310100' }),
    ValidationError,
  );
  assert.throws(
    () => buildOrder({ items: [{ id: WINE.id, quantity: -3 }], cep: '01310100' }),
    ValidationError,
  );
});

test('rejeita CEP inválido', () => {
  assert.throws(() => buildOrder({ items: [{ id: WINE.id, quantity: 1 }], cep: '123' }), ValidationError);
});

test('soma quantidades repetidas do mesmo id', () => {
  const order = buildOrder({
    items: [
      { id: WINE.id, quantity: 2 },
      { id: WINE.id, quantity: 1 },
    ],
    cep: '01310100',
  });
  assert.equal(order.units, 3);
  assert.equal(order.lines.length, 1);
});

test('o catálogo é íntegro: ids únicos, preços, pesos e combos válidos', () => {
  const ids = new Set();
  for (const w of CATALOG.wines) {
    assert.ok(!ids.has(w.id), `id duplicado: ${w.id}`);
    ids.add(w.id);
    assert.ok(w.price > 0, `preço inválido em ${w.id}`);
    assert.ok(w.weightKg > 0, `peso inválido em ${w.id}`);
  }
  for (const c of CATALOG.combos) {
    assert.ok(!ids.has(c.id), `id duplicado: ${c.id}`);
    ids.add(c.id);
    assert.ok(c.promoPrice > 0 && c.promoPrice < c.originalPrice, `preço inválido em ${c.id}`);
    assert.ok(c.weightKg > 0, `peso inválido em ${c.id}`);
    for (const item of c.contains) {
      assert.ok(ids.has(item.id), `combo ${c.id} referencia vinho inexistente ${item.id}`);
    }
  }
});

test('o catálogo não contém texto corrompido (mojibake)', () => {
  const blob = JSON.stringify(CATALOG);
  assert.ok(!/\ufffd/.test(blob), 'caractere de substituição encontrado');
  assert.ok(!/[\u00c3\u00c2][\u0080-\u00bf\u20ac]/.test(blob), 'sequência mojibake encontrada');
  assert.ok(!/â€|Ã¡|Ã©|Ã³|Ã§/.test(blob), 'texto duplamente codificado encontrado');
});

test('e-mail de notificação resume o pedido sem quebrar', () => {
  const order = buildOrder({ items: [{ id: WINE.id, quantity: 6 }], cep: '01310100' });
  const body = buildEmailBody({
    ...order,
    orderId: 'LC-TESTE',
    lines: order.lines.map((l) => ({ ...l, name: l.name })),
  });
  assert.match(body, /LC-TESTE/);
  assert.match(body, /Frete: Grátis/);
});
