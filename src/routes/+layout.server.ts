import type { LayoutServerLoad } from './$types';

/** Passa a sessão validada + cookies para o load universal (+layout.ts). */
export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
	const { session, user } = await safeGetSession();
	return { session, user, cookies: cookies.getAll() };
};
