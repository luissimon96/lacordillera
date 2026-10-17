# GO-LIVE — colocar a loja no ar

Checklist na ordem. Cada passo indica **onde** a informação vai. Nada de chave em arquivo
versionado — só em variáveis de ambiente.

## 1. Publicar o site (GitHub Pages)

Já configurado: o workflow `.github/workflows/ci-cd.yml` roda testes, gera `_site/` e publica
no Pages a cada push na `main`. Nada a fazer além de push.

- URL: <https://luissimon96.github.io/lacordillera/>

## 2. Subir a API (Vercel)

1. Importe o repositório `luissimon96/lacordillera` na Vercel (framework: **Other**).
2. A Vercel detecta as funções em `api/`. Não é preciso build do front.
3. Anote a URL do deployment (ex.: `https://lacordillera.vercel.app`).
4. Configure as variáveis de ambiente (Production **e** Preview):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `STRIPE_SECRET_KEY` | sim | chave secreta do Stripe (`sk_live_…` / `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | sim | segredo do webhook (`whsec_…`) |
| `SITE_URL` | recomendado | origem do site para `success_url`/`cancel_url` (ex.: `https://luissimon96.github.io/lacordillera`) |
| `SITE_ORIGINS` | recomendado | origens liberadas no CORS, separadas por vírgula (default já cobre o GitHub Pages) |
| `STORE_NOTIFY_EMAIL` | recomendado | e-mail que recebe cada pedido pago |
| `RESEND_API_KEY` | opcional | sem ele, a notificação só é registrada no log (não quebra o webhook) |
| `STORE_FROM_EMAIL` | opcional | remetente verificado no Resend |

## 3. Configurar o Stripe

1. Crie a conta e pegue as chaves em **Developers → API keys**.
2. Crie o webhook em **Developers → Webhooks → Add endpoint**:
   - URL: `https://<seu-deploy>.vercel.app/api/stripe-webhook`
   - Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`
   - Copie o **Signing secret** para `STRIPE_WEBHOOK_SECRET`.
3. Em **Settings → Payment methods**, habilite **PIX** e **Cartão** (BRL).
4. Teste com o cartão de teste `4242 4242 4242 4242` (qualquer validade/CVC).

## 4. Segredos de verdade

- **Chaves de teste vs. produção**: comece com `sk_test_…`; troque para `sk_live_…` só na hora de vender.
- Nunca comite `.env`. Use as variáveis de ambiente da Vercel.
- Se uma chave vazar, revogue no painel do Stripe imediatamente.

## 5. Apontar o front para a API

`assets/js/config.js` (e o `window.LC_CONFIG` em `index.html`) têm `API_BASE_URL`.
Depois do deploy da Vercel, confirme que aponta para a URL real:

```js
// index.html
window.LC_CONFIG = { API_BASE_URL: 'https://lacordillera.vercel.app' };
```

Confirme também `SITE_ORIGINS` na Vercel contendo a origem do site
(`https://luissimon96.github.io`), senão o navegador bloqueia a chamada por CORS.

## 6. Teste de ponta a ponta (antes de vender)

```bash
npm run verify          # html + testes do servidor + build + artefato
npm run proof:browser   # abre o site num navegador e percorre o fluxo de compra
```

No site: monte um kit com 6 itens → `Finalizar Compra Segura` → pague com cartão de teste →
confirme que aparece `/sucesso.html` e que o pedido chegou em `STORE_NOTIFY_EMAIL`.

## 7. Pendências do dono

Antes de abrir ao público, resolva [`docs/PENDENCIAS.md`](PENDENCIAS.md) (dados legais,
fotos reais, GA4, domínio próprio).
