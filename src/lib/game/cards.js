/*
 * Arkania Card Wars — CATÁLOGO de cartas (SEED). A fonte da verdade em runtime
 * passa a ser o Supabase (tabela `cards`); este seed espelha js/cards.js do
 * protótipo e serve de fallback/offline. Ao ligar o backend, troque `todas()`
 * por uma leitura do Supabase mantendo o mesmo formato de carta.
 *
 * Modelo da carta:
 *   {
 *     id, base, nome, variante, raridade, emoji, arte, dom,
 *     tipo:   'HERO' | 'SUPP',                 // HERO = Herói, SUPP = Suporte
 *     stats:  { ATA, DEF, FOR, VEL, ENE, VID },// 6 habilidades (0–99)
 *     habilidades: [ 'texto da habilidade', ... ]  // descrições (a definir)
 *   }
 *   nota(c) = média das 6 habilidades (bandeirinha).
 */

export const RARIDADES = {
	comum: { nome: 'Comum', cor: '#9aa0a6', ordem: 1 },
	incomum: { nome: 'Incomum', cor: '#2f9e56', ordem: 2 },
	raro: { nome: 'Raro', cor: '#2e6da4', ordem: 3 },
	epico: { nome: 'Épico', cor: '#8e44ad', ordem: 4 },
	mitica: { nome: 'Mítica', cor: '#e5484d', ordem: 5 },
	lendario: { nome: 'Lendário', cor: '#d4af37', ordem: 6 }
};

export const TIPOS = { HERO: 'Herói', SUPP: 'Suporte' };

// habilidades exibidas na carta — VID no meio (destaques ATA/VID/ENE nas pontas e centro)
export const ATTR_ORDEM = ['ATA', 'DEF', 'VID', 'VEL', 'ENE'];
export const ATTR_NOME = {
	ATA: 'Ataque',
	DEF: 'Defesa',
	FOR: 'Força',
	VEL: 'Velocidade',
	ENE: 'Energia',
	VID: 'Vida'
};
export const ATTR_COR = {
	ATA: '#ff5d52',
	DEF: '#3d9be0',
	FOR: '#e0862f',
	VEL: '#f0c033',
	ENE: '#9b7bff',
	VID: '#3fcf7a'
};
// teto de NOTA por raridade — também é o teto dos stats (menos VIDA)
const NOTA_MAX = { comum: 80, incomum: 85, raro: 90, epico: 95, mitica: 100, lendario: 105 };
export function notaMax(raridade) {
	return NOTA_MAX[raridade] != null ? NOTA_MAX[raridade] : 100;
}
// teto de VIDA por raridade
const VID_MAX = { comum: 100, incomum: 125, raro: 150, epico: 175, mitica: 200, lendario: 250 };
export function vidMax(raridade) {
	return VID_MAX[raridade] != null ? VID_MAX[raridade] : 250;
}
// faixas por habilidade: VIDA 1 até o teto da raridade; as demais 0 até o teto de nota
export function statMin(k) {
	return k === 'VID' ? 1 : 0;
}
export function statMax(k, raridade) {
	return k === 'VID' ? vidMax(raridade) : notaMax(raridade);
}

function clamp(v, lo, hi) {
	return v < lo ? lo : v > hi ? hi : v;
}

// stats-semente derivados dos valores antigos (só p/ começar variado; ajustáveis no admin)
function seed(a) {
	a = a || { FOR: 5, VEL: 5, INT: 5, DEF: 5 };
	return {
		ATA: clamp(40 + a.FOR * 6, 30, 99),
		DEF: clamp(35 + a.DEF * 6, 30, 99),
		FOR: clamp(28 + a.FOR * 6, 20, 99),
		VEL: clamp(35 + a.VEL * 6, 20, 99),
		ENE: clamp(34 + a.INT * 6, 20, 99),
		VID: clamp(48 + a.DEF * 4, 40, 99)
	};
}

