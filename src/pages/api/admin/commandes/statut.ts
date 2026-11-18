export const prerender = false;

import type { APIRoute } from 'astro';
import {
  setOrderStatus, setPaymentStatus, setInternalNote, getOrder,
  STATUS_LABEL,
} from '../../../../lib/repo/orders';
import type { OrderStatus, PaymentStatus } from '../../../../lib/db/schema';
import { requireUser, readBody, asString, ok, fail } from '../../../../lib/api';

const STATUSES: OrderStatus[] = [
  'nouvelle', 'confirmee', 'preparee', 'expediee', 'livree', 'annulee',
];
const PAYMENTS: PaymentStatus[] = ['en_attente', 'paye', 'echoue', 'rembourse'];

/** Avancement d'une commande, paiement et note interne. */
export const POST: APIRoute = async (context) => {
  const { user, response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const id = asString(body.id);
  if (!id) return fail('Commande introuvable.');

  const status = asString(body.status);
  const payment = asString(body.paymentStatus);
  const note = body.internalNote;

  if (status) {
    if (!STATUSES.includes(status as OrderStatus)) return fail('Statut inconnu.');

    const result = setOrderStatus(id, status as OrderStatus, { userId: user!.id });
    if (!result.ok) return fail(result.error);

    const extra =
      status === 'annulee'
        ? ' Le stock a été remis en place.'
        : '';
    return ok({
      status: result.order.status,
      message: `Commande ${result.order.reference} : ${STATUS_LABEL[result.order.status].toLowerCase()}.${extra}`,
    });
  }

  if (payment) {
    if (!PAYMENTS.includes(payment as PaymentStatus)) return fail('Statut de paiement inconnu.');
    await setPaymentStatus(id, payment as PaymentStatus);
    return ok({ message: 'Paiement mis à jour.' });
  }

  if (typeof note === 'string') {
    await setInternalNote(id, note);
    return ok({ message: 'Note enregistrée.' });
  }

  return fail('Rien à modifier.');
};

/** Détail d'une commande, pour un rafraîchissement sans rechargement. */
export const GET: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const id = context.url.searchParams.get('id');
  if (!id) return fail('Commande introuvable.');

  const order = await getOrder(id);
  if (!order) return fail('Commande introuvable.', 404);

  return ok({ order });
};
