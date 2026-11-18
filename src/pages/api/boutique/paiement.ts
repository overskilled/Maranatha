export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { orders } from '../../../lib/db/schema';
import { cinetpay } from '../../../lib/payments';
import { getOrderByReference, setPaymentStatus, setOrderStatus } from '../../../lib/repo/orders';

/**
 * Notification du prestataire de paiement.
 *
 * On ne croit jamais le contenu reçu : il sert seulement à savoir
 * quelle commande vérifier. L'état réel est demandé à CinetPay.
 */
export const POST: APIRoute = async (context) => {
  let reference = '';

  try {
    const type = context.request.headers.get('content-type') ?? '';

    if (type.includes('json')) {
      const body = (await context.request.json()) as Record<string, string>;
      reference = String(body.cpm_trans_id ?? body.transaction_id ?? '');
    } else {
      const form = await context.request.formData();
      reference = String(form.get('cpm_trans_id') ?? form.get('transaction_id') ?? '');
    }
  } catch {
    return new Response('Corps illisible', { status: 400 });
  }

  if (!reference) return new Response('Référence absente', { status: 400 });

  const order = await getOrderByReference(reference);
  if (!order) return new Response('Commande inconnue', { status: 404 });

  // Déjà réglée : on ne refait rien.
  if (order.paymentStatus === 'paye') return new Response('OK', { status: 200 });

  const verdict = await cinetpay.check(reference);
  if (!verdict.ok) {
    console.error(`[paiement] vérification impossible pour ${reference} : ${verdict.error}`);
    // 500 : le prestataire réessaiera.
    return new Response('Vérification impossible', { status: 500 });
  }

  await setPaymentStatus(order.id, verdict.status);
  await db
    .update(orders)
    .set({ providerRef: reference, providerPayload: verdict.raw as never })
    .where(eq(orders.id, order.id));

  // Payée : la commande entre directement en préparation.
  if (verdict.status === 'paye' && order.status === 'nouvelle') {
    setOrderStatus(order.id, 'confirmee');
  }

  return new Response('OK', { status: 200 });
};

/** Retour du client depuis la page de paiement. */
export const GET: APIRoute = async (context) => {
  const reference = context.url.searchParams.get('transaction_id') ?? '';
  if (!reference) return context.redirect('/boutique', 302);

  // On vérifie avant d'afficher : le client voit un état juste.
  const verdict = await cinetpay.check(reference);
  const order = await getOrderByReference(reference);

  if (order && verdict.ok && verdict.status !== order.paymentStatus) {
    await setPaymentStatus(order.id, verdict.status);
    if (verdict.status === 'paye' && order.status === 'nouvelle') {
      setOrderStatus(order.id, 'confirmee');
    }
  }

  return context.redirect(`/commande/merci?ref=${encodeURIComponent(reference)}`, 302);
};