// ---------------- CATÁLOGO (seed) ----------------
export const COLECAO = [
	{ id: 'skeleton-red', base: 'skeleton', nome: 'Skeleton Red', variante: 'Padrão', raridade: 'comum', emoji: '💀', arte: true, dom: 'FOR', tipo: 'HERO', stats: seed({ FOR: 8, VEL: 6, INT: 3, DEF: 5 }), habilidades: [] },
	{ id: 'nagoy', base: 'nagoy', nome: 'Nagoy', variante: 'Padrão', raridade: 'comum', emoji: '👤', arte: true, dom: 'FOR', tipo: 'HERO', stats: seed({ FOR: 9, VEL: 5, INT: 3, DEF: 5 }), habilidades: [] },
	{ id: 'dragao-de-fogo', base: 'dragao', nome: 'Dragão de Fogo', variante: 'Fogo', raridade: 'epico', emoji: '🐉', arte: true, dom: 'FOR', tipo: 'HERO', stats: seed({ FOR: 10, VEL: 6, INT: 3, DEF: 5 }), habilidades: [] },
	{ id: 'urso-cyborg', base: 'urso', nome: 'Urso Cyborg', variante: 'Padrão', raridade: 'epico', emoji: '🐻', arte: true, dom: 'FOR', tipo: 'HERO', stats: seed({ FOR: 10, VEL: 4, INT: 3, DEF: 7 }), habilidades: [] },

	{ id: 'fox', base: 'fox', nome: 'Fox Cyborg', variante: 'Padrão', raridade: 'incomum', emoji: '🦊', arte: true, dom: 'VEL', tipo: 'HERO', stats: seed({ FOR: 5, VEL: 9, INT: 4, DEF: 4 }), habilidades: [] },
	{ id: 'skeleton-red-1', base: 'skeleton', nome: 'Esqueleto Ceifador', variante: 'Ceifador', raridade: 'incomum', emoji: '☠️', arte: true, dom: 'VEL', tipo: 'HERO', stats: seed({ FOR: 6, VEL: 9, INT: 3, DEF: 4 }), habilidades: [] },
	{ id: 'taichin', base: 'taichin', nome: 'Taichin', variante: 'Padrão', raridade: 'raro', emoji: '🥋', arte: true, dom: 'VEL', tipo: 'HERO', stats: seed({ FOR: 5, VEL: 10, INT: 5, DEF: 3 }), habilidades: [] },
	{ id: 'kassandra', base: 'kassandra', nome: 'Kassandra', variante: 'Padrão', raridade: 'epico', emoji: '⚔️', arte: true, dom: 'VEL', tipo: 'HERO', stats: seed({ FOR: 6, VEL: 10, INT: 4, DEF: 4 }), habilidades: [] },

	{ id: 'lincon-cartola', base: 'lincon', nome: 'Lincon Cartola', variante: 'Padrão', raridade: 'incomum', emoji: '🎩', arte: true, dom: 'INT', tipo: 'SUPP', stats: seed({ FOR: 3, VEL: 5, INT: 9, DEF: 5 }), habilidades: [] },
	{ id: 'eringes', base: 'eringes', nome: 'Eringes', variante: 'Padrão', raridade: 'raro', emoji: '✨', arte: true, dom: 'INT', tipo: 'SUPP', stats: seed({ FOR: 4, VEL: 4, INT: 10, DEF: 5 }), habilidades: [] },
	{ id: 'mago-negro', base: 'mago', nome: 'Mago Negro', variante: 'Padrão', raridade: 'lendario', emoji: '🧙', arte: true, dom: 'INT', tipo: 'HERO', stats: seed({ FOR: 3, VEL: 5, INT: 11, DEF: 5 }), habilidades: [] },
	{ id: 'dragao-branco', base: 'dragao', nome: 'Dragão Branco', variante: 'Branco', raridade: 'lendario', emoji: '🐲', arte: true, dom: 'INT', tipo: 'HERO', stats: seed({ FOR: 4, VEL: 4, INT: 11, DEF: 5 }), habilidades: [] },

	{ id: 'siberian', base: 'siberian', nome: 'Siberian', variante: 'Padrão', raridade: 'raro', emoji: '🐅', arte: true, dom: 'DEF', tipo: 'HERO', stats: seed({ FOR: 5, VEL: 4, INT: 5, DEF: 9 }), habilidades: [] },
	{ id: 'rison-egito', base: 'rison', nome: 'Rison do Egito', variante: 'Padrão', raridade: 'raro', emoji: '🏺', arte: true, dom: 'DEF', tipo: 'SUPP', stats: seed({ FOR: 4, VEL: 3, INT: 6, DEF: 9 }), habilidades: [] },
	{ id: 'guardiao-saturno', base: 'guardiao-saturno', nome: 'Guardião de Saturno', variante: 'Padrão', raridade: 'epico', emoji: '🪐', arte: true, dom: 'DEF', tipo: 'HERO', stats: seed({ FOR: 5, VEL: 3, INT: 6, DEF: 10 }), habilidades: [] }
];

