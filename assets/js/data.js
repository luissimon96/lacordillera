// Carrega o catálogo (products.json) uma vez e o mantém em cache.
// Fonte única para preços/peso exibidos no front; o servidor revalida tudo.

let DATA = null;
let loadPromise = null;

export function loadCatalog() {
  if (DATA) return Promise.resolve(DATA);
  if (!loadPromise) {
    loadPromise = fetch('data/products.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar catálogo (${r.status})`);
        return r.json();
      })
      .then((json) => { DATA = json; return json; });
  }
  return loadPromise;
}

export function getData() { return DATA; }

export function isComboId(id) { return typeof id === 'string' && id.startsWith('combo-'); }

export function findProduct(id) {
  if (!DATA) return null;
  const list = isComboId(id) ? DATA.combos : DATA.wines;
  return list.find((p) => p.id === id) || null;
}

export function priceOf(id) {
  const p = findProduct(id);
  if (!p) return 0;
  return isComboId(id) ? p.promoPrice : p.price;
}

export function nameOf(id) { return findProduct(id)?.name || id; }
export function subtitleOf(id) {
  const p = findProduct(id);
  if (!p) return '';
  return isComboId(id) ? 'Sugestão de Sommelier' : p.type;
}

export function freeShippingUnits() { return DATA?.freeShippingUnits ?? 6; }
