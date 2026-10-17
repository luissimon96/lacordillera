// Catálogo do servidor. Fonte única de verdade para preço e peso.
// O cliente NUNCA envia preços: tudo é resolvido aqui a partir do id.
const path = require('node:path');
const fs = require('node:fs');

const raw = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'products.json'), 'utf8');
const CATALOG = JSON.parse(raw);

const byId = new Map();
for (const w of CATALOG.wines) byId.set(w.id, { ...w, isCombo: false, unitPrice: w.price });
for (const c of CATALOG.combos) byId.set(c.id, { ...c, isCombo: true, unitPrice: c.promoPrice });

function getProduct(id) {
  return byId.get(id) || null;
}

function freeShippingUnits() {
  return CATALOG.freeShippingUnits || 6;
}

module.exports = { CATALOG, getProduct, freeShippingUnits };
