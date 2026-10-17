// Precificação autoritativa: valida itens, recalcula subtotal/desconto/peso/frete.
// Toda a matemática do pedido vive aqui — nunca no cliente.
const { getProduct, freeShippingUnits } = require('./catalog');
const { computeShippingCents } = require('./shipping');

const MAX_QTY_PER_ITEM = 99;
const MAX_TOTAL_ITEMS = 100;

class ValidationError extends Error {}

function normalizeItems(input) {
  if (!Array.isArray(input) || input.length === 0) throw new ValidationError('Carrinho vazio.');
  if (input.length > 50) throw new ValidationError('Itens demais no pedido.');
  const seen = new Map();
  for (const it of input) {
    if (!it || typeof it.id !== 'string') throw new ValidationError('Item inválido.');
    if (!getProduct(it.id)) throw new ValidationError(`Produto desconhecido: ${it.id}`);
    const qty = Math.floor(Number(it.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) throw new ValidationError('Quantidade inválida.');
    seen.set(it.id, (seen.get(it.id) || 0) + qty);
  }
  const items = [...seen.entries()].map(([id, quantity]) => ({ id, quantity }));
  const total = items.reduce((s, it) => s + it.quantity, 0);
  if (total > MAX_TOTAL_ITEMS) throw new ValidationError('Quantidade total acima do permitido.');
  return items;
}

/**
 * Monta o pedido com valores do servidor.
 * @param {{items:Array, cep?:string}} payload
 */
function buildOrder(payload) {
  const items = normalizeItems(payload && payload.items);
  const cep = payload && payload.cep ? String(payload.cep).replace(/\D/g, '') : null;

  let subtotalCents = 0;
  let discountCents = 0;
  let weightKg = 0;
  let units = 0;

  const lines = items.map((it) => {
    const p = getProduct(it.id);
    const unitCents = Math.round(p.unitPrice * 100);
    subtotalCents += unitCents * it.quantity;
    weightKg += (p.weightKg || 0) * it.quantity;
    units += it.quantity;
    if (p.isCombo) discountCents += Math.round((p.originalPrice - p.promoPrice) * 100) * it.quantity;
    return {
      id: p.id,
      name: p.name,
      quantity: it.quantity,
      unitCents,
      weightKg: p.weightKg || 0,
      isCombo: !!p.isCombo,
    };
  });

  const freeShipping = units >= freeShippingUnits();
  const ship = computeShippingCents({ cep, weightKg, freeShipping });
  if (!ship) throw new ValidationError('CEP inválido ou fora da área de entrega.');

  return {
    lines,
    cep,
    units,
    weightKg: Math.round(weightKg * 100) / 100,
    subtotalCents,
    discountCents,
    shippingCents: ship.shippingCents,
    region: ship.region,
    freeShipping,
    totalCents: subtotalCents + ship.shippingCents,
  };
}

module.exports = { buildOrder, ValidationError };
