// Tabela de frete (primeira versão): por região (1ª casa do CEP) + peso.
// Isolado para permitir troca por Melhor Envio/Correios depois sem tocar no checkout.

// base cobre até INCLUDED_KG; cada kg excedente soma PER_KG.
const INCLUDED_KG = 3;
const PER_KG_CENTS = 600;

const RATES = [
  { prefixes: [0, 1], region: 'Sudeste (SP)', baseCents: 2490 },
  { prefixes: [2], region: 'Sudeste (RJ/ES)', baseCents: 2490 },
  { prefixes: [3], region: 'Sudeste (MG)', baseCents: 2490 },
  { prefixes: [4], region: 'Nordeste (BA/SE)', baseCents: 4490 },
  { prefixes: [5], region: 'Nordeste (PE/AL/PB/RN)', baseCents: 4490 },
  { prefixes: [6], region: 'Norte/Nordeste', baseCents: 5490 },
  { prefixes: [7], region: 'Centro-Oeste', baseCents: 3990 },
  { prefixes: [8], region: 'Sul (PR/SC)', baseCents: 3490 },
  { prefixes: [9], region: 'Sul (RS)', baseCents: 3490 },
];

function regionFor(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const first = Number(digits[0]);
  return RATES.find((r) => r.prefixes.includes(first)) || null;
}

/**
 * @returns {{region:string, shippingCents:number}|null}
 */
function computeShippingCents({ cep, weightKg, freeShipping }) {
  if (freeShipping) {
    const entry = regionFor(cep);
    return { region: entry ? entry.region : 'Brasil', shippingCents: 0 };
  }
  const entry = regionFor(cep);
  if (!entry) return null;
  const extraKg = Math.max(0, Math.ceil(weightKg - INCLUDED_KG));
  return { region: entry.region, shippingCents: entry.baseCents + extraKg * PER_KG_CENTS };
}

module.exports = { regionFor, computeShippingCents, INCLUDED_KG, PER_KG_CENTS };
