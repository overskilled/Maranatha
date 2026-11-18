export const prerender = false;

import type { APIRoute } from 'astro';
import { destroySession, clearSessionCookie, SESSION_COOKIE } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  await destroySession(context.cookies.get(SESSION_COOKIE)?.value);
  clearSessionCookie(context.cookies);
  return context.redirect('/admin/connexion', 303);
};
