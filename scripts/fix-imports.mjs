import { promisify } from 'node:util';
import { exec as execCb } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const exec = promisify(execCb);

async function stripVersionSpecifiers(filePath) {
  const content = await readFile(filePath, 'utf8');
  const updated = content
    .replace(/(from\s*["'][^"']*?)@[0-9][A-Za-z0-9\.\-]*(["'])/g, '$1$2')
    .replace(/(import\s*["'][^"']*?)@[0-9][A-Za-z0-9\.\-]*(["'])/g, '$1$2');
  if (updated !== content) {
    await writeFile(filePath, updated, 'utf8');
    console.log('fixed', filePath);
  }
}

async function main() {
  const { stdout } = await exec("find . -type f \\( -name '*.ts' -o -name '*.tsx' \\) -print");
  const files = stdout.split('\n').filter(Boolean);
  await Promise.all(files.map(stripVersionSpecifiers));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


