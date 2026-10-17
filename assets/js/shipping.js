// CEP: máscara, consulta no ViaCEP e cotação de frete no servidor (tabela única
// em api/_lib/shipping.js). O front nunca calcula frete por conta própria.
import { CONFIG } from './config.js';

export function maskCep(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 8);
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function onlyDigits(value) { return String(value).replace(/\D/g, ''); }

export async function lookupCep(cep) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) throw new Error('CEP inválido');
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) throw new Error('Falha ao consultar o CEP');
  const data = await res.json();
  if (data.erro) throw new Error('CEP não encontrado');
  return data; // { cep, logradouro, bairro, localidade, uf }
}

export async function quoteShipping(items, cep) {
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/shipping-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, cep: onlyDigits(cep) }),
  });
  if (!res.ok) throw new Error('Não foi possível calcular o frete');
  return res.json(); // { region, shippingCents, freeShipping, totalCents }
}
