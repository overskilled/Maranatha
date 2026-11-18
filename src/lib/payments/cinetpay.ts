/* ============================================================
   CinetPay — MTN Mobile Money, Orange Money et cartes.
   Choisi parce qu'il couvre les deux opérateurs camerounais
   avec un seul compte marchand.

   Règle de sûreté : le statut d'un paiement n'est jamais lu dans
   la notification reçue. On rappelle toujours l'API de CinetPay
   pour le vérifier — une notification peut être rejouée ou forgée.
   ============================================================ */

import { createHmac } from 'node:crypto';
import { env } from '../env';

const TIMEOUT_MS = 20000;

export type InitResult =
  | { ok: true; paymentUrl: string; token: string }
  | { ok: false; error: string };

export type CheckResult =
  | { ok: true; status: 'paye' | 'en_attente' | 'echoue'; raw: unknown }
  | { ok: false; error: string };

function configured(): boolean {
  return Boolean(env.cinetpay.enabled && env.cinetpay.apiKey && env.cinetpay.siteId);
}

async function post(path: string, body: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${env.cinetpay.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ouvre un paiement et renvoie l'adresse de la page CinetPay.
 * Le montant en XAF doit être un multiple de 5 : c'est une règle
 * de l'opérateur, pas une approximation de notre part.
 */
export async function initiate(input: {
  reference: string;
  amount: number;
  description: string;
  customerName: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<InitResult> {
  if (!configured()) {
    return { ok: false, error: 'Le paiement mobile n’est pas configuré.' };
  }

  const amount = Math.ceil(input.amount / 5) * 5;
  const [surname, ...rest] = input.customerName.trim().split(/\s+/);

  try {
    const payload = await post('/payment', {
      apikey: env.cinetpay.apiKey,
      site_id: env.cinetpay.siteId,
      transaction_id: input.reference,
      amount,
      currency: 'XAF',
      description: input.description.slice(0, 200),
      return_url: input.returnUrl,
      notify_url: input.notifyUrl,
      channels: 'ALL',
      lang: 'fr',
      customer_name: rest.join(' ') || surname,
      customer_surname: surname,
      customer_phone_number: input.customerPhone,
    });

    const data = payload as {
      code?: string;
      message?: string;
      description?: string;
      data?: { payment_url?: string; payment_token?: string };
    };

    if (data.code === '201' && data.data?.payment_url) {
      return {
        ok: true,
        paymentUrl: data.data.payment_url,
        token: data.data.payment_token ?? '',
      };
    }

    return {
      ok: false,
      error: data.description || data.message || 'CinetPay a refusé la demande de paiement.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Paiement indisponible : ${message}` };
  }
}

/** Demande à CinetPay l'état réel d'une transaction. */
export async function check(reference: string): Promise<CheckResult> {
  if (!configured()) {
    return { ok: false, error: 'Le paiement mobile n’est pas configuré.' };
  }

  try {
    const payload = await post('/payment/check', {
      apikey: env.cinetpay.apiKey,
      site_id: env.cinetpay.siteId,
      transaction_id: reference,
    });

    const data = payload as {
      code?: string;
      message?: string;
      data?: { status?: string };
    };

    const status = (data.data?.status ?? '').toUpperCase();

    // 00 = succès. 627 = transaction en attente de l'abonné.
    if (data.code === '00' && status === 'ACCEPTED') {
      return { ok: true, status: 'paye', raw: payload };
    }
    if (status === 'REFUSED' || data.code === '600') {
      return { ok: true, status: 'echoue', raw: payload };
    }
    return { ok: true, status: 'en_attente', raw: payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Vérification impossible : ${message}` };
  }
}

/**
 * Contrôle l'empreinte envoyée dans l'en-tête `x-token`.
 * Sert de premier filtre ; la vérification par l'API reste la
 * seule source de vérité.
 */
export function signatureValid(
  body: Record<string, string>,
  token: string | null,
): boolean {
  if (!env.cinetpay.secretKey || !token) return false;

  const fields = [
    'cpm_site_id', 'cpm_trans_id', 'cpm_trans_date', 'cpm_amount',
    'cpm_currency', 'signature', 'payment_method', 'cel_phone_num',
    'cpm_phone_prefixe', 'cpm_language', 'cpm_version', 'cpm_payment_config',
    'cpm_page_action', 'cpm_custom', 'cpm_designation', 'cpm_error_message',
  ];

  const data = fields.map((f) => body[f] ?? '').join('');
  const expected = createHmac('sha256', env.cinetpay.secretKey).update(data).digest('hex');

  return expected.toLowerCase() === token.toLowerCase();
}

export const isConfigured = configured;
