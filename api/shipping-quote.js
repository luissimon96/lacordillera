// POST /api/shipping-quote — cota o frete no servidor (tabela por região/peso).
const { applyCors, handlePreflight } = require('./_lib/cors');
const { buildOrder, ValidationError } = require('./_lib/pricing');
const { readJsonBody, send } = require('./_lib/http');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    const body = await readJsonBody(req);
    const order = buildOrder(body);
    return send(res, 200, {
      region: order.region,
      shippingCents: order.shippingCents,
      freeShipping: order.freeShipping,
      subtotalCents: order.subtotalCents,
      totalCents: order.totalCents,
      units: order.units,
      weightKg: order.weightKg,
    });
  } catch (err) {
    const status = err instanceof ValidationError ? 400 : 500;
    if (status === 500) console.error('[shipping-quote] erro', err.message);
    return send(res, status, { error: err.message });
  }
};
