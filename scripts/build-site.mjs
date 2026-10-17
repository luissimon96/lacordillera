import { mkdir, rm, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
const siteFiles = ['index.html', 'la_cordillera_vinhos_argentinos_premium.html'];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of siteFiles) {
  await copyFile(join(root, file), join(out, file));
}
console.log(`_site: ${siteFiles.length} arquivos copiados`);
