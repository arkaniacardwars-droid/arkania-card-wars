import type { PageServerLoad } from './$types';
import * as Cards from '$lib/game/cards.js';

const N_DECKS = 5;
const DECK_MAX = 8;
const CARTAS_INICIAIS = 7; // posse inicial do jogador novo (aleatórias)

/**
 * Carrega a posse de cartas (player_cards) e os decks do jogador logado.
 * No 1º acesso, semeia 7 cartas aleatórias e cria os 5 slots de deck
 * (slot 0 = baralho inicial com o que possui). Tudo respeitando RLS
 * (locals.supabase age como o usuário logado).
 */
export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) return { owned: [], decks: [] };

	// ---- posse de cartas ----
	const { data: pcs } = await supabase
		.from('player_cards')
		.select('card_id')
		.eq('player_id', user.id);
	let owned: string[] = (pcs ?? []).map((r) => r.card_id);

	if (owned.length === 0) {
		// semeia CARTAS_INICIAIS cartas aleatórias — o pool vem da tabela `cards`
		// (fonte da verdade online), p/ não referenciar id que ainda não foi
		// sincronizado (evita violar a FK de player_cards). Fallback: seed local.
		const { data: catalogo } = await supabase.from('cards').select('id').eq('ativa', true);
		const pool = (catalogo && catalogo.length ? catalogo.map((r) => r.id) : Cards.todas().map((c) => c.id));
		const escolhidas: string[] = [];
		for (let i = 0; i < CARTAS_INICIAIS && pool.length; i++) {
			escolhidas.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
		}
		const rows = escolhidas.map((id) => ({ player_id: user.id, card_id: id, quantidade: 1 }));
		const { error } = await supabase.from('player_cards').insert(rows);
		if (!error) owned = escolhidas;
	}

	// ---- decks ----
	const { data: deckRows } = await supabase
		.from('decks')
		.select('slot,nome,cartas,ativo')
		.eq('player_id', user.id)
		.order('slot');

	let decks = deckRows ?? [];
	if (decks.length === 0) {
		// cria os 5 slots; slot 0 = baralho inicial com as cartas que possui
		const inicial = owned.slice(0, DECK_MAX);
		const novos = [];
		for (let s = 0; s < N_DECKS; s++) {
			novos.push({
				player_id: user.id,
				slot: s,
				nome: `Deck ${s + 1}`,
				cartas: s === 0 ? inicial : [],
				ativo: s === 0
			});
		}
		const { error } = await supabase.from('decks').insert(novos);
		if (!error) {
			decks = novos.map(({ slot, nome, cartas, ativo }) => ({ slot, nome, cartas, ativo }));
		}
	}

	return { owned, decks };
};
