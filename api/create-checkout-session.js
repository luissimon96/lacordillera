// POST /api/create-checkout-session
// Recebe apenas { items:[{id,quantidade}], cep }. NUNCA aceita preços do cliente:
// recalcula subtotal/desconto/frete aqui e cria a Stripe Checkout Session.
const { applyCors, handlePreflight } = require('./_lib/cors');
const { buildOrder, ValidationError } = require('./_lib/pricing');
const { readJsonBody, send } = require('./_lib/http');
const { getStripe } = require('./_lib/stripeClient');
const { newOrderId } = require('./_lib/order');

const SITE_URL = process.env.SITE_URL || 'https://luissimon96.github.io/lacordillera';

module.exports = async (req, res) => {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  let order;
  let stripe;
  try {
    const body = await readJsonBody(req);
    order = buildOrder(body);
    stripe = getStripe();
  } catch (err) {
    const status = err instanceof ValidationError ? 400 : 500;
    if (status === 500) console.error('[checkout] setup', err.message);
    return send(res, status, { error: err.message });
  }

  const orderId = newOrderId();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'brl',
      payment_method_types: ['card', 'pix'],
      line_items: order.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'brl',
          unit_amount: l.unitCents,
          product_data: { name: l.name },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: order.freeShipping ? 'Frete grátis (caixa de 6)' : `Frete — ${order.region}`,
            fixed_amount: { amount: order.shippingCents, currency: 'brl' },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ['BR'] },
      // Nome, telefone e CPF coletados no checkout (e-mail é coletado por padrão).
      custom_fields: [
        { key: 'nome', label: { type: 'custom', custom: 'Nome completo' }, type: 'text' },
        { key: 'telefone', label: { type: 'custom', custom: 'Telefone (WhatsApp)' }, type: 'text' },
        { key: 'cpf', label: { type: 'custom', custom: 'CPF (só números)' }, type: 'numeric' },
      ],
      metadata: {
        order_id: orderId,
        cep: order.cep || '',
        units: String(order.units),
        region: order.region,
      },
      success_url: `${SITE_URL}/sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancelado.html`,
    });

    return send(res, 200, { url: session.url, orderId });
  } catch (err) {
    console.error('[checkout] stripe', err.message);
    return send(res, 502, { error: 'Falha ao criar a sessão de pagamento.' });
  }
};
