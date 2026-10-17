// Registro de pedidos. Implementação em memória (efêmera no serverless).
// TODO: trocar por banco persistente (ex.: Vercel KV/Postgres) antes de produção,
// para idempotência real do webhook e histórico de pedidos.
const paid = new Map();

function newOrderId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LC-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

function recordPaidOrder(orderId, order) {
  if (paid.has(orderId)) return { duplicate: true };
  paid.set(orderId, { ...order, paidAt: new Date().toISOString() });
  return { duplicate: false };
}

function isPaid(orderId) { return paid.has(orderId); }

module.exports = { newOrderId, recordPaidOrder, isPaid };
