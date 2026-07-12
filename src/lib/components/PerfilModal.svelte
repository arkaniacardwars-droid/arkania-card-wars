<!--
  Modal de perfil do jogador: identidade (avatar/nome/membro/bio), estatísticas,
  cartas mais usadas e seletor de foto. Porte de prototype/js/perfil.js
  (abrir/montarStats/montarTopCartas/montarPicker/salvar) + #perfil-modal.
-->
<script>
	import * as Cards from '$lib/game/cards.js';
	import { perfilStore, formatarData } from '$lib/game/perfil.svelte.js';
	import { ui } from '$lib/game/ui.svelte.js';
	import Avatar from './Avatar.svelte';
	import Carta from './Carta.svelte';

	// estado local do formulário (o modal só monta quando aberto → inicia do salvo)
	let nome = $state(perfilStore.nome);
	let bio = $state(perfilStore.bio);
	let pendenteFoto = $state(perfilStore.foto);
	let salvo = $state(false);

	const stats = $derived(perfilStore.stats);
	const top = $derived(perfilStore.topCartas(3));
	const membroDesde = $derived(formatarData(perfilStore.criadoEm));

	const statCards = $derived([
		{ v: stats.partidas, l: 'Partidas', cls: '' },
		{ v: stats.vitorias, l: 'Vitórias', cls: 'win' },
		{ v: stats.derrotas, l: 'Derrotas', cls: 'loss' },
		{ v: perfilStore.taxa + '%', l: 'Taxa Vitória', cls: 'win' }
	]);

	let timeoutSalvo;
	function salvar() {
		perfilStore.salvar({ nome, foto: pendenteFoto, bio });
		nome = perfilStore.nome; // normaliza (vazio → Duelista)
		salvo = true;
		clearTimeout(timeoutSalvo);
		timeoutSalvo = setTimeout(() => (salvo = false), 2200);
	}
</script>

<div
	class="carta-modal-fundo perfil-fundo ativa"
	role="button"
	tabindex="-1"
	onclick={(e) => {
		if (e.target === e.currentTarget) ui.fecharPerfil();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') ui.fecharPerfil();
	}}
>
	<div class="cm-glass pf-glass">
		<button class="cm-fechar" aria-label="Fechar" onclick={() => ui.fecharPerfil()}>✕</button>

		<!-- coluna esquerda: identidade + bio -->
		<div class="pf-col-id">
			<div class="pf-av-wrap">
				<div class="pf-av"><Avatar foto={pendenteFoto} /></div>
				<span class="pf-nivel"><small>NÍVEL</small><b>7</b></span>
			</div>
			<input
				class="pf-nome-input"
				maxlength="20"
				placeholder="Seu nome"
				aria-label="Nome de usuário"
				bind:value={nome}
			/>
			<div class="pf-membro">{membroDesde ? `Membro desde ${membroDesde}` : ''}</div>
			<label class="pf-bio-lbl" for="pf-bio">Bio</label>
			<textarea
				id="pf-bio"
				class="pf-bio"
				maxlength="240"
				rows="4"
				placeholder="Escreva sua bio de duelista…"
				bind:value={bio}
			></textarea>
			<button class="btn btn-ouro pf-salvar" onclick={salvar}>Salvar perfil</button>
			<div class="pf-salvo" class:show={salvo}>{salvo ? '✓ Perfil salvo' : ''}</div>
		</div>

		<!-- coluna direita: estatísticas + cartas mais usadas + foto de perfil -->
		<div class="pf-col-dados">
			<div class="pf-stats">
				{#each statCards as s (s.l)}
					<div class="pf-stat {s.cls}"><b>{s.v}</b><span>{s.l}</span></div>
				{/each}
			</div>

			<div class="pf-secao">
				<h3>Cartas mais usadas</h3>
				<div class="pf-top">
					{#each Array(3) as _, i (i)}
						{@const o = top[i]}
						<div class="pf-top-item">
							<div class="pf-top-carta" class:vazio={!o}>
								{#if o}
									<Carta carta={o.carta} />
								{:else}
									<div class="pf-top-slot-vazio"></div>
								{/if}
								<span class="pf-top-pos">#{i + 1}</span>
							</div>
							<div class="pf-top-info">
								{#if o}
									<span class="pf-top-nome">{o.carta.nome}</span>
									<span class="pf-top-usos">{o.usos} {o.usos === 1 ? 'partida' : 'partidas'}</span>
								{:else}
									<span class="pf-top-nome">—</span>
									<span class="pf-top-usos">0 partidas</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="pf-secao">
				<h3>Foto de perfil <small>escolha um personagem</small></h3>
				<div class="pf-avatares">
					{#each Cards.todas() as c (c.id)}
						<button
							type="button"
							class="pf-av-opt"
							class:sel={c.id === pendenteFoto}
							title={c.nome}
							onclick={() => (pendenteFoto = c.id)}
						>
							<Avatar foto={c.id} />
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
