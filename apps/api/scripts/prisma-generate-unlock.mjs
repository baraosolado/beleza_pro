/**
 * No Windows, `prisma generate` pode falhar com EPERM ao renomear
 * `query_engine-windows.dll.node` se algum processo Node estiver usando o Prisma
 * (ex.: `npm run dev` da API com `tsx watch`).
 *
 * Apaga `node_modules/.prisma/client` antes do generate. Se a pasta estiver
 * bloqueada, tenta de novo algumas vezes após uma pausa.
 */
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, '..');
const repoRoot = join(apiDir, '..', '..');

const candidates = [
  join(repoRoot, 'node_modules', '.prisma', 'client'),
  join(apiDir, 'node_modules', '.prisma', 'client'),
];

function sleepMs(ms) {
  try {
    if (process.platform === 'win32') {
      spawnSync('powershell', ['-NoProfile', '-Command', `Start-Sleep -Milliseconds ${ms}`], {
        stdio: 'ignore',
      });
    } else {
      spawnSync('sleep', [`${Math.ceil(ms / 1000)}`], { stdio: 'ignore' });
    }
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* busy wait fallback */
    }
  }
}

function tryRemoveDir(dir) {
  if (!existsSync(dir)) return true;
  try {
    rmSync(dir, { recursive: true, force: true });
    console.log('[prisma-generate] Removido cache:', dir);
    return true;
  } catch {
    return false;
  }
}

console.log(
  '[prisma-generate] Se falhar com EPERM: pare a API (Ctrl+C em todo terminal com `npm run dev` / `tsx watch`).\n'
);

const maxAttempts = 4;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  let allOk = true;
  for (const dir of candidates) {
    if (existsSync(dir) && !tryRemoveDir(dir)) {
      allOk = false;
    }
  }
  if (allOk) break;
  if (attempt === maxAttempts) {
    console.error(
      '\n[prisma-generate] Ainda bloqueado. Faça:\n' +
        '  1) Feche TODOS os terminais onde roda a API (beleza-pro).\n' +
        '  2) No PowerShell: Get-Process node | Stop-Process -Force   (cuidado: encerra todos os Node)\n' +
        '  3) Rode de novo: npm run db:generate\n'
    );
    process.exit(1);
  }
  console.log(
    `[prisma-generate] Pasta em uso (tentativa ${attempt}/${maxAttempts - 1}). Aguardando 2s…`
  );
  sleepMs(2000);
}

const result = spawnSync(
  'npx',
  ['prisma', 'generate', '--schema=src/db/prisma/schema.prisma'],
  {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  }
);

process.exit(result.status === null ? 1 : result.status);
