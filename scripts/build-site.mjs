// Build do site estático para o GitHub Pages.
// Copia apenas o que faz parte do site (allowlist) para _site/ e injeta os dados
// estruturados (JSON-LD) gerados a partir de data/products.json — fonte única de preços.
import { mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');

const FILES = [
  'index.html',
  'la_cordillera_vinhos_argentinos_premium.html',
  'sucesso.html',
  'cancelado.html',
  '404.html',
  'favicon.svg',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
];
const DIRS = ['assets', 'pages', 'data'];

const SITE_URL = 'https://luissimon96.github.io/lacordillera';

async function copySite() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const file of FILES) {
    try {
      await cp(join(root, file), join(out, file));
    } catch (err) {
      if (err.code === 'ENOENT') console.warn(`build: ignorando ${file} (não existe)`);
      else throw err;
    }
  }
  for (const dir of DIRS) {
    await cp(join(root, dir), join(out, dir), { recursive: true });
  }
  return FILES.length + DIRS.length;
}

function offerFor(product, isCombo) {
  const price = isCombo ? product.promoPrice : product.price;
  return {
    '@type': 'Offer',
    price: price.toFixed(2),
    priceCurrency: 'BRL',
    availability: (product.stock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: `${SITE_URL}/#kit`,
  };
}

function jsonLd(catalog) {
  const products = [...catalog.wines, ...catalog.combos].map((p) => ({
    '@type': 'Product',
    name: p.name,
    description: p.description,
    category: p.type || 'Vinho',
    brand: { '@type': 'Brand', name: 'La Cordillera' },
    offers: offerFor(p, Array.isArray(catalog.combos) && catalog.combos.includes(p)),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'WineStore',
    name: 'La Cordillera',
    url: `${SITE_URL}/`,
    description: 'Vinhos argentinos premium importados direto de Mendoza e Salta.',
    currenciesAccepted: 'BRL',
    paymentAccepted: 'PIX, Cartão de Crédito',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Vinhos e Combos La Cordillera',
      itemListElement: products.map((p) => ({ '@type': 'Offer', itemOffered: p })),
    },
  };
}

async function injectJsonLd() {
  const file = join(out, 'index.html');
  const html = await readFile(file, 'utf8');
  const catalog = JSON.parse(await readFile(join(root, 'data', 'products.json'), 'utf8'));
  const script = `    <script type="application/ld+json">\n${JSON.stringify(jsonLd(catalog), null, 2)}\n    </script>`;
  const injected = html.replace(
    /(<!-- BUILD:jsonld:start -->)[\s\S]*?(<!-- BUILD:jsonld:end -->)/,
    `$1\n${script}\n    $2`,
  );
  if (injected === html) throw new Error('build: marcadores BUILD:jsonld não encontrados em index.html');
  await writeFile(file, injected, 'utf8');
}

const copied = await copySite();
await injectJsonLd();
console.log(`_site: ${copied} itens copiados + JSON-LD injetado`);
