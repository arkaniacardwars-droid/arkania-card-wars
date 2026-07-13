/*
 * Perfil do jogador — agora persistido no Supabase (tabela `profiles`), para o
 * usuário logado. Fase 2 da camada online (antes era localStorage).
 *
 * Fluxo: o `profile` é carregado no server (+layout.server.ts) e injetado via
 * `init(supabase, user, row)` no client; mutações (salvar / registrarPartida)
 * atualizam o estado de forma otimista e persistem via `supabase.from('profiles')`.
 *
 * Mapa DB → estado:
 *   username → nome · foto_card → foto · bio → bio · created_at → criadoEm
 *   partidas/vitorias/derrotas/uso_cartas → stats
 */
import * as Cards from './cards.js';

const NOME_MAX = 20;
const BIO_MAX = 240;
const NOME_PADRAO = 'Duelista';

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

function criar() {
	let perfil = $state({ nome: NOME_PADRAO, foto: null, bio: '', criadoEm: null });
	let stats = $state({ partidas: 0, vitorias: 0, derrotas: 0, usoCartas: {} });
	let sb = null; // cliente Supabase (do +layout.ts)
	let uid = null; // id do usuário logado

	function hidratar(row) {
		if (!row) return;
		perfil = {
			nome: typeof row.username === 'string' && row.username.trim() ? row.username : NOME_PADRAO,
			foto: typeof row.foto_card === 'string' && Cards.porId(row.foto_card) ? row.foto_card : null,
			bio: typeof row.bio === 'string' ? row.bio : '',
			criadoEm: row.created_at || null
		};
		stats = {
			partidas: row.partidas | 0,
			vitorias: row.vitorias | 0,
			derrotas: row.derrotas | 0,
			usoCartas: row.uso_cartas && typeof row.uso_cartas === 'object' ? row.uso_cartas : {}
		};
	}

	return {
		// chamado no client (+page.svelte) com o cliente Supabase + profile do server
		init(supabase, user, row) {
			sb = supabase;
			uid = user?.id ?? null;
			if (row) hidratar(row);
		},
		hidratar,

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

		// salva nome/foto/bio (otimista + persiste). Retorna { ok, error }.
		async salvar({ nome, foto, bio }) {
			const novo = {
				nome: String(nome ?? '').trim().slice(0, NOME_MAX) || NOME_PADRAO,
				foto: foto && Cards.porId(foto) ? foto : null,
				bio: String(bio ?? '').trim().slice(0, BIO_MAX),
				criadoEm: perfil.criadoEm
			};
			const anterior = perfil;
			perfil = novo; // otimista
			if (!sb || !uid) return { ok: true };
			const { error } = await sb
				.from('profiles')
				.update({ username: novo.nome, foto_card: novo.foto, bio: novo.bio })
				.eq('id', uid);
			if (error) perfil = anterior; // rollback (ex.: username duplicado)
			return { ok: !error, error };
		},

		// registra o resultado de um duelo (chamado pelo Duelo ao fim da partida)
		async registrarPartida(venceu, cartaId) {
			const s = {
				partidas: stats.partidas + 1,
				vitorias: stats.vitorias + (venceu ? 1 : 0),
				derrotas: stats.derrotas + (venceu ? 0 : 1),
				usoCartas: { ...stats.usoCartas }
			};
			if (cartaId && Cards.porId(cartaId)) s.usoCartas[cartaId] = (s.usoCartas[cartaId] | 0) + 1;
			stats = s;
			if (!sb || !uid) return;
			await sb
				.from('profiles')
				.update({
					partidas: s.partidas,
					vitorias: s.vitorias,
					derrotas: s.derrotas,
					uso_cartas: s.usoCartas
				})
				.eq('id', uid);
		}
	};
}

export const perfilStore = criar();
