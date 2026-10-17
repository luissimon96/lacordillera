// Renderiza o progresso da "caixa de 6" e a lista/totais do carrinho.
// Regra de frete grátis: 6 itens de qualquer tipo (avulsas + combos), conforme definido com a loja.
import { getData, nameOf, subtitleOf, priceOf, freeShippingUnits } from './data.js';
import { getItems, totalUnits, subtotal, hasFreeShipping } from './cart.js';
import { formatBRL } from './config.js';

let shippingDisplay = null; // texto do frete calculado no servidor (ou null)

export function setShippingDisplay(text) { shippingDisplay = text; }

function totalWithShipping() {
  if (hasFreeShipping()) return subtotal();
  return subtotal(); // o valor do frete é confirmado no servidor no checkout
}

export function renderBox() {
  const container = document.getElementById('box-slots-container');
  const units = totalUnits();
  const goal = freeShippingUnits();

  document.getElementById('box-bottle-count')?.replaceChildren(document.createTextNode(String(units)));
  const pct = Math.min((units / goal) * 100, 100);

  if (container) {
    let slots = '';
    for (let i = 0; i < goal; i++) {
      slots += i < units
        ? `<div class="aspect-[2/3] bg-gradient-to-b from-wine-900 to-wine-950 border border-gold-500/50 rounded-xl flex flex-col justify-center items-center shadow-lg relative">
             <span class="text-[8px] uppercase tracking-wider text-gold-400 font-bold">Nº ${i + 1}</span></div>`
        : `<div class="aspect-[2/3] bg-graphite-900/60 border border-white/5 border-dashed rounded-xl flex flex-col justify-center items-center text-gray-600">
             <span class="font-serif text-lg font-light">+</span><span class="text-[8px] uppercase tracking-widest mt-1">Vazio</span></div>`;
    }
    container.innerHTML = slots;
  }

  const bar = document.getElementById('box-progress-bar');
  if (bar) bar.style.width = `${pct}%`;

  const feedback = document.getElementById('box-feedback-text');
  const badge = document.getElementById('shipping-status-badge');
  if (feedback && badge) {
    if (units === 0) {
      feedback.innerText = 'Sua caixa está vazia. Adicione vinhos ou combos para começar.';
      badge.innerText = 'Aguardando';
      badge.className = 'px-2 py-0.5 text-[10px] uppercase font-bold bg-gray-700 text-gray-300 rounded';
    } else if (hasFreeShipping()) {
      feedback.innerText = `Parabéns! Sua caixa de ${units} itens está completa. Você ganhou FRETE GRÁTIS!`;
      badge.innerText = 'FRETE GRÁTIS';
      badge.className = 'px-2 py-0.5 text-[10px] uppercase font-bold bg-gold-500 text-black rounded animate-bounce';
    } else {
      const diff = goal - units;
      feedback.innerText = `Faltam ${diff} ${diff === 1 ? 'item' : 'itens'} para completar a caixa de ${goal} e liberar o Frete Grátis.`;
      badge.innerText = `Faltam ${diff}`;
      badge.className = 'px-2 py-0.5 text-[10px] uppercase font-bold bg-wine-800 text-wine-300 rounded';
    }
  }

  const ratio = document.getElementById('cart-box-helper-ratio');
  if (ratio) ratio.innerText = `${units}/${goal}`;
  const cartBar = document.getElementById('cart-box-progress-bar');
  if (cartBar) cartBar.style.width = `${pct}%`;

  const helperLabel = document.getElementById('cart-box-helper-label');
  if (helperLabel) helperLabel.innerText = `Caixa de ${goal} itens (avulsas + combos):`;

  const alert = document.getElementById('cart-box-shipping-alert');
  if (alert) {
    alert.innerText = hasFreeShipping()
      ? 'Frete Grátis liberado para sua caixa.'
      : `Adicione mais ${goal - units} ${goal - units === 1 ? 'item' : 'itens'} para ganhar Frete Grátis!`;
  }
}

export function renderCartView() {
  const list = document.getElementById('cart-items-list');
  const badge = document.getElementById('cart-badge-count');
  const drawerCount = document.getElementById('drawer-item-count');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping-fee');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const items = getItems();

  const units = totalUnits();
  if (badge) badge.innerText = String(units);
  if (drawerCount) drawerCount.innerText = `${units} ${units === 1 ? 'item' : 'itens'}`;

  if (items.length === 0) {
    if (list) list.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4 py-12">
        <p class="font-serif text-base text-white">Sua adega particular está vazia</p>
        <p class="text-xs max-w-xs px-4">Adicione garrafas avulsas em "Monte seu Kit" ou selecione um de nossos combos.</p>
      </div>`;
    if (subtotalEl) subtotalEl.innerText = formatBRL(0);
    if (shippingEl) shippingEl.innerText = 'A calcular';
    if (totalEl) totalEl.innerText = formatBRL(0);
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  if (list) {
    list.innerHTML = items.map((it) => {
      const line = priceOf(it.id) * it.quantity;
      return `
      <div class="flex items-center justify-between p-3.5 bg-graphite-950/60 border border-white/5 rounded-xl space-x-3">
        <div class="w-12 h-16 bg-graphite-900 rounded-lg flex items-center justify-center border border-white/5 flex-shrink-0">
          <span class="text-[9px] font-bold text-gold-500 text-center uppercase">${it.id.startsWith('combo-') ? 'COMBO' : 'VINHO'}</span>
        </div>
        <div class="flex-1 min-w-0 space-y-1">
          <h4 class="text-sm font-semibold text-white truncate">${nameOf(it.id)}</h4>
          <p class="text-[11px] text-gray-400 truncate">${subtitleOf(it.id)}</p>
          <p class="text-xs font-semibold text-gold-400">${formatBRL(priceOf(it.id))} un.</p>
        </div>
        <div class="flex flex-col items-end justify-between space-y-2 flex-shrink-0">
          <button type="button" data-remove="${it.id}" aria-label="Remover ${nameOf(it.id)} do carrinho" class="text-gray-500 hover:text-rose-400 transition-colors text-lg leading-none">&times;</button>
          <div class="flex items-center space-x-2 bg-graphite-900 border border-white/5 rounded px-2 py-1">
            <button type="button" data-cart="${it.id}" data-delta="-1" aria-label="Diminuir quantidade" class="text-[11px] font-bold text-gray-400 hover:text-white">-</button>
            <span class="text-xs font-semibold text-white min-w-[12px] text-center">${it.quantity}</span>
            <button type="button" data-cart="${it.id}" data-delta="1" aria-label="Aumentar quantidade" class="text-[11px] font-bold text-gray-400 hover:text-white">+</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  if (subtotalEl) subtotalEl.innerText = formatBRL(subtotal());
  if (shippingEl) {
    if (hasFreeShipping()) {
      shippingEl.innerText = 'Grátis';
      shippingEl.className = 'text-gold-400 font-bold';
    } else {
      shippingEl.innerText = shippingDisplay || 'Simule o frete pelo CEP';
      shippingEl.className = 'text-white font-medium';
    }
  }
  if (totalEl) totalEl.innerText = formatBRL(totalWithShipping());
}
