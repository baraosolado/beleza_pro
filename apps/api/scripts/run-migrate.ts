import { spawnSync } from 'node:child_process';
import path from 'node:path';

import dotenv from 'dotenv';

const rootEnv = path.resolve(process.cwd(), '..', '..', '.env');
dotenv.config({ path: rootEnv });

const name = process.argv[2] ?? 'init';
const result = spawnSync(
  'npx',
  ['prisma', 'migrate', 'dev', '--name', name, '--schema=src/db/prisma/schema.prisma'],
  { stdio: 'inherit', env: process.env, shell: true }
);
process.exit(result.status ?? 1);
