# Pendências — dependem do dono da loja

Cada item diz **o quê**, **onde** e **por quê**. O código está pronto; falta o dado real.

## Bloqueiam a venda (P1)

| # | Item | Onde | Por quê |
|---|---|---|---|
| 1 | `STRIPE_SECRET_KEY` (produção) | Vercel → env | sem ela o checkout não cria a sessão |
| 2 | `STRIPE_WEBHOOK_SECRET` | Vercel → env | sem ela o pedido nunca é confirmado como pago |
| 3 | Habilitar **PIX** e **cartão** no Stripe | Stripe → Payment methods | PIX/cartão exigem ativação na conta |
| 4 | `SITE_URL` e `SITE_ORIGINS` | Vercel → env | redirect e CORS do checkout |
| 5 | **Razão social + CNPJ + endereço** | `index.html` (rodapé), `pages/termos.html`, `pages/privacidade.html` | exigência legal para e-commerce |
| 6 | **Número de WhatsApp real** | `assets/js/config.js` (`WHATSAPP_NUMBER`), `sucesso.html`, `cancelado.html`, `index.html` | hoje é `5545999999999` (placeholder) |
| 7 | **E-mail de contato** | `assets/js/config.js` (`BRAND.email`) e páginas legais | canal oficial de atendimento |
| 8 | **E-mail do DPO (LGPD)** | `pages/privacidade.html` | direito do titular precisa de canal |
| 9 | Revisão jurídica dos textos | `pages/termos.html`, `privacidade.html`, `troca-devolucao.html`, `prazos.html` | minutas precisam de validação |

## Importantes (P2)

| # | Item | Onde | Por quê |
|---|---|---|---|
| 10 | **Fotos reais dos rótulos** | `data/products.json` → `image` (hoje `null`) | hoje o front desenha um SVG genérico |
| 11 | **Harmonização e bodega** | `data/products.json` → `pairing`, `bodega` (hoje `TODO`) | informação que o cliente procura |
| 12 | **GA4 Measurement ID** | `assets/js/config.js` (`GA4_ID`) ou `window.LC_CONFIG` | sem ele os eventos são no-op |
| 13 | **Domínio próprio** | GitHub Pages → Custom domain | melhora SEO e confiança; atualizar `canonical`, `sitemap.xml`, `robots.txt` e `SITE_URL` |
| 14 | **`RESEND_API_KEY` + `STORE_NOTIFY_EMAIL`** | Vercel → env | sem eles a venda não gera e-mail interno |
| 15 | **Prazos oficiais da transportadora** | `pages/prazos.html`, `api/_lib/shipping.js` | hoje estimativas por região |
| 16 | **Exportação fiscal (NF-e)** | — | obrigação fiscal da venda |

## Melhorias (P3)

| # | Item | Onde | Por quê |
|---|---|---|---|
| 17 | Persistência de pedidos (banco) | `api/_lib/order.js` | hoje o registro é em memória e volátil no serverless |
| 18 | Frete real (Melhor Envio/Correios) | `api/_lib/shipping.js` | hoje é tabela por região + peso |
| 19 | E-mail de confirmação para o cliente | `api/_lib/email.js` | hoje só notifica a loja |
| 20 | Cupom de desconto | Stripe + `api/_lib/pricing.js` | — |
| 21 | Teste e2e no CI (Playwright) | `.github/workflows/ci-cd.yml` | hoje `proof:browser` roda local (pula sem navegador) |
| 22 | Fluxo "comprar um vinho só" (checkout direto) | `assets/js/catalog.js` | hoje o card avulso alimenta o kit |
