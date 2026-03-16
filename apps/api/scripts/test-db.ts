import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '..', '..', '..', '.env');
dotenv.config({ path: rootEnv });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Erro: DATABASE_URL não definida. Configure no .env na raiz do projeto.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function testDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as now, current_database() as db');
    const row = result.rows[0] as { now: Date; db: string };
    console.log('Conexão com PostgreSQL OK');
    console.log('  Banco:', row.db);
    console.log('  Servidor (NOW):', row.now);
    const versionResult = await client.query('SELECT version()');
    console.log('  Versão:', (versionResult.rows[0] as { version: string }).version.split('\n')[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabase().catch((err) => {
  console.error('Falha ao conectar no banco:', err.message);
  process.exit(1);
});
