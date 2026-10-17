// Estado do carrinho. Persistido em localStorage e validado na leitura.
// Armazena apenas { id, quantity } — preços vêm sempre do catálogo/servidor.
import { priceOf, freeShippingUnits } from './data.js';

const CART_KEY = 'la_cordillera_cart_v2';
const MAX_QTY = 99;
let items = [];

export function getItems() { return items; }

export function totalUnits() {
  return items.reduce((sum, it) => sum + it.quantity, 0);
}

export function subtotal() {
  return items.reduce((sum, it) => sum + priceOf(it.id) * it.quantity, 0);
}

export function hasFreeShipping() {
  return totalUnits() >= freeShippingUnits();
}

export function quantityOf(id) {
  return items.find((it) => it.id === id)?.quantity || 0;
}

function sanitize(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it) => it && typeof it.id === 'string' && it.id.length < 64)
    .map((it) => ({ id: it.id, quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(Number(it.quantity) || 0))) }))
    .filter((it) => it.quantity >= 1);
}

export function loadCart() {
  try {
    items = sanitize(JSON.parse(localStorage.getItem(CART_KEY) || '[]'));
  } catch { items = []; }
  return items;
}

function persist() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* storage cheio/privado */ }
}

export function addItem(id, qty = 1) {
  const existing = items.find((it) => it.id === id);
  if (existing) existing.quantity = Math.min(MAX_QTY, existing.quantity + qty);
  else items.push({ id, quantity: Math.min(MAX_QTY, Math.max(1, qty)) });
  persist();
}

export function changeQuantity(id, delta) {
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) {
    // Item ainda não está no carrinho: só faz sentido adicionar.
    if (delta > 0) addItem(id, delta);
    return;
  }
  const next = items[idx].quantity + delta;
  if (next <= 0) items.splice(idx, 1);
  else items[idx].quantity = Math.min(MAX_QTY, next);
  persist();
}

export function removeItem(id) {
  items = items.filter((it) => it.id !== id);
  persist();
}

export function clearCart() {
  items = [];
  persist();
}
