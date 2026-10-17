// Notificação da loja sobre pedido pago.
// Usa Resend quando RESEND_API_KEY existe; caso contrário apenas registra no log
// (nunca quebra o webhook por ausência de e-mail).
function formatBRL(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
}

function buildEmailBody(order) {
  const lines = (order.lines || [])
    .map((l) => `- ${l.quantity}x ${l.name} (${formatBRL(l.unitCents * l.quantity)})`)
    .join('\n');
  return [
    `Novo pedido pago: ${order.orderId}`,
    '',
    'Itens:',
    lines,
    '',
    `Subtotal: ${formatBRL(order.subtotalCents)}`,
    `Frete: ${order.freeShipping ? 'Grátis' : formatBRL(order.shippingCents)}`,
    `Total: ${formatBRL(order.totalCents)}`,
    '',
    `Cliente: ${order.customer?.name || '-'}`,
    `E-mail: ${order.customer?.email || '-'}`,
    `Telefone: ${order.customer?.phone || '-'}`,
    `CPF: ${order.customer?.cpf || '-'}`,
    `Endereço: ${order.customer?.address || '-'}`,
  ].join('\n');
}

async function notifyStore(order) {
  const to = process.env.STORE_NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const body = buildEmailBody(order);

  if (!apiKey || !to) {
    console.log('[order] e-mail não enviado (RESEND_API_KEY/STORE_NOTIFY_EMAIL ausentes). Resumo:', order.orderId);
    return { sent: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.STORE_FROM_EMAIL || 'La Cordillera <onboarding@resend.dev>',
      to: [to],
      subject: `Pedido pago ${order.orderId} — ${formatBRL(order.totalCents)}`,
      text: body,
    }),
  });
  if (!res.ok) {
    console.error('[order] falha ao enviar e-mail', res.status);
    return { sent: false };
  }
  return { sent: true };
}

module.exports = { notifyStore, buildEmailBody };
