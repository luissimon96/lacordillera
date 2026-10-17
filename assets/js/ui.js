// UI helpers: toast, gaveta do carrinho, modal de idade e acordeão de FAQ.
import { CONFIG } from './config.js';

export function showToast(text) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  if (!toast || !toastText) return;
  toastText.innerText = text;
  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3000);
}

export function toggleCart(show) {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (!overlay || !drawer) return;
  const open = Boolean(show);
  overlay.classList.toggle('pointer-events-none', !open);
  overlay.classList.toggle('opacity-0', !open);
  overlay.classList.toggle('opacity-100', open);
  drawer.classList.toggle('translate-x-full', !open);
  // `inert` tira a gaveta fechada da árvore de acessibilidade e do tab order.
  drawer.toggleAttribute('inert', !open);
  if (open) {
    const focusable = drawer.querySelector('button, [href], input');
    if (focusable) focusable.focus();
  }
}

// Modal de verificação de idade (18+). Persiste o aceite por 30 dias.
const AGE_KEY = 'la_cordillera_age_ok';
const AGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isAgeConfirmed() {
  try {
    const raw = localStorage.getItem(AGE_KEY);
    if (!raw) return false;
    const { at } = JSON.parse(raw);
    return Date.now() - at < AGE_TTL_MS;
  } catch { return false; }
}

export function confirmAge() {
  localStorage.setItem(AGE_KEY, JSON.stringify({ at: Date.now() }));
}

export function initAgeGate(onConfirm) {
  const modal = document.getElementById('age-gate');
  if (!modal) return;
  if (isAgeConfirmed()) { modal.remove(); return; }
  document.body.classList.add('overflow-hidden');
  modal.classList.remove('hidden');

  document.getElementById('age-gate-confirm')?.addEventListener('click', () => {
    confirmAge();
    modal.remove();
    document.body.classList.remove('overflow-hidden');
    if (typeof onConfirm === 'function') onConfirm();
  });
  document.getElementById('age-gate-deny')?.addEventListener('click', () => {
    window.location.href = 'https://www.google.com/';
  });
}

export function initFaq() {
  document.querySelectorAll('[data-faq-question]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.nextElementSibling;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if (panel) panel.classList.toggle('hidden', expanded);
    });
  });
}

export function currency() { return CONFIG.CURRENCY; }
