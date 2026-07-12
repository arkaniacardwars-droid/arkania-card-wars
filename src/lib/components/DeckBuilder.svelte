<!--
  Construtor de Deck + Coleção. Porte de prototype/js/lobby.js
  (montarDeckSlots / montarMeuDeck / montarFiltros / montarColecao).
-->
<script>
	import * as Cards from '$lib/game/cards.js';
	import { decksStore, DECK_MAX, N_DECKS } from '$lib/game/decks.svelte.js';
	import Carta from './Carta.svelte';

	let { onVoltar } = $props();

	// ---- filtro por raridade ----
	let filtroRar = $state('todas');
	const filtros = [
		['todas', 'Todas'],
		...Object.keys(Cards.RARIDADES)
			.sort((a, b) => Cards.RARIDADES[a].ordem - Cards.RARIDADES[b].ordem)
			.map((r) => [r, Cards.RARIDADES[r].nome])
	];

	// ---- ordenação (cicla no botão) ----
	const ORDENS = ['alfabetica', 'rar-cresc', 'rar-desc'];
	const ORDEM_LBL = { alfabetica: '⇅ A–Z', 'rar-cresc': '⇅ Raridade ↑', 'rar-desc': '⇅ Raridade ↓' };
	let ordem = $state('alfabetica');
	function ciclarOrdem() {
		ordem = ORDENS[(ORDENS.indexOf(ordem) + 1) % ORDENS.length];
	}

	function ordenar(lista) {
		return lista.slice().sort((a, b) => {
			if (ordem === 'alfabetica') return a.nome.localeCompare(b.nome, 'pt-BR');
			const oa = Cards.RARIDADES[a.raridade].ordem,
				ob = Cards.RARIDADES[b.raridade].ordem;
			if (oa !== ob) return ordem === 'rar-desc' ? ob - oa : oa - ob;
			return a.nome.localeCompare(b.nome, 'pt-BR');
		});
	}

	const catalogo = $derived(
		Cards.todas().filter((c) => filtroRar === 'todas' || c.raridade === filtroRar)
	);
	const possuidas = $derived(ordenar(catalogo.filter((c) => decksStore.possui(c))));
	const naoObtidas = $derived(ordenar(catalogo.filter((c) => !decksStore.possui(c))));

	const contagem = $derived(decksStore.totalPossui + '/' + Cards.todas().length);

	// ---- renomear deck inline ----
	let editando = $state(-1);
	let editValor = $state('');
	function abrirRename(i) {
		editando = i;
		editValor = decksStore.nomes[i];
	}
	function salvarRename() {
		if (editando >= 0) {
			decksStore.renomear(editando, editValor);
			editando = -1;
		}
	}

	// ícone de pena (SVG dourado via currentColor)
	const SVG_PENA =
		'M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z';
</script>

<section id="tela-colecao" class="tela ativa">
	<div class="col-top">
		<button class="btn" onclick={() => onVoltar?.()}>‹ Voltar</button>
		<div class="titulo">Construtor de Deck</div>
		<div class="col-contagem">{contagem}</div>
	</div>

	<div class="col-corpo">
		<!-- 5 slots de deck -->
		<div class="deck-slots">
			{#each Array(N_DECKS) as _, i (i)}
				<button
					class="deck-slot-btn"
					class:ativo={i === decksStore.ativo}
					onclick={() => decksStore.setAtivo(i)}
				>
					<span class="ds-topo">
						{#if editando === i}
							<!-- svelte-ignore a11y_autofocus -->
							<input
								class="ds-nome-edit"
								type="text"
								maxlength="16"
								autofocus
								bind:value={editValor}
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										salvarRename();
									} else if (e.key === 'Escape') {
										editando = -1;
									}
								}}
								onblur={salvarRename}
							/>
						{:else}
							<span class="ds-nome">{decksStore.nomes[i]}</span>
							<span
								class="deck-ren"
								role="button"
								tabindex="0"
								title="Renomear deck"
								onclick={(e) => {
									e.stopPropagation();
									abrirRename(i);
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.stopPropagation();
										abrirRename(i);
									}
								}}
							>
								<svg
									viewBox="0 0 24 24"
									width="12"
									height="12"
									fill="none"
									stroke="currentColor"
									stroke-width="2.2"
									stroke-linecap="round"
									stroke-linejoin="round"><path d={SVG_PENA} /></svg
								>
							</span>
						{/if}
					</span>
					<span class="ds-cont">{decksStore.decks[i].length}/{DECK_MAX}</span>
				</button>
			{/each}
		</div>

		<!-- meu deck -->
		<div class="deck-titulo">
			Meu Deck <span class="deck-cont">{decksStore.deckAtual.length} / {DECK_MAX}</span>
		</div>
		<div class="deck-grid">
			{#each Array(DECK_MAX) as _, i (i)}
				{@const id = decksStore.deckAtual[i]}
				{#if id}
					{@const c = Cards.porId(id)}
					<div class="deck-item" role="button" tabindex="0" onclick={() => decksStore.remover(c)} onkeydown={(e) => e.key === 'Enter' && decksStore.remover(c)}>
						<Carta carta={c} />
						<div class="deck-rm">✕</div>
					</div>
				{:else}
					<div class="deck-slot-vazio">+</div>
				{/if}
			{/each}
		</div>

		<!-- coleção -->
		<div class="deck-sub">Coleção — toque numa carta pra adicionar</div>
		<div class="col-filtro-barra">
			<div class="col-filtros">
				{#each filtros as [chave, rotulo] (chave)}
					<button
						class="col-filtro"
						class:sel={chave === filtroRar}
						style={chave !== 'todas' ? `--c:${Cards.RARIDADES[chave].cor}` : ''}
						onclick={() => (filtroRar = chave)}>{rotulo}</button
					>
				{/each}
			</div>
			<button class="col-ordenar" onclick={ciclarOrdem}>{ORDEM_LBL[ordem]}</button>
		</div>

		<div class="col-grid">
			{#each possuidas as c (c.id)}
				<div
					class="col-item pode-add"
					class:no-deck={decksStore.noDeck(c)}
					role="button"
					tabindex="0"
					onclick={() => decksStore.toggle(c)}
					onkeydown={(e) => e.key === 'Enter' && decksStore.toggle(c)}
				>
					<Carta carta={c} />
					<div class="col-item-lbl">
						<span class="col-nome">{c.nome}</span>
						<span class="col-rar" style="color:{Cards.raridadeInfo(c.raridade).cor}"
							>◆ {Cards.raridadeInfo(c.raridade).nome}</span
						>
					</div>
				</div>
			{/each}

			{#if naoObtidas.length}
				<div class="col-sep"><span>Ainda não obtidas</span></div>
				{#each naoObtidas as c (c.id)}
					<div class="col-item nao-possui">
						<Carta carta={c} />
						<div class="lock">🔒</div>
						<div class="col-item-lbl">
							<span class="col-nome">{c.nome}</span>
							<span class="col-rar" style="color:{Cards.raridadeInfo(c.raridade).cor}"
								>◆ {Cards.raridadeInfo(c.raridade).nome}</span
							>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</section>
