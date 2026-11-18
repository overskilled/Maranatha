/* ============================================================
   Configuration lue dans l'environnement.
   Un seul endroit pour savoir où sont les données, les photos
   et les clés du prestataire de paiement.
   ============================================================ */

import { resolve } from 'node:path';

function str(key: string, fallback = ''): string {
  const raw = process.env[key];
  return raw === undefined || raw === '' ? fallback : raw;
}

function bool(key: string, fallback = false): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'oui', 'yes', 'on'].includes(raw.toLowerCase());
}

function int(key: string, fallback: number): number {
  const raw = Number.parseInt(process.env[key] ?? '', 10);
  return Number.isFinite(raw) ? raw : fallback;
}

/** Racine des données qui doivent survivre à un redéploiement. */
const dataDir = resolve(str('DATA_DIR', './data'));

export const env = {
  production: process.env.NODE_ENV === 'production',

  dataDir,
  /** Base SQLite. Un seul fichier : la sauvegarde est une copie. */
  databasePath: resolve(str('DATABASE_PATH', `${dataDir}/maranatha.db`)),
  /** Photos produits traitées, servies en WebP. */
  uploadsDir: resolve(str('UPLOADS_DIR', `${dataDir}/uploads`)),
  /** Fichiers d'import déposés le temps du traitement. */
  importsDir: resolve(str('IMPORTS_DIR', `${dataDir}/imports`)),

  /** Clé de signature des cookies de session. */
  sessionSecret: str('SESSION_SECRET'),
  sessionDays: int('SESSION_DAYS', 30),

  /** Compte propriétaire créé au premier démarrage. */
  ownerEmail: str('OWNER_EMAIL'),
  ownerName: str('OWNER_NAME', 'Propriétaire'),
  ownerPassword: str('OWNER_PASSWORD'),

  /** Livraison : forfait par ville, réglable ensuite dans le back-office. */
  defaultDeliveryFee: int('DELIVERY_FEE', 1000),
  freeDeliveryFrom: int('FREE_DELIVERY_FROM', 50000),

  /** Paiement mobile — CinetPay couvre MTN MoMo et Orange Money. */
  cinetpay: {
    enabled: bool('CINETPAY_ENABLED', false),
    siteId: str('CINETPAY_SITE_ID'),
    apiKey: str('CINETPAY_API_KEY'),
    secretKey: str('CINETPAY_SECRET_KEY'),
    baseUrl: str('CINETPAY_BASE_URL', 'https://api-checkout.cinetpay.com/v2'),
  },

  /** Numéro qui reçoit les commandes passées par WhatsApp. */
  whatsappNumber: str('WHATSAPP_NUMBER', '237675201251'),

  publicUrl: str('PUBLIC_URL', 'https://maranatha-le-juste-prix.com'),
} as const;

/** Problèmes de configuration à signaler au démarrage. */
export function configWarnings(): string[] {
  const out: string[] = [];
  if (!env.sessionSecret) {
    out.push(
      'SESSION_SECRET absent : une clé temporaire est utilisée, toutes les sessions tomberont au prochain redémarrage.',
    );
  } else if (env.sessionSecret.length < 32) {
    out.push('SESSION_SECRET fait moins de 32 caractères.');
  }
  if (env.production && !env.ownerEmail) {
    out.push("OWNER_EMAIL absent : aucun compte propriétaire ne sera créé.");
  }
  if (env.cinetpay.enabled && !env.cinetpay.apiKey) {
    out.push('CINETPAY_ENABLED est actif mais CINETPAY_API_KEY est vide.');
  }
  return out;
}
