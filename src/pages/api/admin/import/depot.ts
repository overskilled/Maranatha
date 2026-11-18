export const prerender = false;

import type { APIRoute } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { db } from '../../../../lib/db';
import { importJobs } from '../../../../lib/db/schema';
import { newId } from '../../../../lib/ids';
import { env } from '../../../../lib/env';
import { parseFile, isSupportedFile, unsupportedReason } from '../../../../lib/import/parse';
import { guessMapping } from '../../../../lib/import/columns';
import { DEFAULT_OPTIONS } from '../../../../lib/import/engine';
import { requireUser, ok, fail } from '../../../../lib/api';

/** 25 Mo : de quoi couvrir un catalogue de plusieurs dizaines de milliers de lignes. */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Reçoit le fichier, lit ses en-têtes et propose une correspondance.
 * Rien n'est encore écrit dans le catalogue à ce stade.
 */
export const POST: APIRoute = async (context) => {
  const { user, response } = requireUser(context);
  if (response) return response;

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return fail('Le fichier n’a pas pu être reçu. Réessayez.');
  }

  const file = form.get('fichier');
  if (!(file instanceof File) || file.size === 0) {
    return fail('Aucun fichier reçu.');
  }
  if (file.size > MAX_BYTES) {
    return fail(
      `Le fichier pèse ${Math.round(file.size / 1024 / 1024)} Mo, la limite est de ${MAX_BYTES / 1024 / 1024} Mo. Découpez-le en plusieurs fichiers.`,
    );
  }
  if (!isSupportedFile(file.name)) {
    return fail(unsupportedReason(file.name));
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseFile(buffer, file.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Fichier illisible : ${message}`);
  }

  if (!parsed.headers.length) {
    return fail('Aucune colonne reconnue. La première ligne doit contenir les en-têtes.');
  }
  if (!parsed.rows.length) {
    return fail('Le fichier ne contient aucune ligne de données sous les en-têtes.');
  }

  // On garde le fichier : l'import le relira au moment de l'écriture.
  const id = newId();
  await mkdir(env.importsDir, { recursive: true });
  const storedPath = join(env.importsDir, `${id}${extname(file.name).toLowerCase()}`);
  await writeFile(storedPath, buffer);

  const mapping = guessMapping(parsed.headers);

  await db.insert(importJobs).values({
    id,
    filename: file.name,
    storedPath,
    status: 'pret',
    headers: parsed.headers,
    mapping,
    options: DEFAULT_OPTIONS as unknown as Record<string, unknown>,
    totalRows: parsed.rows.length,
    createdBy: user!.id,
  });

  return ok({
    id,
    headers: parsed.headers,
    mapping,
    rows: parsed.rows.length,
    notes: parsed.notes,
    redirect: `/admin/import/${id}`,
  });
};
