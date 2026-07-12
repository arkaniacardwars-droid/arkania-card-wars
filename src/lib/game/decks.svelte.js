/*
 * Estado dos decks do jogador (5 decks de até 8 cartas) + posse da coleção.
 * Porte de prototype/js/lobby.js (POSSUI + decks) para Svelte 5 runes, com
 * persistência em localStorage. Ponto único de troca localStorage → Supabase.
 */
import { browser } from '$app/environment';
import * as Cards from './cards.js';

export const DECK_MAX = 8;
export const N_DECKS = 5;

const LS_KEY = 'arkania.decks.v1';
const LS_KEY_LEGADO = 'cardwars.decks.v1'; // pré-rebrand — migração transparente

// cartas que o JOGADOR possui (protótipo: subconjunto fixo).
// TODO: substituir por posse persistida no Supabase.
const POSSUI = new Set([
	'skeleton-red',
	'nagoy',
	'fox',
	'taichin',
	'kassandra',
	'lincon-cartola',
	'mago-negro',
	'siberian',
	'guardiao-saturno'
]);

function padrao() {
	return {
		decks: [
			['kassandra', 'mago-negro', 'guardiao-saturno', 'fox', 'taichin', 'siberian'],
			[],
			[],
			[],
			[]
		],
		nomes: ['Deck 1', 'Deck 2', 'Deck 3', 'Deck 4', 'Deck 5'],
		ativo: 0
	};
}

function carregar() {
	const base = padrao();
	if (!browser) return base;
	try {
		let raw = localStorage.getItem(LS_KEY);
		if (!raw) {
			// migra decks salvos sob a chave antiga (cardwars.*) uma única vez
			raw = localStorage.getItem(LS_KEY_LEGADO);
			if (raw) {
				localStorage.setItem(LS_KEY, raw);
				localStorage.removeItem(LS_KEY_LEGADO);
			}
		}
		if (!raw) return base;
		const s = JSON.parse(raw);
		if (s && Array.isArray(s.decks) && s.decks.length === N_DECKS) {
			// valida: só ids existentes, sem duplicar, até DECK_MAX por deck
			base.decks = s.decks.map((d) => {
				const out = [];
				(Array.isArray(d) ? d : []).forEach((id) => {
					if (Cards.porId(id) && out.indexOf(id) === -1 && out.length < DECK_MAX) out.push(id);
				});
				return out;
			});
		}
		if (s && Array.isArray(s.nomes) && s.nomes.length === N_DECKS) {
			base.nomes = s.nomes.map((n) => String(n).slice(0, 16) || 'Deck');
		}
		if (s && typeof s.ativo === 'number' && s.ativo >= 0 && s.ativo < N_DECKS) base.ativo = s.ativo;
	} catch {
		/* dados corrompidos — ignora e usa o padrão */
	}
	return base;
}

function criar() {
	const inicial = carregar();
	let decks = $state(inicial.decks);
	let nomes = $state(inicial.nomes);
	let ativo = $state(inicial.ativo);

	function salvar() {
		if (!browser) return;
		try {
			localStorage.setItem(LS_KEY, JSON.stringify({ decks, nomes, ativo }));
		} catch {
			/* localStorage indisponível — segue só em memória */
		}
	}

	return {
		get decks() {
			return decks;
		},
		get nomes() {
			return nomes;
		},
		get ativo() {
			return ativo;
		},
		get deckAtual() {
			return decks[ativo];
		},
		possui: (c) => POSSUI.has(typeof c === 'string' ? c : c.id),
		get totalPossui() {
			return Cards.todas().filter((c) => POSSUI.has(c.id)).length;
		},
		noDeck(c) {
			return decks[ativo].indexOf(c.id) !== -1;
		},
		setAtivo(i) {
			if (i >= 0 && i < N_DECKS) {
				ativo = i;
				salvar();
			}
		},
		toggle(c) {
			if (!POSSUI.has(c.id)) return;
			const d = decks[ativo];
			const i = d.indexOf(c.id);
			if (i !== -1) d.splice(i, 1); // já está → remove
			else if (d.length < DECK_MAX) d.push(c.id); // tem espaço → adiciona
			else return; // deck cheio → ignora
			decks = [...decks]; // reatribui p/ disparar reatividade do array externo
			salvar();
		},
		remover(c) {
			const d = decks[ativo];
			const i = d.indexOf(c.id);
			if (i === -1) return;
			d.splice(i, 1);
			decks = [...decks];
			salvar();
		},
		renomear(i, nome) {
			const v = String(nome).trim().slice(0, 16);
			if (v) {
				nomes[i] = v;
				nomes = [...nomes];
				salvar();
			}
		}
	};
}

export const decksStore = criar();
