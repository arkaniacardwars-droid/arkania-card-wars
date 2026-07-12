/*
 * Camada de dados das cartas (banco local). Aplica por cima do seed do catálogo
 * (cards.js) os ajustes salvos pelo painel admin. Porte de prototype/js/store.js.
 *
 * Hoje persiste em localStorage (`arkania.cards.v1`); migrar para Supabase =
 * reescrever só ler()/gravar() aqui, sem tocar no resto do jogo nem no admin.
 *
 * Campos editáveis por carta: nome, tipo (HERO|SUPP), raridade, stats, habilidades[].
 */
import { browser } from '$app/environment';
import * as Cards from './cards.js';

const KEY = 'arkania.cards.v1';
const CAMPOS = ['nome', 'tipo', 'raridade', 'stats', 'habilidades'];

function ler() {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(KEY)) || {};
	} catch {
		return {};
	}
}
function gravar(obj) {
	if (!browser) return;
	try {
		localStorage.setItem(KEY, JSON.stringify(obj));
	} catch {
		/* indisponível */
	}
}

// aplica os ajustes salvos por cima de uma carta do catálogo (em memória)
function aplicar(carta, dados) {
	if (!dados) return;
	if (typeof dados.nome === 'string' && dados.nome.trim()) carta.nome = dados.nome.trim();
	if (dados.tipo === 'HERO' || dados.tipo === 'SUPP') carta.tipo = dados.tipo;
	if (dados.raridade && Cards.RARIDADES[dados.raridade]) carta.raridade = dados.raridade;
	if (dados.stats) {
		Cards.ATTR_ORDEM.forEach((k) => {
			if (typeof dados.stats[k] === 'number')
				carta.stats[k] = Math.max(
					Cards.statMin(k),
					Math.min(Cards.statMax(k, carta.raridade), Math.round(dados.stats[k]))
				);
		});
	}
	if (Array.isArray(dados.habilidades)) {
		carta.habilidades = dados.habilidades.map((h) => String(h)).filter((h) => h.trim());
	}
	Cards.normalizar(carta);
}

// patcha o catálogo com o que está salvo (chamado no client ao carregar o módulo)
export function aplicarEditsSalvos() {
	const saved = ler();
	Object.keys(saved).forEach((id) => {
		const c = Cards.porId(id);
		if (c) aplicar(c, saved[id]);
	});
}
if (browser) aplicarEditsSalvos();

// salva os campos editáveis de uma carta (aplica em memória + persiste)
export function salvarCarta(id, dados) {
	const c = Cards.porId(id);
	if (!c) return null;
	aplicar(c, dados);
	const saved = ler();
	saved[id] = {};
	CAMPOS.forEach((k) => {
		if (k === 'stats') {
			saved[id].stats = {};
			Cards.ATTR_ORDEM.forEach((s) => (saved[id].stats[s] = c.stats[s]));
		} else saved[id][k] = c[k];
	});
	gravar(saved);
	return c;
}

// reverte uma carta ao seed (remove o ajuste salvo) — exige reload p/ refletir
export function resetarCarta(id) {
	const saved = ler();
	delete saved[id];
	gravar(saved);
}

// limpa tudo (volta o catálogo ao seed) — exige reload
export function resetarTudo() {
	if (!browser) return;
	try {
		localStorage.removeItem(KEY);
	} catch {
		/* indisponível */
	}
}

// exporta os ajustes salvos (p/ virar seed/commit ou subir pro backend)
export function exportar() {
	return JSON.stringify(ler(), null, 2);
}
