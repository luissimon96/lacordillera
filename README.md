# La Cordillera

Site de venda de vinhos argentinos premium no Brasil.

- **Vitrine (estático)** — publicada no **GitHub Pages**: <https://luissimon96.github.io/lacordillera/>
- **API de pagamento (serverless)** — funções da **Vercel** em `/api`, usando **Stripe** (PIX e cartão).

O catálogo (**fonte única de verdade**) fica em [`data/products.json`](data/products.json): preços,
pesos, fichas e a regra de frete. O servidor **recalcula tudo** — o navegador nunca envia preços.

## Estrutura

```
index.html                 loja (combos, monte seu kit, FAQ, carrinho)
sucesso.html / cancelado.html / 404.html
pages/                     páginas legais (prazos, troca, termos, privacidade)
data/products.json         catálogo — fonte única de preço/peso
assets/js/                 front (ESM, sem build): config, data, cart, catalog, box,
                           shipping, checkout, analytics, ui, main
api/                       funções serverless (CommonJS)
  _lib/                    catalog, shipping, pricing, cors, order, email, stripeClient, http
  create-checkout-session.js
  stripe-webhook.js
  shipping-quote.js
scripts/build-site.mjs     monta _site/ (allowlist) + injeta JSON-LD do catálogo
scripts/verify-build.mjs   confere o artefato de build
scripts/browser-proof.mjs  abre o site num navegador headless e interage como usuário
tests/                     testes do servidor (node:test) — preço, frete, endpoints
vercel.json                configuração das funções
docs/GO-LIVE.md            como colocar no ar
docs/PENDENCIAS.md         o que depende do dono da loja
```

## Comandos

```bash
npm ci                 # dependências
npm run test           # valida o HTML (html-validate)
npm run test:api       # testes do servidor (node --test)
npm run test:all       # os dois
npm run build          # gera _site/ (é isso que vai para o Pages)
npm run proof:build    # confere o artefato _site/
npm run proof:browser  # abre _site/ no navegador e testa o fluxo de compra
npm run verify         # test:all + build + proof:build
```

## Regra de frete

**Frete grátis com 6 itens ou mais**, somando garrafas avulsas e combos
(cada combo conta como **1 item**). Abaixo disso, o frete é calculado pelo CEP
(região pela 1ª casa do CEP + peso acima de 3 kg), sempre no servidor.

## Como funciona o pagamento

1. O front envia ao servidor apenas `{ items: [{id, quantidade}], cep }`.
2. `api/_lib/pricing.js` valida os itens contra o catálogo, recalcula subtotal,
   frete e total e cria uma **Stripe Checkout Session** (PIX + cartão).
3. O pedido é marcado como **pago apenas no webhook** (`/api/stripe-webhook`),
   que valida a assinatura do Stripe, é idempotente e notifica a loja por e-mail.
4. O redirect para `/sucesso.html` é apenas visual — nunca confirma pagamento.

> Estado atual é **pré-produção**: faltam chaves do Stripe e alguns dados da loja.
> Veja [`docs/GO-LIVE.md`](docs/GO-LIVE.md) e [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md).
