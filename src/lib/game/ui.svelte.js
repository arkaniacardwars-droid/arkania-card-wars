/* Estado de UI compartilhado (modal de detalhe da carta). */
function criar() {
	let modalCarta = $state(null);
	return {
		get modalCarta() {
			return modalCarta;
		},
		abrir(c) {
			modalCarta = c;
		},
		fechar() {
			modalCarta = null;
		}
	};
}

export const ui = criar();
