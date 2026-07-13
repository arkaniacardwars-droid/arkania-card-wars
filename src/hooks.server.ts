import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Cria um cliente Supabase por requisição (lê/grava a sessão nos cookies) e
 * expõe `event.locals.supabase` + `event.locals.safeGetSession` para as rotas.
 */
const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * getSession() sozinho não valida o JWT. safeGetSession revalida com
	 * getUser() (bate no Auth) antes de confiar na sessão.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

/**
 * Guard de autenticação: login é OBRIGATÓRIO. Sem sessão → manda pro /login;
 * já logado tentando abrir /login → manda pro jogo. Stasha session/user em
 * locals p/ os loads reusarem sem re-bater no Auth.
 */
const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const rotaPublica = event.url.pathname === '/login';
	if (!user && !rotaPublica) redirect(303, '/login');
	if (user && rotaPublica) redirect(303, '/');

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
