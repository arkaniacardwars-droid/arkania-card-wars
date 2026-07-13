import type { LayoutServerLoad } from './$types';

/**
 * Passa a sessão/usuário (já validados no authGuard) + o profile do jogador
 * + os cookies para o load universal (+layout.ts).
 */
export const load: LayoutServerLoad = async ({ locals: { supabase, session, user }, cookies }) => {
	let profile = null;
	if (user) {
		const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
		profile = data ?? null;
	}
	return { session, user, profile, cookies: cookies.getAll() };
};
