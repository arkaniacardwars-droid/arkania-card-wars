<!-- Modal glassmorphism de detalhe da carta. Porte de abrirCartaModal (lobby.js). -->
<script>
	import * as Cards from '$lib/game/cards.js';
	import { ui } from '$lib/game/ui.svelte.js';
	import Carta from './Carta.svelte';

	const c = $derived(ui.modalCarta);
	const info = $derived(c ? Cards.raridadeInfo(c.raridade) : null);
</script>

{#if c}
	<div
		class="carta-modal-fundo ativa"
		role="button"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) ui.fechar();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') ui.fechar();
		}}
	>
		<div class="cm-glass">
			<button class="cm-fechar" aria-label="Fechar" onclick={() => ui.fechar()}>✕</button>
			<div class="cm-esq">
				<div class="cm-carta"><Carta carta={c} /></div>
			</div>
			<div class="cm-dir">
				<div class="cm-cabecalho">
					<div class="cm-nota"><b>{Cards.nota(c)}</b><span>{Cards.tipo(c)}</span></div>
					<div class="cm-titulo">
						<h2 class="cm-nome">{c.nome}</h2>
						<div class="cm-rar" style="color:{info.cor}">◆ {info.nome}</div>
					</div>
				</div>
				<div class="cm-attrs">
					{#each Cards.ATTR_ORDEM as k (k)}
						{@const v = c.stats[k]}
						<div class="cm-attr">
							<div class="cm-attr-top"><span>{Cards.ATTR_NOME[k]}</span><b>{v}</b></div>
							<div class="cm-bar">
								<i style="width:{Math.min(100, v)}%;background:{Cards.ATTR_COR[k]}"></i>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
