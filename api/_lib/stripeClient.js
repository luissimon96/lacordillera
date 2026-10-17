// Inicialização preguiçosa do cliente Stripe. Chaves SEMPRE por variável de ambiente.
let cached = null;

function getStripe() {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada');
  // Requerido apenas em runtime; mantém o módulo leve para os testes locais.
  const Stripe = require('stripe');
  cached = new Stripe(key, { apiVersion: '2024-06-20' });
  return cached;
}

module.exports = { getStripe };
