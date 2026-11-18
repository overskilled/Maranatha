export const prerender = false;

import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { importProfiles, importJobs } from '../../../../lib/db/schema';
import { newId } from '../../../../lib/ids';
import { requireUser, readBody, asString, ok, fail } from '../../../../lib/api';

/**
 * Enregistre la correspondance de colonnes sous un nom.
 * Le fournisseur renvoie le même tableau chaque mois : on ne
 * refait pas le travail deux fois.
 */
export const POST: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const name = asString(body.name).trim();
  const jobId = asString(body.jobId);

  if (!name) return fail('Donnez un nom à ce modèle de fichier.');
  if (name.length > 80) return fail('Ce nom est trop long.');

  const found = await db.select().from(importJobs).where(eq(importJobs.id, jobId)).limit(1);
  const job = found[0];
  if (!job?.mapping) return fail('Aucune correspondance à enregistrer.');

  const existing = await db
    .select()
    .from(importProfiles)
    .where(eq(importProfiles.name, name))
    .limit(1);

  if (existing.length) {
    await db
      .update(importProfiles)
      .set({
        mapping: job.mapping,
        options: job.options ?? undefined,
        lastUsedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(importProfiles.id, existing[0].id));
    return ok({ message: `Modèle « ${name} » mis à jour.` });
  }

  await db.insert(importProfiles).values({
    id: newId(),
    name,
    mapping: job.mapping,
    options: job.options ?? undefined,
    lastUsedAt: Math.floor(Date.now() / 1000),
  });

  return ok({ message: `Modèle « ${name} » enregistré.` });
};

/** Supprime un modèle enregistré. */
export const DELETE: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const id = asString(body.id);
  if (!id) return fail('Modèle introuvable.');

  await db.delete(importProfiles).where(eq(importProfiles.id, id));
  return ok({ message: 'Modèle supprimé.' });
};
