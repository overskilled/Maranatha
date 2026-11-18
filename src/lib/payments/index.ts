/* ============================================================
   Moyens de paiement proposés à la caisse.
   Deux d'entre eux ne demandent aucune intégration : payer à la
   livraison et payer en boutique. Ce sont les plus utilisés ici,
   et ils fonctionnent même si rien n'est configuré.
   ============================================================ */

import { getSettings } from '../settings';
import * as cinetpay from './cinetpay';

export type PaymentMethod = {
  key: string;
  label: string;
  hint: string;
  /** Un paiement en ligne redirige vers le prestataire. */
  online: boolean;
  available: boolean;
};

export function availableMethods(): PaymentMethod[] {
  const config = getSettings();

  const methods: PaymentMethod[] = [
    {
      key: 'livraison',
      label: 'À la livraison',
      hint: 'Vous payez en espèces quand la commande arrive.',
      online: false,
      available: config.payments.livraison,
    },
    {
      key: 'boutique',
      label: 'En boutique',
      hint: 'Vous réglez au comptoir en venant chercher la commande.',
      online: false,
      available: config.payments.boutique,
    },
    {
      key: 'momo',
      label: 'Mobile Money',
      hint: 'MTN Mobile Money ou Orange Money, depuis votre téléphone.',
      online: true,
      available: config.payments.momo && cinetpay.isConfigured(),
    },
  ];

  return methods.filter((m) => m.available);
}

export function methodLabel(key: string): string {
  return availableMethods().find((m) => m.key === key)?.label ?? key;
}

export function isOnline(key: string): boolean {
  return availableMethods().find((m) => m.key === key)?.online ?? false;
}

export { cinetpay };
