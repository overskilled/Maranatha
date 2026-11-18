/* ============================================================
   Réglages de la boutique, modifiables sans redéploiement.
   Valeurs par défaut prudentes : la boutique fonctionne même
   si rien n'a encore été réglé.
   ============================================================ */

import { eq } from 'drizzle-orm';
import { db, raw } from './db';
import { settings } from './db/schema';
import { env } from './env';

export type DeliveryZone = { name: string; fee: number };

export type ShopSettings = {
  /** Boutique ouverte aux commandes. Fermée, le catalogue reste visible. */
  open: boolean;
  closedMessage: string;
  /** Zones de livraison et forfait associé. */
  zones: DeliveryZone[];
  /** Forfait appliqué à une ville absente de la liste. */
  defaultDeliveryFee: number;
  /** Livraison offerte à partir de ce montant. 0 = jamais. */
  freeDeliveryFrom: number;
  /** Moyens de paiement proposés à la caisse. */
  payments: { livraison: boolean; boutique: boolean; momo: boolean };
  /** Numéro qui reçoit les commandes WhatsApp. */
  whatsappNumber: string;
  /** Montant minimum de commande. 0 = aucun. */
  minimumOrder: number;
  /** Texte affiché en tête de la boutique. */
  shopIntro: string;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  open: true,
  closedMessage:
    'La boutique en ligne est momentanément fermée. Appelez-nous, nous préparons votre commande.',
  zones: [
    { name: 'Bafoussam centre', fee: 1000 },
    { name: 'Bafoussam périphérie', fee: 2000 },
    { name: 'Autre ville', fee: 5000 },
  ],
  defaultDeliveryFee: env.defaultDeliveryFee,
  freeDeliveryFrom: env.freeDeliveryFrom,
  payments: { livraison: true, boutique: true, momo: env.cinetpay.enabled },
  whatsappNumber: env.whatsappNumber,
  minimumOrder: 0,
  shopIntro: 'Le prix affiché est le prix payé. Pas de frais ajoutés à la livraison.',
};

const KEY = 'shop';

/** Lecture synchrone : appelée à chaque rendu de page. */
export function getSettings(): ShopSettings {
  try {
    const row = raw()
      .prepare('select value from settings where key = ?')
      .get(KEY) as { value: string } | undefined;
    if (!row?.value) return DEFAULT_SETTINGS;

    const stored = JSON.parse(row.value) as Partial<ShopSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      payments: { ...DEFAULT_SETTINGS.payments, ...(stored.payments ?? {}) },
      zones: Array.isArray(stored.zones) && stored.zones.length ? stored.zones : DEFAULT_SETTINGS.zones,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<ShopSettings>): Promise<ShopSettings> {
  const next: ShopSettings = {
    ...getSettings(),
    ...patch,
    payments: { ...getSettings().payments, ...(patch.payments ?? {}) },
  };

  const existing = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const payload = { value: next, updatedAt: Math.floor(Date.now() / 1000) };

  if (existing.length) {
    await db.update(settings).set(payload).where(eq(settings.key, KEY));
  } else {
    await db.insert(settings).values({ key: KEY, ...payload });
  }

  return next;
}

/** Frais de livraison pour une ville donnée. */
export function deliveryFeeFor(city: string | null | undefined, subtotal = 0): number {
  const config = getSettings();
  if (config.freeDeliveryFrom > 0 && subtotal >= config.freeDeliveryFrom) return 0;
  if (!city) return config.defaultDeliveryFee;

  const match = config.zones.find(
    (zone) => zone.name.toLowerCase() === city.trim().toLowerCase(),
  );
  return match ? match.fee : config.defaultDeliveryFee;
}
