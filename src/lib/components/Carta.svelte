<!--
  Carta full-bleed: a arte (com painel translúcido + bandeirinha VAZIOS) é a
  carta inteira; desenhamos os dados por cima (camadas .cx-*). Porte de
  Cards.el/htmlInterno (prototype/js/cards.js) para componente Svelte.
  O CSS vive global em src/lib/game/theme.css (.carta.full .cx-*).
-->
<script>
	import * as Cards from '$lib/game/cards.js';

	let { carta, extra = '', onclick = null, style = '' } = $props();

	const arte = $derived(Cards.urlArte(carta));
	let semArte = $state(false);

	// destaque de cor por habilidade (VID verde, ATA vermelho, ENE azul)
	function colClasse(k) {
		if (k === 'VID') return ' cx-col-vid';
		if (k === 'ATA') return ' cx-col-ata';
		if (k === 'ENE') return ' cx-col-ene';
		return '';
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class={Cards.classes(carta, extra)}
	{style}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	{onclick}
	onkeydown={onclick
		? (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onclick(e);
				}
			}
		: undefined}
>
	{#if arte && !semArte}
		<img
			class="full-img"
			src={arte}
			alt={carta.nome}
			loading="lazy"
			decoding="async"
			onerror={() => (semArte = true)}
		/>
	{/if}

	<div class="cx-flag"><b>{Cards.nota(carta)}</b><span>{Cards.tipo(carta)}</span></div>
	<div class="cx-nome">{carta.nome}</div>

	<div class="cx-stats">
		{#each Cards.ATTR_ORDEM as k (k)}
			<div class="cx-col{colClasse(k)}"><span>{k}</span><b>{carta.stats[k] | 0}</b></div>
		{/each}
	</div>

	<div class="cx-hab">
		<span class="cx-hab-lbl">HABILIDADE:</span>
		{#if carta.habilidades?.length}
			<ul>
				{#each carta.habilidades as h (h)}
					<li>{h}</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
