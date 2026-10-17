// Ponto de entrada do front. Conecta catálogo, carrinho, frete e checkout.
import { CONFIG } from './config.js';
import { initAnalytics, track } from './analytics.js';
import { loadCatalog, getData, findProduct } from './data.js';
import { loadCart, addItem, changeQuantity, removeItem, getItems, quantityOf, subtotal } from './cart.js';
import { renderCombos, renderWines } from './catalog.js';
import { renderBox, renderCartView, setShippingDisplay } from './box.js';
import { showToast, toggleCart, initAgeGate, initFaq, isAgeConfirmed, currency } from './ui.js';
import { maskCep, onlyDigits, lookupCep, quoteShipping } from './shipping.js';
import { beginCheckout } from './checkout.js';

function refreshAll() {
  renderWines();
  renderBox();
  renderCartView();
}

function wireAddToCart() {
  document.body.addEventListener('click', (ev) => {
    const addCombo = ev.target.closest('[data-add-combo]');
    if (addCombo) {
      const id = addCombo.dataset.addCombo;
      addItem(id, 1);
      track('add_to_cart', { currency: currency(), value: findProduct(id)?.promoPrice, items: [{ item_id: id, quantity: 1 }] });
      showToast(`${findProduct(id)?.name} adicionado ao carrinho!`);
      refreshAll();
      return;
    }

    const wineBtn = ev.target.closest('[data-wine]');
    if (wineBtn) {
      const id = wineBtn.dataset.wine;
      const delta = Number(wineBtn.dataset.delta);
      changeQuantity(id, delta);
      if (delta > 0) {
        track('add_to_cart', { currency: currency(), value: findProduct(id)?.price, items: [{ item_id: id, quantity: 1 }] });
        showToast(`1 garrafa de ${findProduct(id)?.name} adicionada ao seu Kit!`);
      }
      refreshAll();
      return;
    }

    const cartBtn = ev.target.closest('[data-cart]');
    if (cartBtn) {
      changeQuantity(cartBtn.dataset.cart, Number(cartBtn.dataset.delta));
      refreshAll();
      return;
    }

    const rm = ev.target.closest('[data-remove]');
    if (rm) {
      removeItem(rm.dataset.remove);
      showToast('Item removido do carrinho.');
      refreshAll();
    }
  });
}

function wireShipping() {
  const input = document.getElementById('cep-input');
  const feedback = document.getElementById('cep-feedback');
  if (!input) return;

  input.addEventListener('input', () => { input.value = maskCep(input.value); });

  const run = async () => {
    const digits = onlyDigits(input.value);
    if (digits.length !== 8) {
      if (feedback) feedback.innerText = 'Digite um CEP válido com 8 dígitos.';
      return;
    }
    try {
      const addr = await lookupCep(digits);
      const quote = await quoteShipping(getItems(), digits);
      setShippingDisplay(quote.freeShipping ? 'Grátis' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: CONFIG.CURRENCY }).format(quote.shippingCents / 100));
      if (feedback) {
        feedback.innerText = `${addr.localidade}/${addr.uf} — Frete: ${quote.freeShipping ? 'Grátis' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: CONFIG.CURRENCY }).format(quote.shippingCents / 100)}`;
      }
      renderCartView();
    } catch (err) {
      if (feedback) feedback.innerText = err.message;
    }
  };

  input.addEventListener('change', run);
  document.getElementById('cep-calc-btn')?.addEventListener('click', run);
}

function wireCheckout() {
  const btn = document.getElementById('checkout-btn');
  const ageBox = document.getElementById('age-confirm-checkbox');
  const msg = document.getElementById('checkout-message');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (ageBox && !ageBox.checked) {
      if (msg) msg.innerText = 'Confirme que você tem 18 anos ou mais para continuar.';
      ageBox.focus();
      return;
    }
    if (!isAgeConfirmed()) { if (msg) msg.innerText = 'Confirme sua idade para continuar.'; return; }
    if (getItems().length === 0) return;
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span>Redirecionando…</span>';
    try {
      const cep = document.getElementById('cep-input')?.value;
      await beginCheckout(cep);
    } catch (err) {
      if (msg) msg.innerText = err.message;
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}

async function boot() {
  initAnalytics();
  initAgeGate();
  initFaq();
  loadCart();
  wireAddToCart();
  wireShipping();
  wireCheckout();
  document.querySelectorAll('[data-toggle-cart]').forEach((el) => el.addEventListener('click', () => toggleCart(true)));
  document.querySelectorAll('[data-close-cart]').forEach((el) => el.addEventListener('click', () => toggleCart(false)));

  try {
    await loadCatalog();
    renderCombos();
  } catch (err) {
    console.error(err);
  }
  refreshAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
