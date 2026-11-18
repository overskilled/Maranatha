/* ============================================================
   Le franc CFA ne se divise pas : tous les montants sont des
   entiers. Aucune décimale nulle part, jamais d'arrondi caché.
   Le prix affiché est le prix payé.
   ============================================================ */

/** Espace insécable fine, séparateur des milliers en français. */
const THIN = ' ';

/** 12500 → « 12 500 ». */
export function formatAmount(amount: number): string {
  const n = Math.round(amount || 0);
  const sign = n < 0 ? '-' : '';
  const digits = Math.abs(n).toString();
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += THIN;
    out += digits[i];
  }
  return sign + out;
}

/** 12500 → « 12 500 FCFA ». */
export function formatPrice(amount: number): string {
  return `${formatAmount(amount)}${THIN}FCFA`;
}

/** Version courte pour les tableaux denses : « 12 500 F ». */
export function formatShort(amount: number): string {
  return `${formatAmount(amount)}${THIN}F`;
}

/** Pour les grands totaux d'un tableau de bord : « 1,2 M ». */
export function formatCompact(amount: number): string {
  const n = Math.round(amount || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.', ',')}${THIN}Md`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}${THIN}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}${THIN}k`;
  return formatAmount(n);
}

/**
 * Lit un montant tapé ou importé : « 12 500 », « 12.500 », « 12,500 »,
 * « 12 500 FCFA », « 12500,00 ». Renvoie null si ce n'est pas un nombre.
 *
 * Les fichiers fournisseurs mélangent les conventions ; cette fonction
 * décide d'après la position du séparateur plutôt que d'après son signe.
 */
export function parseAmount(input: unknown): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input) : null;
  }
  if (typeof input !== 'string') return null;

  let s = input.trim();
  if (!s) return null;

  // Retirer la devise et les espaces de toute sorte.
  s = s
    .replace(/fcfa|xaf|cfa|francs?|f\b/gi, '')
    .replace(/[\s   ']/g, '')
    .trim();
  if (!s) return null;

  const negative = /^-/.test(s);
  s = s.replace(/^[-+]/, '');
  if (!/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const lastSep = Math.max(lastComma, lastDot);

  if (lastSep === -1) {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? (negative ? -n : n) : null;
  }

  const decimals = s.length - lastSep - 1;
  let value: number;

  // Exactement trois chiffres après le dernier séparateur et pas d'autre
  // séparateur d'un type différent : c'est un séparateur de milliers.
  const otherSep = lastSep === lastComma ? lastDot : lastComma;
  if (decimals === 3 && otherSep === -1) {
    value = Number.parseInt(s.replace(/[.,]/g, ''), 10);
  } else {
    // Sinon le dernier séparateur est décimal.
    const whole = s.slice(0, lastSep).replace(/[.,]/g, '');
    const frac = s.slice(lastSep + 1);
    value = Number.parseFloat(`${whole || '0'}.${frac}`);
  }

  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return negative ? -rounded : rounded;
}

/** Lit une quantité entière : stock, nombre de cartons. */
export function parseQuantity(input: unknown): number | null {
  const n = parseAmount(input);
  return n === null ? null : n;
}

/** Marge en pourcentage, arrondie à l'entier. */
export function marginPercent(price: number, cost: number | null): number | null {
  if (!cost || cost <= 0 || !price) return null;
  return Math.round(((price - cost) / price) * 100);
}
