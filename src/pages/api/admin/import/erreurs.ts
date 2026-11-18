export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { importJobs } from '../../../../lib/db/schema';
import { errorReportCsv } from '../../../../lib/import/engine';
import { requireUser, fail } from '../../../../lib/api';

/** Rapport des lignes à problème, à corriger puis redéposer. */
export const GET: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const id = context.url.searchParams.get('id');
  if (!id) return fail('Import introuvable.');

  const found = await db.select().from(importJobs).where(eq(importJobs.id, id)).limit(1);
  const job = found[0];
  if (!job) return fail('Import introuvable.', 404);

  return new Response(errorReportCsv(job), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rapport-import-${id.slice(-6)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};
