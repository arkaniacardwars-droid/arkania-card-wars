/* Estado de UI compartilhado: modal de detalhe da carta + modal de perfil. */
function criar() {
	let modalCarta = $state(null);
	let perfilAberto = $state(false);
	return {
		get modalCarta() {
			return modalCarta;
		},
		abrir(c) {
			modalCarta = c;
		},
		fechar() {
			modalCarta = null;
		},
		get perfilAberto() {
			return perfilAberto;
		},
		abrirPerfil() {
			perfilAberto = true;
		},
		fecharPerfil() {
			perfilAberto = false;
		}
	};
}

export const ui = criar();
