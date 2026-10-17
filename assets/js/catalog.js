// Renderiza os cards de combos e de vinhos a partir do catálogo (data.js).
// HTML semântico; o build injeta uma versão estática para funcionar sem JS.
import { getData, isComboId } from './data.js';
import { formatBRL } from './config.js';
import { quantityOf } from './cart.js';

const BOTTLE_SVG = `
<svg class="w-auto h-36 text-wine-600 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transform group-hover:scale-105 transition-transform duration-300" viewBox="0 0 100 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M50 15C49 15 48 16 48 17V60C48 75 35 90 28 105C22 118 20 135 20 155V275C20 285 28 290 35 290H65C72 290 80 285 80 275V155C80 135 78 118 72 105C65 90 52 75 52 60V17C52 16 51 15 50 15Z" fill="#150508" stroke="#521922" stroke-width="2"/>
  <rect x="28" y="145" width="44" height="65" rx="1.5" fill="#faf4df"/>
  <text x="50" y="185" fill="#7a8b92" font-family="Inter, sans-serif" font-size="4" text-anchor="middle">__YEAR__</text>
  <path d="M48 17H52V40H48V17Z" fill="#9b3246"/>
</svg>`;

export function comboCard(combo) {
  return `
  <article class="bg-gradient-to-b from-graphite-800 to-graphite-900 border border-white/5 rounded-2xl overflow-hidden p-6 hover:border-wine-500/40 transition-all duration-300 group flex flex-col justify-between wine-glow relative">
    <div class="absolute top-4 right-4 bg-gold-500 text-black font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">Economize ${formatBRL(combo.saving)}</div>
    <div class="space-y-4">
      <div class="h-44 bg-graphite-950/60 rounded-xl flex items-center justify-center border border-white/5 relative">
        <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#521922_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <span class="text-xs bg-gold-500/20 text-gold-400 font-serif border border-gold-500/30 px-3 py-1.5 rounded-lg tracking-wider uppercase font-semibold relative z-10">${combo.imageText}</span>
      </div>
      <div class="space-y-2">
        <h3 class="font-serif text-xl font-bold text-white group-hover:text-gold-400 transition-colors">${combo.name}</h3>
        <p class="text-xs text-gray-400 font-light leading-relaxed min-h-[40px]">${combo.description}</p>
        <p class="text-[11px] text-gold-500/80 italic font-medium">${combo.itemsDetail}</p>
      </div>
    </div>
    <div class="pt-6 mt-6 border-t border-white/5 space-y-4">
      <div class="flex items-baseline justify-between">
        <span class="text-xs text-gray-500 line-through">${formatBRL(combo.originalPrice)}</span>
        <div class="text-right">
          <span class="block text-xs text-gold-500 uppercase tracking-wider font-semibold">Oferta Especial</span>
          <span class="text-2xl font-serif font-bold text-white">${formatBRL(combo.promoPrice)}</span>
        </div>
      </div>
      <button type="button" data-add-combo="${combo.id}" class="w-full py-3 bg-wine-900 hover:bg-wine-800 text-white font-medium uppercase tracking-wider text-xs rounded-lg border border-wine-700/50 hover:border-wine-500 transition-all duration-300">Adicionar Combo ao Carrinho</button>
    </div>
  </article>`;
}

export function wineCard(wine) {
  const qty = quantityOf(wine.id);
  const image = wine.image
    ? `<img src="${wine.image}" alt="Rótulo ${wine.name}" loading="lazy" width="96" height="144" class="h-36 w-auto object-contain">`
    : BOTTLE_SVG.replace('__YEAR__', wine.year);
  const selector = qty > 0
    ? `<div class="flex items-center bg-graphite-900 border border-white/10 rounded-lg overflow-hidden w-full">
         <button type="button" data-wine="${wine.id}" data-delta="-1" aria-label="Remover uma garrafa de ${wine.name}" class="w-1/3 py-2.5 text-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm">-</button>
         <span class="w-1/3 text-center text-sm font-semibold text-white">${qty}</span>
         <button type="button" data-wine="${wine.id}" data-delta="1" aria-label="Adicionar uma garrafa de ${wine.name}" class="w-1/3 py-2.5 text-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm">+</button>
       </div>`
    : `<button type="button" data-wine="${wine.id}" data-delta="1" class="w-full py-2.5 bg-graphite-900 hover:bg-wine-950 text-white font-medium uppercase tracking-wider text-xs rounded-lg border border-white/10 hover:border-wine-500/50 transition-all duration-300">Adicionar ao Kit</button>`;

  return `
  <article class="bg-gradient-to-b from-graphite-900 to-graphite-950 border border-white/5 hover:border-gold-500/20 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 group gold-glow relative">
    <div class="absolute top-4 left-4 flex items-center space-x-1 bg-graphite-900/90 border border-white/10 px-2.5 py-1 rounded-full" aria-label="Avaliação ${wine.rating} de 5">
      <svg class="w-3.5 h-3.5 text-gold-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
      <span class="text-[11px] font-semibold text-white">${wine.rating}</span>
    </div>
    <div class="h-48 flex items-center justify-center py-2 mb-4 bg-graphite-900/50 rounded-xl relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none"></div>
      ${image}
    </div>
    <div class="space-y-2">
      <p class="text-xs text-gold-500 uppercase tracking-widest font-medium">${wine.type}</p>
      <h3 class="font-serif text-lg font-bold text-white truncate">${wine.name}</h3>
      <p class="text-xs text-gray-400 font-light leading-relaxed min-h-[36px]">${wine.description}</p>
      <dl class="text-[11px] text-gray-500 space-y-0.5 pt-1">
        <div><dt class="inline font-medium text-gray-400">Uva:</dt> <dd class="inline">${wine.grape}</dd></div>
        <div><dt class="inline font-medium text-gray-400">Safra:</dt> <dd class="inline">${wine.year}</dd></div>
        <div><dt class="inline font-medium text-gray-400">Região:</dt> <dd class="inline">${wine.region}</dd></div>
        <div><dt class="inline font-medium text-gray-400">Harmonização:</dt> <dd class="inline">${wine.pairing}</dd></div>
      </dl>
    </div>
    <div class="pt-4 mt-4 border-t border-white/5 space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">Garrafa avulsa</span>
        <span class="text-xl font-serif font-bold text-white">${formatBRL(wine.price)}</span>
      </div>
      <div class="flex items-center space-x-2">${selector}</div>
    </div>
  </article>`;
}

export function renderCombos() {
  const container = document.getElementById('combos-container');
  const data = getData();
  if (!container || !data) return;
  container.innerHTML = data.combos.map(comboCard).join('');
}

export function renderWines() {
  const container = document.getElementById('wines-container');
  const data = getData();
  if (!container || !data) return;
  container.innerHTML = data.wines.map(wineCard).join('');
}

export function isCombo(id) { return isComboId(id); }
