<!--
  Login / Cadastro (e-mail + senha). Autentica via Supabase (cliente do browser
  vindo do +layout.ts). Login é obrigatório — o authGuard manda pra cá quem não
  tem sessão. No signup, o username vai no metadata e o trigger handle_new_user
  cria o profile automaticamente.
-->
<script>
	import { goto, invalidate } from '$app/navigation';

	let { data } = $props();
	const supabase = data.supabase;

	let modo = $state('entrar'); // 'entrar' | 'criar'
	let email = $state('');
	let senha = $state('');
	let username = $state('');
	let erro = $state('');
	let aviso = $state('');
	let carregando = $state(false);

	/** @param {SubmitEvent} e */
	async function enviar(e) {
		e.preventDefault();
		erro = '';
		aviso = '';
		carregando = true;
		try {
			if (modo === 'criar') {
				const nome = username.trim();
				if (nome.length < 3) throw new Error('Escolha um nome de duelista (mín. 3 letras).');
				const { data: res, error } = await supabase.auth.signUp({
					email: email.trim(),
					password: senha,
					options: { data: { username: nome } }
				});
				if (error) throw error;
				if (!res.session) {
					// confirmação de e-mail ligada no Supabase → precisa confirmar pelo link
					aviso = 'Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.';
					modo = 'entrar';
					return;
				}
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email: email.trim(),
					password: senha
				});
				if (error) throw error;
			}
			await invalidate('supabase:auth');
			await goto('/');
		} catch (err) {
			erro = traduzir(err instanceof Error ? err.message : 'Falha na autenticação.');
		} finally {
			carregando = false;
		}
	}

	/** @param {string} msg */
	function traduzir(msg) {
		if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
		if (/user already registered/i.test(msg)) return 'Este e-mail já tem conta. Tente entrar.';
		if (/password should be at least/i.test(msg)) return 'A senha precisa de pelo menos 6 caracteres.';
		if (/unable to validate email/i.test(msg) || /invalid email/i.test(msg))
			return 'E-mail inválido.';
		return msg;
	}
</script>

<svelte:head>
	<title>Arkania Card Wars — Entrar</title>
</svelte:head>

<div class="login-cena">
	<div class="login-card moldura">
		<img class="login-logo" src="/assets/backgrounds/lobby/logo-arkania.webp" alt="Arkania Card Wars" />
		<h1>{modo === 'criar' ? 'Criar conta' : 'Entrar na arena'}</h1>

		<form onsubmit={enviar}>
			{#if modo === 'criar'}
				<label>
					<span>Nome de duelista</span>
					<input type="text" maxlength="20" bind:value={username} placeholder="mouranin" autocomplete="username" />
				</label>
			{/if}
			<label>
				<span>E-mail</span>
				<input type="email" required bind:value={email} placeholder="voce@exemplo.com" autocomplete="email" />
			</label>
			<label>
				<span>Senha</span>
				<input
					type="password"
					required
					bind:value={senha}
					placeholder="••••••••"
					autocomplete={modo === 'criar' ? 'new-password' : 'current-password'}
				/>
			</label>

			{#if erro}<div class="login-erro">{erro}</div>{/if}
			{#if aviso}<div class="login-aviso">{aviso}</div>{/if}

			<button type="submit" class="btn btn-ouro" disabled={carregando}>
				{carregando ? '…' : modo === 'criar' ? 'Criar conta' : 'Entrar'}
			</button>
		</form>

		<div class="login-troca">
			{#if modo === 'criar'}
				Já tem conta?
				<button type="button" onclick={() => ((modo = 'entrar'), (erro = ''))}>Entrar</button>
			{:else}
				Novo por aqui?
				<button type="button" onclick={() => ((modo = 'criar'), (erro = ''))}>Criar conta</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.login-cena {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 24px;
		overflow-y: auto;
		background:
			radial-gradient(ellipse 60% 50% at 50% 0%, rgba(120, 40, 20, 0.35), transparent 70%),
			radial-gradient(ellipse at 50% 120%, rgba(40, 30, 16, 0.6), #0b0805 70%);
	}
	.login-card {
		width: min(420px, 100%);
		padding: 32px 30px 26px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}
	.login-logo {
		height: 96px;
		width: auto;
		filter: drop-shadow(0 5px 16px rgba(0, 0, 0, 0.7));
	}
	h1 {
		font-family: var(--serifa);
		color: var(--ouro);
		font-size: 24px;
		text-align: center;
		margin: 0 0 6px;
	}
	form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	label span {
		font-family: var(--serifa);
		font-size: 13px;
		color: var(--texto-suave);
		letter-spacing: 0.5px;
	}
	input {
		font-family: var(--sans);
		font-size: 15px;
		color: var(--texto);
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--bronze);
		border-radius: 8px;
		padding: 11px 12px;
		outline: none;
	}
	input:focus {
		border-color: var(--ouro);
		box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
	}
	.btn-ouro {
		margin-top: 4px;
		font-size: 17px;
		padding: 12px;
	}
	.login-erro {
		color: #ff9b8f;
		font-size: 13px;
		text-align: center;
	}
	.login-aviso {
		color: #7bf0a8;
		font-size: 13px;
		text-align: center;
	}
	.login-troca {
		font-size: 13px;
		color: var(--texto-suave);
	}
	.login-troca button {
		background: none;
		border: none;
		color: var(--ouro);
		font-family: var(--serifa);
		font-size: 14px;
		cursor: pointer;
		text-decoration: underline;
		padding: 0 2px;
	}
</style>
