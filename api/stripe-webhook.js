// POST /api/stripe-webhook
// Valida a assinatura, marca o pedido como pago SOMENTE aqui (nunca pelo redirect
// do navegador) e notifica a loja por e-mail.
const { readRawBody, send } = require('./_lib/http');
const { getStripe } = require('./_lib/stripeClient');
const { recordPaidOrder } = require('./_lib/order');
const { notifyStore } = require('./_lib/email');

// Precisa do corpo cru para validar a assinatura do Stripe.
module.exports.config = { api: { bodyParser: false } };

function extractCustomFields(session) {
  const out = {};
  for (const f of session.custom_fields || []) {
    const value = f.text?.value ?? f.numeric?.value ?? null;
    if (value != null) out[f.key] = value;
  }
  return out;
}

function formatAddress(addr) {
  if (!addr) return '';
  const p = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
  return p.join(', ');
}

async function sessionToOrder(stripe, session) {
  const custom = extractCustomFields(session);
  const details = session.customer_details || {};
  let lineItems = [];
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
    lineItems = (full.line_items?.data || []).map((li) => ({
      name: li.description || 'Item',
      quantity: li.quantity || 1,
      unitCents: li.amount_subtotal ? Math.round(li.amount_subtotal / (li.quantity || 1)) : (li.amount_total || 0),
    }));
  } catch (err) {
    console.error('[webhook] não foi possível expandir line_items', err.message);
  }

  const shippingCents = (session.total_details?.amount_shipping || 0);
  return {
    orderId: session.metadata?.order_id || session.id,
    totalCents: session.amount_total || 0,
    subtotalCents: (session.amount_subtotal || 0) - shippingCents,
    shippingCents,
    freeShipping: shippingCents === 0,
    currency: session.currency,
    lines: lineItems,
    customer: {
      name: custom.nome || details.name || '',
      email: details.email || '',
      phone: custom.telefone || details.phone || '',
      cpf: custom.cpf || '',
      address: formatAddress(session.shipping_details?.address || details.address),
    },
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const signature = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET ausente');
    return send(res, 500, { error: 'Webhook não configurado' });
  }

  let event;
  let stripe;
  try {
    stripe = getStripe();
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[webhook] assinatura inválida:', err.message);
    return send(res, 400, { error: 'Assinatura inválida' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const order = await sessionToOrder(stripe, session);
        const { duplicate } = recordPaidOrder(order.orderId, order);
        if (duplicate) {
          console.log('[webhook] pedido já registrado (idempotente):', order.orderId);
        } else {
          await notifyStore(order);
          console.log('[webhook] pedido pago:', order.orderId);
        }
        break;
      }
      case 'checkout.session.async_payment_failed':
        console.warn('[webhook] pagamento assíncrono falhou:', event.data.object.id);
        break;
      default:
        break;
    }
    return send(res, 200, { received: true });
  } catch (err) {
    console.error('[webhook] erro ao tratar evento:', err.message);
    return send(res, 500, { error: 'Erro interno' });
  }
};
