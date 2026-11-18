/* ============================================================
   Garde d'accès.
   Tout ce qui est sous /admin et /api/admin demande une session.
   Le reste du site reste public.
   ============================================================ */

import { defineMiddleware } from 'astro:middleware';
import { resolveSession, SESSION_COOKIE, ensureOwner, pruneAuthTables } from './lib/auth';
import { readCart, cartCount } from './lib/cart';
import { configWarnings } from './lib/env';

/** Chemins du back-office ouverts sans session. */
const PUBLIC_ADMIN = new Set([
  '/admin/connexion',
  '/admin/connexion/',
  '/api/admin/connexion',
]);

let bootstrapped = false;

/** Préparation au premier appel : compte propriétaire, ménage, alertes. */
async function bootstrap(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  for (const warning of configWarnings()) {
    console.warn(`[config] ${warning}`);
  }

  try {
    await ensureOwner();
    await pruneAuthTables();
  } catch (error) {
    console.error('[démarrage] ', error);
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Les pages statiques n'ont pas besoin de la base.
  const needsServer =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/boutique') ||
    pathname.startsWith('/panier') ||
    pathname.startsWith('/commande') ||
    pathname.startsWith('/media');

  if (!needsServer) {
    context.locals.user = null;
    context.locals.cartCount = 0;
    return next();
  }

  await bootstrap();

  const token = context.cookies.get(SESSION_COOKIE)?.value;
  context.locals.user = await resolveSession(token);

  try {
    context.locals.cartCount = cartCount(readCart(context.cookies));
  } catch {
    context.locals.cartCount = 0;
  }

  const isAdminPage = pathname.startsWith('/admin') && !PUBLIC_ADMIN.has(pathname);
  const isAdminApi = pathname.startsWith('/api/admin') && !PUBLIC_ADMIN.has(pathname);

  if ((isAdminPage || isAdminApi) && !context.locals.user) {
    if (isAdminApi) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Session expirée. Reconnectez-vous.' }),
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }
    const suite = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/admin/connexion?suite=${suite}`, 302);
  }

  // Mot de passe à changer : on n'autorise que la page de réglage.
  if (
    context.locals.user?.mustChangePassword &&
    isAdminPage &&
    !pathname.startsWith('/admin/mot-de-passe')
  ) {
    return context.redirect('/admin/mot-de-passe', 302);
  }

  const response = await next();

  // Le back-office ne doit jamais être mis en cache ni indexé.
  if (pathname.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