// normaliza: garante stats/tipo/habilidades e um alias `attrs` (o motor lê ATA/DEF/VEL/ENE/VID daqui)
export function normalizar(c) {
	if (!c.stats) c.stats = seed();
	if (!c.tipo) c.tipo = 'HERO';
	if (!c.habilidades) c.habilidades = [];
	// clampa cada habilidade à faixa da raridade (não-VIDA ≤ teto; VIDA 1–250)
	ATTR_ORDEM.forEach(function (k) {
		c.stats[k] = Math.max(statMin(k), Math.min(statMax(k, c.raridade), Math.round(c.stats[k] | 0)));
	});
	c.attrs = c.stats; // motor de combate usa ATA/DEF/VEL/ENE/VID
	return c;
}
COLECAO.forEach(normalizar);

// ---------------- consultas ----------------
export function todas() {
	return COLECAO.slice();
}
export function porId(id) {
	for (var i = 0; i < COLECAO.length; i++) if (COLECAO[i].id === id) return COLECAO[i];
	return null;
}
export function porBase() {
	var mapa = {},
		ordem = [];
	COLECAO.forEach(function (c) {
		if (!mapa[c.base]) {
			mapa[c.base] = [];
			ordem.push(c.base);
		}
		mapa[c.base].push(c);
	});
	return ordem.map(function (b) {
		return { base: b, cartas: mapa[b] };
	});
}
export function raridadeInfo(r) {
	return RARIDADES[r] || RARIDADES.comum;
}

export function atributos(c) {
	return c.stats;
}
// nota NORMALIZADA dentro do teto da raridade: média das habilidades relativas ao
// seu máximo (não-VIDA sobre o teto da raridade; VIDA sobre 250), × teto. Tudo no
// máximo = nota máxima da raridade (80/85/90/95/100/105).
export function nota(c) {
	var cap = notaMax(c.raridade),
		s = c.stats,
		soma = 0;
	ATTR_ORDEM.forEach(function (k) {
		soma += (s[k] | 0) / statMax(k, c.raridade);
	});
	return Math.min(cap, Math.round((soma / ATTR_ORDEM.length) * cap));
}
export function tipo(c) {
	return c.tipo || 'HERO';
}
export function tipoNome(c) {
	return TIPOS[tipo(c)] || 'Herói';
}

// ---------------- decks ----------------
export function deckPadrao() {
	return ['kassandra', 'mago-negro', 'urso-cyborg', 'fox', 'guardiao-saturno'].map(porId);
}
export function deckAleatorio(n, rng) {
	rng = rng || Math.random;
	var pool = COLECAO.slice(),
		out = [];
	n = n || 5;
	for (var i = 0; i < n && pool.length; i++)
		out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
	return out;
}

// ---------------- arte ----------------
// Assets servidos de static/ → caminho absoluto a partir da raiz do site.
export function urlArte(c) {
	if (!c.arte) return null;
	var a = c.arte === true ? c.id + '.webp' : c.arte;
	if (a.indexOf('/') !== -1) return a;
	if (a.indexOf('.') === -1) a += '.webp';
	return '/assets/cartas/' + a;
}

// ---------------- classes CSS (para render em Svelte/HTML) ----------------
export function classes(c, extra) {
	return (
		'carta dom-' + c.dom + ' rar-' + c.raridade + (c.arte ? ' full' : '') + (extra ? ' ' + extra : '')
	);
}

const api = {
	RARIDADES,
	TIPOS,
	COLECAO,
	ATTR_ORDEM,
	ATTR_NOME,
	ATTR_COR,
	statMin,
	statMax,
	notaMax,
	vidMax,
	todas,
	porId,
	porBase,
	raridadeInfo,
	atributos,
	nota,
	tipo,
	tipoNome,
	normalizar,
	deckPadrao,
	deckAleatorio,
	classes,
	urlArte
};

export default api;
