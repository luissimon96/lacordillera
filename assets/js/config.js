// Configuração central do front-end.
// Sobrescreva qualquer chave via `window.LC_CONFIG` (script inline antes deste módulo)
// ou editando os valores abaixo. Tudo que depende do dono da loja está marcado TODO.

const defaults = {
  // URL base da API serverless na Vercel (sem barra no fim). TODO: trocar pela URL real do deploy.
  API_BASE_URL: 'https://lacordillera.vercel.app',
  // WhatsApp de suporte (formato 55 + DDD + número). TODO: número real.
  WHATSAPP_NUMBER: '5545999999999',
  // GA4 Measurement ID. Deixe vazio para desativar. TODO: G-XXXXXXXXXX.
  GA4_ID: '',
  CURRENCY: 'BRL',
  FREE_SHIPPING_UNITS: 6,
  BRAND: {
    name: 'La Cordillera',
    email: 'TODO@lacordillera.com.br',
    cnpj: 'TODO: 00.000.000/0001-00',
    whatsappDisplay: 'TODO: +55 (45) 9 9999-9999',
  },
};

export const CONFIG = { ...defaults, ...(window.LC_CONFIG || {}) };
export const BRAND = CONFIG.BRAND;

export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: CONFIG.CURRENCY }).format(value);
}

export function whatsappLink(message) {
  const text = encodeURIComponent(message || 'Olá! Tenho uma dúvida sobre os vinhos.');
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${text}`;
}
