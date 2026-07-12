/*
 * Aplica as migrações SQL de supabase/migrations/ direto no Postgres do Supabase.
 * Usa a connection string DIRETA (IPv6) com a senha via env — NÃO precisa de CLI.
 *
 *   SUPABASE_DB_URL="postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" \
 *     node scripts/db-push.mjs                # aplica todas as migrations, em ordem
 *   ... node scripts/db-push.mjs supabase/migrations/0003_x.sql   # ou arquivos específicos
 *
 * (a senha com @ em URL vira %40; ou use SUPABASE_DB_PASSWORD + host abaixo)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const client = process.env.SUPABASE_DB_URL
	? new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
	: new Client({
			host: process.env.SUPABASE_DB_HOST || 'db.xntxtdddkomcgzgvygss.supabase.co',
			port: 5432,
			database: 'postgres',
			user: 'postgres',
			password: process.env.SUPABASE_DB_PASSWORD,
			ssl: { rejectUnauthorized: false }
		});

if (!process.env.SUPABASE_DB_URL && !process.env.SUPABASE_DB_PASSWORD) {
	throw new Error('defina SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD');
}

const migDir = join(root, 'supabase', 'migrations');
const files = process.argv.slice(2).length
	? process.argv.slice(2).map((f) => resolve(root, f))
	: readdirSync(migDir)
			.filter((f) => f.endsWith('.sql'))
			.sort()
			.map((f) => join(migDir, f));

await client.connect();
console.log('conectado ✓');
for (const f of files) {
	await client.query(readFileSync(f, 'utf8'));
	console.log('APLICADO:', f.replace(root + '/', ''));
}
const t = await client.query(
	"select table_name from information_schema.tables where table_schema='public' order by 1"
);
console.log('TABELAS:', t.rows.map((r) => r.table_name).join(', '));
await client.end();
console.log('pronto ✓');
