export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { importJobs } from '../../../../lib/db/schema';
import { requireUser, json, fail } from '../../../../lib/api';

/** État d'avancement, interrogé pendant l'import. */
export const GET: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const id = context.url.searchParams.get('id');
  if (!id) return fail('Import introuvable.');

  const found = await db.select().from(importJobs).where(eq(importJobs.id, id)).limit(1);
  const job = found[0];
  if (!job) return fail('Import introuvable.', 404);

  const percent =
    job.totalRows > 0 ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100)) : 0;

  return json({
    ok: true,
    status: job.status,
    percent,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    createdCount: job.createdCount,
    updatedCount: job.updatedCount,
    skippedCount: job.skippedCount,
    errorCount: job.errorCount,
    message: job.message,
    done: job.status === 'termine' || job.status === 'echoue',
  });
};
