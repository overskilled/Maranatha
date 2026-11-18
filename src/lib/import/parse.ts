/* ============================================================
   Lecture des fichiers déposés : CSV, texte tabulé, Excel.
   Les exports Excel français sortent souvent en Windows-1252 et
   séparés par des points-virgules : les deux sont détectés, sinon
   « Épicerie » arriverait écrit « Ã‰picerie ».
   ============================================================ */

import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/node';
import { extname } from 'node:path';

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
  /** Ce qu'on a dû deviner, affiché à l'écran pour qu'elle le vérifie. */
  notes: string[];
};

const XLSX_EXT = new Set(['.xlsx', '.xlsm', '.xltx']);
const LEGACY_EXT = new Set(['.xls']);

export function isSupportedFile(name: string): boolean {
  const ext = extname(name).toLowerCase();
  return XLSX_EXT.has(ext) || ['.csv', '.tsv', '.txt'].includes(ext);
}

/** Message d'aide quand le format n'est pas lisible. */
export function unsupportedReason(name: string): string {
  const ext = extname(name).toLowerCase();
  if (LEGACY_EXT.has(ext)) {
    return 'Les fichiers .xls (ancien Excel) ne sont pas lus. Ouvrez-le dans Excel puis « Enregistrer sous » en .xlsx ou .csv.';
  }
  if (ext === '.numbers' || ext === '.ods') {
    return 'Exportez d’abord ce fichier en .xlsx ou .csv depuis votre tableur.';
  }
  if (ext === '.pdf' || ext === '.docx' || ext === '.doc') {
    return 'Il faut un tableur (.xlsx ou .csv), pas un document texte.';
  }
  return 'Format non reconnu. Déposez un fichier .xlsx, .csv ou .txt.';
}

/* ---------- Encodage ---------- */

/**
 * Décode un CSV en texte. L'UTF-8 est essayé en premier et en mode
 * strict ; s'il échoue, le fichier vient presque toujours d'un Excel
 * francophone, donc Windows-1252.
 */
function decodeText(buffer: Buffer): { text: string; note?: string } {
  // Marque d'ordre des octets : le fichier annonce lui-même son encodage.
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buffer.subarray(3)) };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(buffer.subarray(2)), note: 'Fichier lu en UTF-16.' };
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(buffer.subarray(2)), note: 'Fichier lu en UTF-16.' };
  }

  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buffer) };
  } catch {
    return {
      text: new TextDecoder('windows-1252').decode(buffer),
      note: 'Fichier lu en Windows-1252 (export Excel). Vérifiez les accents dans l’aperçu.',
    };
  }
}

/* ---------- Lecture ---------- */

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // Une date dans une colonne produit est presque toujours une
    // référence qu'Excel a mal interprétée. On garde le jour.
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === 'boolean') return value ? 'oui' : 'non';
  return String(value).trim();
}

/** Évite deux colonnes du même nom, et nomme les colonnes sans titre. */
function dedupeHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((value, index) => {
    let name = cellToString(value).trim();
    if (!name) name = `Colonne ${index + 1}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return count === 0 ? name : `${name} (${count + 1})`;
  });
}

async function parseExcel(buffer: Buffer): Promise<ParsedFile> {
  const sheet = (await readSheet(buffer)) as unknown[][];
  const notes: string[] = [];

  // Sauter les lignes vides du haut : beaucoup de fichiers ont un titre.
  let start = 0;
  while (start < sheet.length && sheet[start].every((c) => cellToString(c) === '')) start += 1;

  // La ligne d'en-tête est la première qui a au moins deux cellules remplies.
  let headerIndex = start;
  for (let i = start; i < Math.min(start + 10, sheet.length); i += 1) {
    const filled = sheet[i].filter((c) => cellToString(c) !== '').length;
    if (filled >= 2) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex > start) {
    notes.push(`Les ${headerIndex - start} première(s) ligne(s) ont été ignorées : les en-têtes commencent à la ligne ${headerIndex + 1}.`);
  }

  if (!sheet.length || headerIndex >= sheet.length) {
    return { headers: [], rows: [], notes: ['Le fichier est vide.'] };
  }

  const headers = dedupeHeaders(sheet[headerIndex]);
  const rows: Record<string, string>[] = [];

  for (let i = headerIndex + 1; i < sheet.length; i += 1) {
    const line = sheet[i];
    const row: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, c) => {
      const value = cellToString(line?.[c]);
      row[header] = value;
      if (value !== '') hasValue = true;
    });
    if (hasValue) rows.push(row);
  }

  return { headers, rows, notes };
}

function parseDelimited(buffer: Buffer, ext: string): ParsedFile {
  const notes: string[] = [];
  const { text, note } = decodeText(buffer);
  if (note) notes.push(note);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    // Papa devine , ; \t et | ; on force la tabulation pour un .tsv.
    delimiter: ext === '.tsv' ? '\t' : undefined,
    transformHeader: (h) => h.trim(),
    dynamicTyping: false,
  });

  if (result.meta?.delimiter === ';') {
    notes.push('Colonnes séparées par des points-virgules (format Excel français).');
  }

  // Papa signale les lignes dont le nombre de colonnes ne colle pas.
  const malformed = (result.errors ?? []).filter((e) => e.code === 'TooFewFields' || e.code === 'TooManyFields');
  if (malformed.length) {
    notes.push(`${malformed.length} ligne(s) n’ont pas le bon nombre de colonnes ; les cases manquantes seront vides.`);
  }

  const headers = dedupeHeaders(result.meta?.fields ?? []);
  const rows = (result.data ?? [])
    .map((row) => {
      const clean: Record<string, string> = {};
      let hasValue = false;
      for (const header of headers) {
        const value = cellToString(row[header]);
        clean[header] = value;
        if (value !== '') hasValue = true;
      }
      return hasValue ? clean : null;
    })
    .filter((r): r is Record<string, string> => r !== null);

  return { headers, rows, notes };
}

/** Point d'entrée : lit n'importe lequel des formats acceptés. */
export async function parseFile(buffer: Buffer, filename: string): Promise<ParsedFile> {
  const ext = extname(filename).toLowerCase();
  if (XLSX_EXT.has(ext)) return parseExcel(buffer);
  return parseDelimited(buffer, ext);
}
