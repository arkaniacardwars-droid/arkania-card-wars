/*
 * Pipeline de cartas do Arkania.
 *
 *   1. Escaneia as artes em static/assets/cartas/*.webp
 *   2. Toda arte NOVA (código sem entrada no manifesto) vira uma carta com
 *      valores PADRÃO em src/lib/game/cartas.json (ajuste raridade/stats/nome
 *      depois — o código/arquivo NÃO muda).
 *   3. Com a senha do banco, faz UPSERT de todas as cartas na tabela `cards`
 *      do Supabase (fonte da verdade online da posse/decks).
 *
 * Uso:
 *   npm run cartas                         # atualiza o manifesto + app (sem banco)
 *   SUPABASE_DB_PASSWORD=xxxx npm run cartas   # + sincroniza a tabela cards online
 *   SUPABASE_DB_URL="postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" npm run cartas
 *
 * O código (id) é FIXO e nomeia o arquivo + liga a carta à posse/decks; renomear
 * a carta no jogo troca só o `nome` (rótulo), nunca o arquivo.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARTES_DIR = join(root, 'static', 'assets', 'cartas');
const MANIFESTO = join(root, 'src', 'lib', 'game', 'cartas.json');

// stats padrão (raridade comum) — ajustáveis depois no manifesto/admin
const STATS_PADRAO = { ATA: 60, DEF: 55, FOR: 55, VEL: 60, ENE: 55, VID: 70 };

function titulo(slug) {
	return slug
		.split('-')
		.filter(Boolean)
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(' ');
}

function cartaPadrao(slug) {
	return {
		id: slug,
		base: slug,
		nome: titulo(slug),
		variante: 'Padrão',
		raridade: 'comum',
		tipo: 'HERO',
		dom: 'FOR',
		emoji: '🃏',
		arte: true,
		stats: { ...STATS_PADRAO },
		habilidades: []
	};
}

// ---- 1) escaneia as artes ----
const slugs = readdirSync(ARTES_DIR)
	.filter((f) => f.toLowerCase().endsWith('.webp'))
	.map((f) => f.replace(/\.webp$/i, ''))
	.sort();

// ---- 2) carrega manifesto e adiciona os novos ----
const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8'));
const existentes = new Set(manifesto.map((c) => c.id));

const novos = slugs.filter((s) => !existentes.has(s));
novos.forEach((s) => manifesto.push(cartaPadrao(s)));

// avisos úteis
const semArte = manifesto.filter((c) => c.arte === true && !slugs.includes(c.id));

if (novos.length) {
	writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2) + '\n');
	console.log(`+ ${novos.length} carta(s) NOVA(s) adicionada(s) ao manifesto (valores padrão):`);
	novos.forEach((s) => console.log(`    • ${s}  →  "${titulo(s)}" (comum/HERO — ajuste depois)`));
} else {
	console.log('Nenhuma arte nova. Manifesto já cobre todas as artes da pasta.');
}
if (semArte.length) {
	console.log(`! ${semArte.length} carta(s) no manifesto SEM arte na pasta:`);
	semArte.forEach((c) => console.log(`    • ${c.id}.webp (faltando)`));
}
console.log(`Total no catálogo: ${manifesto.length} cartas | Artes na pasta: ${slugs.length}`);

// ---- 3) sincroniza a tabela `cards` (só com credencial de banco) ----
const temCred = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_PASSWORD;
if (!temCred) {
	console.log(
		'\n(Banco não sincronizado — sem credencial.) Para publicar no `cards` online, rode:\n' +
			'    SUPABASE_DB_PASSWORD="sua-senha-do-postgres" npm run cartas'
	);
	process.exit(0);
}

const pg = (await import('pg')).default;
const client = process.env.SUPABASE_DB_URL
	? new pg.Client({
			connectionString: process.env.SUPABASE_DB_URL,
			ssl: { rejectUnauthorized: false }
		})
	: new pg.Client({
			host: process.env.SUPABASE_DB_HOST || 'db.xntxtdddkomcgzgvygss.supabase.co',
			port: 5432,
			database: 'postgres',
			user: 'postgres',
			password: process.env.SUPABASE_DB_PASSWORD,
			ssl: { rejectUnauthorized: false }
		});

await client.connect();
console.log('\nconectado ao banco ✓ — sincronizando tabela cards…');

const SQL = `insert into public.cards
  (id, base, nome, variante, raridade, tipo, dom, emoji, arte, stats, habilidades, ativa)
  values ($1,$2,$3,$4,$5::card_rarity,$6::card_type,$7::card_dom,$8,$9,$10::jsonb,$11::jsonb,true)
  on conflict (id) do update set
    base=excluded.base, nome=excluded.nome, variante=excluded.variante,
    raridade=excluded.raridade, tipo=excluded.tipo, dom=excluded.dom,
    emoji=excluded.emoji, arte=excluded.arte, stats=excluded.stats,
    habilidades=excluded.habilidades, ativa=true`;

let ok = 0;
for (const c of manifesto) {
	const arteFile = c.arte === true ? `${c.id}.webp` : c.arte || null;
	await client.query(SQL, [
		c.id,
		c.base,
		c.nome,
		c.variante || 'Padrão',
		c.raridade,
		c.tipo || 'HERO',
		c.dom,
		c.emoji || null,
		arteFile,
		JSON.stringify(c.stats),
		JSON.stringify(c.habilidades || [])
	]);
	ok++;
}
const t = await client.query('select count(*)::int as n from public.cards');
await client.end();
console.log(`cards sincronizadas: ${ok} upserts | tabela agora tem ${t.rows[0].n} cartas ✓`);
