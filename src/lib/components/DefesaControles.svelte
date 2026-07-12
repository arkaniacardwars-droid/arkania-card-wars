<!-- Controles de defesa: prever Normal/Especial + apostar energia. Remontado a
     cada rodada (via {#key}) → estado local zera sozinho. Porte de renderDefesa. -->
<script>
	let { energiaMax, onConfirmar } = $props();

	let preve = $state('normal');
	let aposta = $state(Math.min(energiaMax, 12));
</script>

<div class="cmd-box">
	<div class="cmd-titulo">Você defende — preveja o golpe e aposte energia</div>
	<div class="cmd-acoes">
		<button class="cmd-btn def-normal" class:sel={preve === 'normal'} onclick={() => (preve = 'normal')}
			>🛡 Prever Normal</button
		>
		<button
			class="cmd-btn def-especial"
			class:sel={preve === 'especial'}
			onclick={() => (preve = 'especial')}>🛡 Prever Especial</button
		>
	</div>

	<div class="cmd-aposta">
		<label for="aposta-range">Apostar energia</label>
		<div class="aposta-ctrl">
			<input id="aposta-range" type="range" min="0" max={energiaMax} bind:value={aposta} />
			<div class="aposta-val">{aposta}</div>
		</div>
	</div>

	<button class="cmd-btn confirmar btn-ouro" onclick={() => onConfirmar(preve, +aposta)}
		>Confirmar defesa ⚔</button
	>
</div>
