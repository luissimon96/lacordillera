// Inicia o checkout: envia apenas { id, quantidade } + CEP ao servidor.
// NUNCA envia preços — o servidor recalcula tudo e devolve a URL da Stripe.
import { CONFIG } from './config.js';
import { getItems } from './cart.js';
import { onlyDigits } from './shipping.js';
import { track } from './analytics.js';
import { subtotal } from './cart.js';

export async function beginCheckout(cep) {
  const items = getItems().map((it) => ({ id: it.id, quantity: it.quantity }));
  if (items.length === 0) throw new Error('Carrinho vazio');

  track('begin_checkout', {
    currency: CONFIG.CURRENCY,
    value: subtotal(),
    items: items.map((it) => ({ item_id: it.id, quantity: it.quantity })),
  });

  const res = await fetch(`${CONFIG.API_BASE_URL}/api/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, cep: cep ? onlyDigits(cep) : null }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
  }
  window.location.href = data.url;
}
