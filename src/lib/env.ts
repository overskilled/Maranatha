/* ============================================================
   Configuration lue dans l'environnement.
   Un seul endroit pour savoir où sont les données, les photos
   et les clés du prestataire de paiement.
   ============================================================ */

import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Charge le fichier .env dans process.env.
 *
 * Astro expose .env sur import.meta.env, pas sur process.env : sans
 * cette étape, toute la configuration serait ignorée en développement
 * et le serveur tournerait avec ses valeurs par défaut sans le dire.
 *
 * Les variables déjà présentes dans l'environnement gagnent toujours :
 * en production, c'est le conteneur qui décide, pas un fichier oublié
 * dans l'image.
 */
function loadDotEnv(): void {
  for (const file of ['.env', '.env.local']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    let contents: string;
    try {
      contents = readFileSync(path, 'utf8');
    } catch {
      continue;
    }

    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const at = trimmed.indexOf('=');
      if (at < 1) continue;

      const key = trimmed.slice(0, at).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (process.env[key] !== undefined) continue;

      let value = trimmed.slice(at + 1).trim();
      // Guillemets optionnels autour de la valeur.
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
        (value.startsWith("'") && value.endsWith("'") && value.length > 1)
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadDotEnv();

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

  /**
   * Stockage des photos sur Cloudflare R2.
   * Vide, la boutique range ses photos sur le disque du serveur et
   * les sert elle-même : c'est le mode par défaut, et il suffit.
   */
  r2: {
    get enabled(): boolean {
      return Boolean(
        str('R2_ACCESS_KEY_ID') && str('R2_SECRET_ACCESS_KEY') && str('R2_BUCKET'),
      );
    },
    accountId: str('R2_ACCOUNT_ID'),
    accessKeyId: str('R2_ACCESS_KEY_ID'),
    secretAccessKey: str('R2_SECRET_ACCESS_KEY'),
    bucket: str('R2_BUCKET'),
    endpoint:
      str('R2_ENDPOINT') ||
      (str('R2_ACCOUNT_ID')
        ? `https://${str('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
        : ''),
    /** Dossier dans le bucket, pour cohabiter avec d'autres projets. */
    prefix: str('R2_PREFIX', 'maranatha'),
    /** Domaine public du bucket. Vide, les photos passent par le serveur. */
    publicUrl: str('R2_PUBLIC_URL'),
  },

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

  const r2Parts = [
    ['R2_ACCESS_KEY_ID', env.r2.accessKeyId],
    ['R2_SECRET_ACCESS_KEY', env.r2.secretAccessKey],
    ['R2_BUCKET', env.r2.bucket],
  ] as const;
  const filled = r2Parts.filter(([, value]) => value);
  if (filled.length > 0 && filled.length < r2Parts.length) {
    const missing = r2Parts.filter(([, value]) => !value).map(([key]) => key);
    out.push(
      `Configuration R2 incomplète : ${missing.join(', ')} manque(nt). Les photos resteront sur le disque.`,
    );
  }
  if (env.r2.enabled && !env.r2.endpoint) {
    out.push('R2 est configuré mais ni R2_ENDPOINT ni R2_ACCOUNT_ID ne sont renseignés.');
  }
  if (env.r2.enabled && !env.r2.publicUrl) {
    out.push(
      'R2_PUBLIC_URL est vide : les photos transiteront par le serveur au lieu du réseau Cloudflare.',
    );
  }

  return out;
}
