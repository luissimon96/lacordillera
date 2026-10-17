// Analytics (GA4). Sem GA4_ID configurado, os eventos viram no-ops seguros.
import { CONFIG } from './config.js';

let ready = false;

export function initAnalytics() {
  if (!CONFIG.GA4_ID || ready) return;
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA4_ID}`;
  document.head.appendChild(tag);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', CONFIG.GA4_ID, { anonymize_ip: true });
  ready = true;
}

export function track(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}
