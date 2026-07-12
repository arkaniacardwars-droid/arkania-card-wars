<!--
  Lobby estilo PUBG Mobile (HUD de cantos sobre fundo de dragões em camadas):
  perfil (topo-esq), recursos (topo-dir), menu lateral (dir), carrossel de cartas
  do deck ativo (centro), START (rodapé-esq), Battle Pass (rodapé-dir).
  Porte de prototype/index.html + js/lobby.js + js/lobbyfx.js.
-->
<script>
	import { onMount } from 'svelte';
	import * as Cards from '$lib/game/cards.js';
	import { decksStore } from '$lib/game/decks.svelte.js';
	import { perfilStore } from '$lib/game/perfil.svelte.js';
	import { ui } from '$lib/game/ui.svelte.js';
	import Carta from './Carta.svelte';
	import Avatar from './Avatar.svelte';

	let { onAbrirDeck, onStart } = $props();

	// ---- palco central: carrossel (conveyor) das cartas do DECK ativo ----
	const FALLBACK = ['guardiao-saturno', 'mago-negro', 'kassandra'];
	const seq = $derived.by(() => {
		const lista = decksStore.deckAtual.map((id) => Cards.porId(id)).filter(Boolean);
		return lista.length ? lista : FALLBACK.map((id) => Cards.porId(id)).filter(Boolean);
	});

	let palcoIdx = $state(0);
	const anima = $derived(seq.length >= 4); // carrossel só com deck grande

	// carta no destaque central (meio)
	const heroi = $derived(anima ? seq[(palcoIdx + 1) % seq.length] : seq[0]);
	const heroiRar = $derived(heroi ? Cards.raridadeInfo(heroi.raridade).nome : '');

	// classe de posição (slot) de cada carta relativa ao índice atual
	function slot(i) {
		const n = seq.length;
		if (!anima) return ['pc-mid', 'pc-right', 'pc-left'][i] || 'pc-hidden';
		const r = (((i - palcoIdx) % n) + n) % n;
		if (r === 0) return 'pc-left';
		if (r === 1) return 'pc-mid';
		if (r === 2) return 'pc-right';
		if (r === 3) return 'pc-enter';
		if (r === n - 1) return 'pc-exit';
		return 'pc-hidden';
	}

	// mensagens dos botões placeholder (dependem do backend)
	const MSG_MENU = {
		conquistas:
			'Conquistas (troféus de duelo) chegam junto com a progressão persistida. Em breve!',
		missoes: 'Missões diárias/semanais entram quando houver conta e progressão persistidos (backend).',
		loja: 'Loja: pacotes de cartas e cosméticos entram quando houver conta/economia persistida. Por enquanto, veja suas cartas no Deck.'
	};

	function menu(aba) {
		if (aba === 'colecao') return onAbrirDeck?.();
		alert(MSG_MENU[aba] || 'Em breve.');
	}

	// ---- efeitos atmosféricos (Canvas) + carrossel ----
	let lobbyFxEl;
	let bpFogoEl;
	let lobbyBgEl;

	onMount(() => {
		const reduz =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// carrossel: avança a cada 3.5s
		let timer;
		if (!reduz) {
			timer = setInterval(() => {
				if (seq.length >= 4) palcoIdx = (palcoIdx + 1) % seq.length;
			}, 3500);
		}

		const limpezas = [];
		if (!reduz) {
			limpezas.push(brasasLobby(lobbyFxEl));
			limpezas.push(fogoBattlePass(bpFogoEl));
			limpezas.push(parallaxDragoes(lobbyBgEl));
		}

		return () => {
			if (timer) clearInterval(timer);
			limpezas.forEach((fn) => fn && fn());
		};
	});

	function rnd(a, b) {
		return a + Math.random() * (b - a);
	}

	// brasas/faíscas douradas subindo sobre o fundo
	function brasasLobby(canvas) {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		const DPR = Math.min(window.devicePixelRatio || 1, 2);
		let W = 0,
			H = 0,
			t = 0,
			raf = 0;
		let brasas = [],
			faiscas = [];

		function nova(inicial) {
			return {
				x: rnd(0, W),
				y: inicial ? rnd(0, H) : H + rnd(0, 40),
				r: rnd(1.4, 4),
				vy: rnd(0.3, 1.1),
				sway: rnd(0.4, 1.4),
				fase: rnd(0, Math.PI * 2),
				vel: rnd(0.4, 1.2),
				a: rnd(0.5, 1),
				quente: Math.random() < 0.5
			};
		}
		function semear() {
			const n = Math.round((W * H) / 24000);
			brasas = [];
			for (let i = 0; i < n; i++) brasas.push(nova(true));
			faiscas = [];
		}
		function resize() {
			W = window.innerWidth;
			H = window.innerHeight;
			canvas.width = W * DPR;
			canvas.height = H * DPR;
			canvas.style.width = W + 'px';
			canvas.style.height = H + 'px';
			ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
			semear();
		}
		function frame() {
			raf = requestAnimationFrame(frame);
			t += 0.016;
			ctx.clearRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'lighter';
			for (let i = 0; i < brasas.length; i++) {
				const p = brasas[i];
				p.y -= p.vy;
				p.x += Math.sin(t * p.vel + p.fase) * p.sway * 0.5;
				const alpha = p.a * Math.max(0, Math.min(1, (p.y / H) * 1.4));
				if (p.y < -10) {
					brasas[i] = nova(false);
					continue;
				}
				const cor = p.quente ? '255,240,200' : '245,165,70';
				const raio = p.r * 3.4;
				const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio);
				g.addColorStop(0, 'rgba(' + cor + ',' + alpha + ')');
				g.addColorStop(0.4, 'rgba(' + cor + ',' + alpha * 0.5 + ')');
				g.addColorStop(1, 'rgba(' + cor + ',0)');
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = 'rgba(255,250,230,' + alpha * 0.9 + ')';
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
				ctx.fill();
			}
			if (Math.random() < 0.04)
				faiscas.push({ x: rnd(0, W), y: H * rnd(0.55, 0.95), r: rnd(1, 2), a: 1, vy: rnd(1.2, 2.4) });
			for (let j = faiscas.length - 1; j >= 0; j--) {
				const f = faiscas[j];
				f.y -= f.vy;
				f.a -= 0.02;
				if (f.a <= 0) {
					faiscas.splice(j, 1);
					continue;
				}
				ctx.fillStyle = 'rgba(255,240,190,' + f.a + ')';
				ctx.beginPath();
				ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
		window.addEventListener('resize', resize);
		resize();
		frame();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
	}

	// fogo do Battle Pass (chamas nas bordas + brasas subindo)
	function fogoBattlePass(cv) {
		if (!cv) return;
		const ctx = cv.getContext('2d');
		const DPR = Math.min(window.devicePixelRatio || 1, 2);
		let W = 0,
			H = 0,
			raf = 0;
		let chamas = [],
			brasas = [];
		function resize() {
			W = cv.offsetWidth;
			H = cv.offsetHeight;
			if (!W || !H) return;
			cv.width = W * DPR;
			cv.height = H * DPR;
			ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		}
		function novaChama() {
			const e = Math.random();
			let x, y, vx, vy;
			if (e < 0.5) {
				x = rnd(0, W);
				y = H - 2;
				vx = rnd(-0.08, 0.08);
				vy = -rnd(0.2, 0.5);
			} else if (e < 0.75) {
				x = 2;
				y = rnd(H * 0.15, H);
				vx = rnd(0.05, 0.16);
				vy = -rnd(0.15, 0.4);
			} else {
				x = W - 2;
				y = rnd(H * 0.15, H);
				vx = -rnd(0.05, 0.16);
				vy = -rnd(0.15, 0.4);
			}
			chamas.push({ x, y, vx, vy, r: rnd(3, 6.5), vida: 1, decai: rnd(0.024, 0.045) });
		}
		function novaBrasa() {
			brasas.push({
				x: rnd(0, W),
				y: H - rnd(0, 5),
				vx: rnd(-0.12, 0.12),
				vy: -rnd(0.35, 0.8),
				r: rnd(0.6, 1.3),
				vida: 1,
				decai: rnd(0.012, 0.022),
				f: rnd(0, 6.28)
			});
		}
		function frame() {
			raf = requestAnimationFrame(frame);
			if (!W || !H) {
				resize();
				if (!W) return;
			}
			ctx.clearRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'lighter';
			if (Math.random() < 0.85) novaChama();
			if (Math.random() < 0.18) novaBrasa();
			for (let i = chamas.length - 1; i >= 0; i--) {
				const p = chamas[i];
				p.x += p.vx;
				p.y += p.vy;
				p.vy *= 0.99;
				p.vida -= p.decai;
				if (p.vida <= 0) {
					chamas.splice(i, 1);
					continue;
				}
				const r = p.r * (0.5 + p.vida * 0.6),
					a = p.vida;
				const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
				g.addColorStop(0, 'rgba(255,238,195,' + a * 0.5 + ')');
				g.addColorStop(0.45, 'rgba(255,150,45,' + a * 0.32 + ')');
				g.addColorStop(1, 'rgba(190,40,10,0)');
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(p.x, p.y, r, 0, 6.283);
				ctx.fill();
			}
			for (let j = brasas.length - 1; j >= 0; j--) {
				const e = brasas[j];
				e.x += e.vx + Math.sin((1 - e.vida) * 6 + e.f) * 0.3;
				e.y += e.vy;
				e.vida -= e.decai;
				if (e.vida <= 0) {
					brasas.splice(j, 1);
					continue;
				}
				ctx.fillStyle = 'rgba(255,' + (205 + Math.floor(35 * e.vida)) + ',160,' + e.vida * 0.6 + ')';
				ctx.beginPath();
				ctx.arc(e.x, e.y, e.r, 0, 6.283);
				ctx.fill();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
		window.addEventListener('resize', resize);
		resize();
		frame();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
	}

	// parallax dos dragões conforme o mouse (profundidades via data-par)
	function parallaxDragoes(bgEl) {
		if (!bgEl) return;
		const wraps = Array.from(bgEl.querySelectorAll('.bg-dragao-wrap'));
		if (!wraps.length) return;
		let mx = 0,
			my = 0,
			agendado = false;
		function aplicar() {
			agendado = false;
			for (const w of wraps) {
				const par = parseFloat(w.getAttribute('data-par')) || 0;
				w.style.transform = 'translate(' + mx * par + 'px,' + my * par + 'px)';
			}
		}
		function onMove(e) {
			mx = e.clientX / window.innerWidth - 0.5;
			my = e.clientY / window.innerHeight - 0.5;
			if (!agendado) {
				agendado = true;
				requestAnimationFrame(aplicar);
			}
		}
		window.addEventListener('mousemove', onMove);
		return () => window.removeEventListener('mousemove', onMove);
	}
</script>

<section id="tela-lobby" class="tela ativa">
	<!-- fundo do lobby em camadas (cada dragão anima separado; cai no bg único se faltar) -->
	<div id="lobby-bg" bind:this={lobbyBgEl}>
		<div class="bg-cena"></div>
		<div class="bg-dragao-wrap" data-par="4">
			<img class="bg-dragao d-vermelho" src="/assets/backgrounds/lobby/dragao-vermelho.png" alt="" />
		</div>
		<div class="bg-dragao-wrap" data-par="10">
			<img class="bg-dragao d-preto" src="/assets/backgrounds/lobby/dragao-preto.png" alt="" />
		</div>
		<div class="bg-dragao-wrap" data-par="11">
			<img class="bg-dragao d-branco" src="/assets/backgrounds/lobby/dragao-branco.png" alt="" />
		</div>
	</div>
	<canvas id="lobby-fx" bind:this={lobbyFxEl}></canvas>

	<!-- topo-centro: logo -->
	<img class="lb-marca-img" src="/assets/backgrounds/lobby/logo-arkania.webp" alt="Arkania Card Wars" />

	<!-- topo-esq: perfil (clicável → abre o modal de perfil) -->
	<div
		class="lb-perfil clicavel"
		role="button"
		tabindex="0"
		onclick={() => ui.abrirPerfil()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				ui.abrirPerfil();
			}
		}}
	>
		<div class="lb-perfil-av"><Avatar foto={perfilStore.foto} /></div>
		<div class="lb-perfil-info">
			<div class="lb-perfil-nome">{perfilStore.nome} <span class="nv">Nv.7</span></div>
			<div class="lb-perfil-xp"><i></i></div>
			<div class="lb-perfil-xp-txt">1 240 / 2 000 XP</div>
		</div>
	</div>

	<!-- topo-dir: recursos -->
	<div class="lb-recursos">
		<span class="lb-rec"><span class="ic">🪙</span><b>1 250</b></span>
		<span class="lb-rec"><span class="ic">💎</span><b>0</b></span>
		<button class="lb-rec-add" title="Comprar">+</button>
	</div>

	<!-- lateral-dir: Deck / Conquistas / Missões / Loja -->
	<div class="lb-menu-lat">
		<button class="lb-menu-btn" onclick={() => menu('colecao')}
			><span class="ic">🃏</span><span class="lbl">Deck</span></button
		>
		<button class="lb-menu-btn" onclick={() => menu('conquistas')}
			><span class="ic">🏆</span><span class="lbl">Conquistas</span></button
		>
		<button class="lb-menu-btn" onclick={() => menu('missoes')}
			><span class="ic">🎯</span><span class="lbl">Missões</span></button
		>
		<button class="lb-menu-btn" onclick={() => menu('loja')}
			><span class="ic">🛒</span><span class="lbl">Loja</span></button
		>
	</div>

	<!-- centro: carrossel de cartas do deck ativo -->
	<div class="lb-palco">
		<div class="heroi-cartas" id="palco-cartas">
			{#each seq as c, i (c.id)}
				<Carta carta={c} extra={slot(i)} onclick={() => ui.abrir(c)} />
			{/each}
		</div>
		<div class="heroi-nome">{heroi?.nome ?? ''}<small>{heroiRar}</small></div>
	</div>

	<!-- rodapé-esq: START -->
	<button class="start-btn" onclick={() => onStart?.()}>START</button>

	<!-- rodapé-dir: Battle Pass -->
	<button
		class="lb-battlepass"
		onclick={() =>
			alert(
				'Battle Pass — Temporada I: trilha de recompensas por nível. Ativa quando plugarmos progressão online.'
			)}
	>
		<canvas class="bp-fogo" bind:this={bpFogoEl} aria-hidden="true"></canvas>
		<span class="bp-ic">🎟️</span>
		<span class="bp-txt">
			<b>Battle Pass</b>
			<small>Temporada I · Nv.7</small>
			<span class="bp-barra"><i></i></span>
		</span>
	</button>
</section>
