/* Normalisation du texte : slugs, recherche sans accent, références. */

/** Retire les accents et met en minuscules. Base de la recherche. */
export function normalize(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** « Riz parfumé 25 kg » → « riz-parfume-25-kg ». */
export function slugify(input: string): string {
  const base = normalize(input)
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return base.slice(0, 80) || 'article';
}

/** Référence interne : majuscules, chiffres et tirets seulement. */
export function skuify(input: string): string {
  return normalize(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
    .slice(0, 48);
}

/**
 * Référence lisible déduite d'un nom, quand le fichier importé n'en
 * fournit pas : « Riz parfumé 25 kg » → « RIZ-PARFUME-25-KG ».
 */
export function skuFromName(name: string): string {
  return skuify(name) || 'ARTICLE';
}

/** Texte indexé pour la recherche d'un produit. */
export function searchTextFor(parts: (string | null | undefined)[]): string {
  return normalize(parts.filter(Boolean).join(' ')).replace(/\s+/g, ' ');
}

/**
 * Normalise un numéro camerounais vers le format international sans « + ».
 * « 675 20 12 51 », « 6 75 20 12 51 », « +237675201251 » → « 237675201251 ».
 */
export function normalizePhone(input: string): string | null {
  const digits = (input || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('237') && digits.length === 12) return digits;
  if (digits.length === 9 && /^6/.test(digits)) return `237${digits}`;
  // Numéros fixes à 9 chiffres commençant par 2.
  if (digits.length === 9 && /^2/.test(digits)) return `237${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

/** « 237675201251 » → « +237 6 75 20 12 51 ». */
export function formatPhone(input: string): string {
  const d = normalizePhone(input);
  if (!d) return input;
  if (d.startsWith('237') && d.length === 12) {
    const n = d.slice(3);
    return `+237 ${n[0]} ${n.slice(1, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`;
  }
  return `+${d}`;
}

/** Civilités à ne pas confondre avec un prénom. */
const TITLES = new Set([
  'm', 'm.', 'mr', 'mr.', 'monsieur',
  'mme', 'mme.', 'madame', 'mlle', 'mlle.', 'mademoiselle',
  'dr', 'dr.', 'docteur', 'pr', 'pr.', 'professeur',
  'me', 'me.', 'maitre', 'maître', 'chef', 'pasteur', 'rev', 'révérend',
]);

/**
 * Prénom d'usage, pour s'adresser à quelqu'un sans se tromper.
 * « Mme Tagne Bernadette » → « Tagne ». « Paul » → « Paul ».
 * Si tout a été filtré, on rend le nom entier plutôt que rien.
 */
export function firstNameOf(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const named = parts.find((part) => !TITLES.has(normalize(part)));
  return named ?? parts.join(' ') ?? '';
}

/** Coupe proprement, sans couper un mot en deux. */
export function truncate(input: string, max = 160): string {
  const s = (input || '').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Liste de mots-clés depuis « riz, sac, gros » ou « riz; sac ». */
export function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof input !== 'string') return [];
  return input
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Lit un oui/non venu d'un tableur. */
export function parseBoolean(input: unknown): boolean | null {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return input !== 0;
  if (typeof input !== 'string') return null;
  const v = normalize(input);
  if (!v) return null;
  if (['oui', 'o', 'vrai', 'v', 'yes', 'y', 'true', '1', 'x', 'actif', 'publie'].includes(v)) return true;
  if (['non', 'n', 'faux', 'f', 'no', 'false', '0', 'inactif', 'brouillon'].includes(v)) return false;
  return null;
}

/** Date lisible en français : « 12 octobre 2026 ». */
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function formatDate(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const d = new Date(seconds * 1000);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const d = new Date(seconds * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} à ${hh}h${mm}`;
}

/** « il y a 3 jours », pour les listes de commandes. */
export function timeAgo(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `il y a ${m} min`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `il y a ${h} h`;
  }
  const d = Math.floor(diff / 86400);
  if (d === 1) return 'hier';
  if (d < 30) return `il y a ${d} jours`;
  return formatDate(seconds);
}

/** Pluriel simple : plural(1, 'commande') → « 1 commande ». */
export function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count > 1 ? (pluralForm ?? `${singular}s`) : singular;
  return `${count} ${word}`;
}
