export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { importJobs } from '../../../../lib/db/schema';
import { runImport, isRunning } from '../../../../lib/import/engine';
import { requireUser, readBody, asString, ok, fail } from '../../../../lib/api';

/**
 * Lance l'écriture et répond tout de suite.
 * L'import avance en arrière-plan ; l'écran interroge /etat pour
 * suivre la progression.
 */
export const POST: APIRoute = async (context) => {
  const { user, response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const id = asString(body.id);
  if (!id) return fail('Import introuvable.');

  const found = await db.select().from(importJobs).where(eq(importJobs.id, id)).limit(1);
  const job = found[0];
  if (!job) return fail('Import introuvable.', 404);
  if (isRunning(id) || job.status === 'en_cours') {
    return ok({ started: true, already: true });
  }
  if (job.status === 'termine') {
    return fail('Cet import a déjà été appliqué. Déposez à nouveau le fichier pour le rejouer.');
  }

  // Volontairement sans await : la réponse part immédiatement.
  void runImport(id, user!.id);

  return ok({ started: true });
};
