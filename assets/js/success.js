// Página de sucesso: confirma visualmente e limpa o carrinho.
// A confirmação oficial do pagamento vem do webhook do Stripe (nunca do redirect).
import { clearCart, loadCart } from './cart.js';
import { track } from './analytics.js';
import { initAnalytics } from './analytics.js';

function boot() {
  initAnalytics();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const ref = document.getElementById('order-session-ref');
  if (ref) ref.innerText = sessionId ? `Referência: ${sessionId.slice(0, 24)}…` : '';

  loadCart();
  clearCart();
  track('checkout_success', { session_id: sessionId || undefined });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
