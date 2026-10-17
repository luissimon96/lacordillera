// Inicia o checkout: envia apenas { id, quantidade } + CEP ao servidor.
// NUNCA envia preços — o servidor recalcula tudo e devolve a URL da Stripe.
// Com CHECKOUT_ENABLED=false (padrão até as chaves existirem) o pedido vai pelo WhatsApp.
import { CONFIG, formatBRL, whatsappLink } from './config.js';
import { getItems, subtotal } from './cart.js';
import { nameOf, freeShippingUnits } from './data.js';
import { onlyDigits } from './shipping.js';
import { track } from './analytics.js';

export function isCheckoutEnabled() {
  return CONFIG.CHECKOUT_ENABLED === true;
}

/** Resumo do carrinho em texto, para o fallback de WhatsApp e para o suporte. */
export function orderSummary(cep) {
  const lines = getItems().map((it) => `${it.quantity}x ${nameOf(it.id)}`);
  const total = formatBRL(subtotal());
  const cepLine = onlyDigits(cep || '') ? `\nCEP: ${onlyDigits(cep)}` : '';
  const shipping = getItems().reduce((sum, it) => sum + it.quantity, 0) >= freeShippingUnits()
    ? '\nFrete: grátis'
    : '';
  return `Olá! Quero finalizar meu pedido La Cordillera:\n${lines.join('\n')}\nSubtotal: ${total}${shipping}${cepLine}`;
}

export async function beginCheckout(cep) {
  const items = getItems().map((it) => ({ id: it.id, quantity: it.quantity }));
  if (items.length === 0) throw new Error('Carrinho vazio');

  track('begin_checkout', {
    currency: CONFIG.CURRENCY,
    value: subtotal(),
    items: items.map((it) => ({ item_id: it.id, quantity: it.quantity })),
  });

  if (!isCheckoutEnabled()) {
    // Fallback até as chaves existirem: novo aba com o resumo, sem perder o carrinho.
    const url = whatsappLink(orderSummary(cep));
    const opened = window.open(url, '_blank', 'noopener');
    if (!opened) window.location.href = url;
    return;
  }

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
