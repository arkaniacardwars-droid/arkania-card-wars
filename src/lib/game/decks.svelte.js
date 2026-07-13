/*
 * Decks do jogador (5 slots de até 8 cartas) + posse da coleção — agora
 * persistidos no Supabase (tabelas `decks` e `player_cards`), para o usuário
 * logado. Fase 2 da camada online (antes era localStorage).
 *
 * Fluxo: `decks` e `owned` são carregados no server (+page.server.ts, que também
 * semeia o jogador novo) e injetados via `init()` no client; mutações atualizam
 * o estado de forma otimista e persistem via `supabase.from('decks')`.
 */
import * as Cards from './cards.js';

export const DECK_MAX = 8;
export const N_DECKS = 5;

function nomePadrao(s) {
	return `Deck ${s + 1}`;
}

function criar() {
	let decks = $state([[], [], [], [], []]);
	let nomes = $state([0, 1, 2, 3, 4].map(nomePadrao));
	let ativo = $state(0);
	let owned = $state(new Set());
	let sb = null; // cliente Supabase
	let uid = null; // id do usuário logado

	function hidratar(deckRows, ownedIds) {
		const d = [[], [], [], [], []];
		const n = [0, 1, 2, 3, 4].map(nomePadrao);
		let at = 0;
		(deckRows ?? []).forEach((r) => {
			const s = r.slot | 0;
			if (s < 0 || s >= N_DECKS) return;
			d[s] = Array.isArray(r.cartas) ? r.cartas.filter((id) => Cards.porId(id)).slice(0, DECK_MAX) : [];
			n[s] = String(r.nome || nomePadrao(s)).slice(0, 16);
			if (r.ativo) at = s;
		});
		decks = d;
		nomes = n;
		ativo = at;
		owned = new Set(ownedIds ?? []);
	}

	// upsert do slot inteiro (cartas + nome + flag ativo)
	async function persistirSlot(s) {
		if (!sb || !uid) return;
		await sb
			.from('decks')
			.upsert(
				{ player_id: uid, slot: s, nome: nomes[s], cartas: decks[s], ativo: s === ativo },
				{ onConflict: 'player_id,slot' }
			);
	}

	return {
		// hidrata só quando o usuário muda (evita clobber de edições ao invalidar)
		init(supabase, user, deckRows, ownedIds) {
			sb = supabase;
			const novoUid = user?.id ?? null;
			if (novoUid !== uid) {
				uid = novoUid;
				hidratar(deckRows, ownedIds);
			}
		},
		hidratar,

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
		possui: (c) => owned.has(typeof c === 'string' ? c : c.id),
		get totalPossui() {
			return owned.size;
		},
		noDeck(c) {
			return decks[ativo].indexOf(c.id) !== -1;
		},

		async setAtivo(i) {
			if (i < 0 || i >= N_DECKS || i === ativo) return;
			ativo = i;
			if (!sb || !uid) return;
			await sb.from('decks').update({ ativo: false }).eq('player_id', uid);
			await sb.from('decks').update({ ativo: true }).eq('player_id', uid).eq('slot', i);
		},

		toggle(c) {
			if (!owned.has(c.id)) return;
			const d = decks[ativo];
			const i = d.indexOf(c.id);
			if (i !== -1) d.splice(i, 1); // já está → remove
			else if (d.length < DECK_MAX) d.push(c.id); // tem espaço → adiciona
			else return; // deck cheio
			decks = [...decks];
			persistirSlot(ativo);
		},

		remover(c) {
			const d = decks[ativo];
			const i = d.indexOf(c.id);
			if (i === -1) return;
			d.splice(i, 1);
			decks = [...decks];
			persistirSlot(ativo);
		},

		renomear(i, nome) {
			const v = String(nome).trim().slice(0, 16);
			if (!v) return;
			nomes[i] = v;
			nomes = [...nomes];
			if (sb && uid) sb.from('decks').update({ nome: v }).eq('player_id', uid).eq('slot', i);
		}
	};
}

export const decksStore = criar();
