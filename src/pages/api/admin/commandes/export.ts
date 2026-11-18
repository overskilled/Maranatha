export const prerender = false;

import type { APIRoute } from 'astro';
import { ordersCsv, type OrderFilters } from '../../../../lib/repo/orders';
import { requireUser } from '../../../../lib/api';

/** Export des commandes au format lisible par Excel. */
export const GET: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const q = context.url.searchParams;
  const filters: OrderFilters = {
    search: q.get('q') ?? '',
    status: (q.get('statut') ?? 'all') as OrderFilters['status'],
    paymentStatus: (q.get('paiement') ?? 'all') as OrderFilters['paymentStatus'],
    channel: (q.get('canal') ?? 'all') as OrderFilters['channel'],
  };

  const csv = await ordersCsv(filters);
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="commandes-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};
