<!--
  Avatar redondo: o ROSTO da carta enquadrado (via use:enquadrar), com o emoji
  atrás como fallback. Renderiza só o conteúdo — o container circular (com sua
  classe/tamanho: .lb-perfil-av, .pf-av, .pf-av-opt) é do pai.
  Porte de pintarAvatar (prototype/js/perfil.js).
-->
<script>
	import * as Cards from '$lib/game/cards.js';
	import { enquadrar } from '$lib/game/rosto.js';

	let { foto = null } = $props();

	const carta = $derived(foto ? Cards.porId(foto) : null);
	const url = $derived(carta ? Cards.urlArte(carta) : null);
</script>

{#key foto}
	<span class="av-emoji">{carta ? carta.emoji : '🛡️'}</span>
	{#if url && carta}
		<img
			class="av-img"
			src={url}
			alt=""
			loading="lazy"
			decoding="async"
			use:enquadrar={carta.id}
			onerror={(e) => e.currentTarget.remove()}
		/>
	{/if}
{/key}
