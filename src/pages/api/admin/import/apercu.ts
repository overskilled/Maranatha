export const prerender = false;

import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { importJobs } from '../../../../lib/db/schema';
import { parseFile } from '../../../../lib/import/parse';
import { resolveRows, normalizeOptions } from '../../../../lib/import/engine';
import { requireUser, readBody, asString, ok, fail } from '../../../../lib/api';

/** Nombre de lignes détaillées renvoyées à l'écran. */
const PREVIEW = 40;

/**
 * Rejoue la correspondance choisie et renvoie ce qui se passera,
 * sans rien écrire. C'est l'étape qui évite les mauvaises surprises.
 */
export const POST: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const id = asString(body.id);
  if (!id) return fail('Import introuvable.');

  const found = await db.select().from(importJobs).where(eq(importJobs.id, id)).limit(1);
  const job = found[0];
  if (!job || !job.storedPath) return fail('Import introuvable.', 404);
  if (job.status === 'en_cours') return fail('Cet import est déjà en cours.');

  const mapping = (body.mapping ?? job.mapping ?? {}) as Record<string, string>;
  const options = normalizeOptions(body.options ?? job.options);

  let parsed;
  try {
    parsed = await parseFile(await readFile(job.storedPath), job.filename);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Fichier illisible : ${message}`);
  }

  const resolved = resolveRows(parsed, mapping, options);

  // La correspondance et les réglages sont conservés pour l'exécution.
  await db
    .update(importJobs)
    .set({
      mapping,
      options: options as unknown as Record<string, unknown>,
      totalRows: resolved.rows.length,
      errorCount: resolved.summary.error,
      status: 'pret',
    })
    .where(eq(importJobs.id, id));

  /* Les lignes à problème passent devant : ce sont celles à regarder. */
  const sorted = [...resolved.rows].sort((a, b) => {
    const score = (row: typeof a) =>
      row.action === 'error' ? 0 : row.issues.length ? 1 : 2;
    return score(a) - score(b) || a.line - b.line;
  });

  return ok({
    summary: resolved.summary,
    notes: parsed.notes,
    rows: sorted.slice(0, PREVIEW).map((row) => ({
      line: row.line,
      action: row.action,
      sku: row.sku,
      name: (row.values.name as string | undefined) ?? null,
      price: (row.values.price as number | undefined) ?? null,
      stock: (row.values.stock as number | undefined) ?? null,
      category: row.categoryName,
      issues: row.issues,
    })),
  });
};
