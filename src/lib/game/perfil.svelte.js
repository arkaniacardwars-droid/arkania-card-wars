/*
 * Perfil do jogador: nome, foto (id de carta), bio, data de criação, e
 * estatísticas (partidas/vitórias/derrotas + uso de cartas). Porte de
 * prototype/js/perfil.js para Svelte 5 runes, persistindo em localStorage.
 * Ponto único de troca localStorage → Supabase.
 *
 *   arkania.perfil.v1 = { nome, foto: <idCarta>|null, bio, criadoEm }
 *   arkania.stats.v1  = { partidas, vitorias, derrotas, usoCartas: { <id>: n } }
 */
import { browser } from '$app/environment';
import * as Cards from './cards.js';

const K_PERFIL = 'arkania.perfil.v1';
const K_STATS = 'arkania.stats.v1';
const NOME_MAX = 20;
const BIO_MAX = 240;
const NOME_PADRAO = 'Duelista';

function lerJSON(k, fallback) {
	if (!browser) return fallback;
	try {
		return JSON.parse(localStorage.getItem(k)) || fallback;
	} catch {
		return fallback;
	}
}
function gravarJSON(k, obj) {
	if (!browser) return;
	try {
		localStorage.setItem(k, JSON.stringify(obj));
	} catch {
		/* indisponível — segue em memória */
	}
}

export function formatarData(ts) {
	if (!ts) return '';
	try {
		return new Date(ts).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	} catch {
		return '';
	}
}

function lerPerfil() {
	const p = lerJSON(K_PERFIL, {});
	return {
		nome: typeof p.nome === 'string' && p.nome.trim() ? p.nome.trim().slice(0, NOME_MAX) : NOME_PADRAO,
		foto: typeof p.foto === 'string' && Cards.porId(p.foto) ? p.foto : null,
		bio: typeof p.bio === 'string' ? p.bio : '',
		criadoEm: typeof p.criadoEm === 'number' ? p.criadoEm : null
	};
}

function lerStats() {
	const s = lerJSON(K_STATS, {});
	return {
		partidas: s.partidas | 0,
		vitorias: s.vitorias | 0,
		derrotas: s.derrotas | 0,
		usoCartas: s.usoCartas && typeof s.usoCartas === 'object' ? s.usoCartas : {}
	};
}

function criar() {
	let perfil = $state(lerPerfil());
	let stats = $state(lerStats());

	// carimba a data de criação da conta na 1ª vez (protótipo local)
	if (browser && !perfil.criadoEm) {
		perfil = { ...perfil, criadoEm: Date.now() };
		gravarJSON(K_PERFIL, perfil);
	}

	return {
		get nome() {
			return perfil.nome;
		},
		get foto() {
			return perfil.foto;
		},
		get bio() {
			return perfil.bio;
		},
		get criadoEm() {
			return perfil.criadoEm;
		},
		get stats() {
			return stats;
		},
		get taxa() {
			return stats.partidas ? Math.round((stats.vitorias / stats.partidas) * 100) : 0;
		},
		topCartas(n = 3) {
			const uso = stats.usoCartas;
			return Object.keys(uso)
				.map((id) => ({ carta: Cards.porId(id), usos: uso[id] | 0 }))
				.filter((o) => o.carta && o.usos > 0)
				.sort((a, b) => b.usos - a.usos)
				.slice(0, n);
		},
		salvar({ nome, foto, bio }) {
			const p = { ...perfil };
			if (typeof nome === 'string') {
				const n = nome.trim().slice(0, NOME_MAX);
				p.nome = n || NOME_PADRAO;
			}
			p.foto = foto && Cards.porId(foto) ? foto : null;
			if (typeof bio === 'string') p.bio = bio.trim().slice(0, BIO_MAX);
			if (!p.criadoEm) p.criadoEm = Date.now();
			perfil = p;
			gravarJSON(K_PERFIL, p);
			return p;
		},
		// chamado pelo duelo (quando portado) para registrar resultado + uso de carta
		registrarPartida(venceu, cartaId) {
			const s = { ...stats, usoCartas: { ...stats.usoCartas } };
			s.partidas += 1;
			if (venceu) s.vitorias += 1;
			else s.derrotas += 1;
			if (cartaId && Cards.porId(cartaId)) s.usoCartas[cartaId] = (s.usoCartas[cartaId] | 0) + 1;
			stats = s;
			gravarJSON(K_STATS, s);
		}
	};
}

export const perfilStore = criar();
