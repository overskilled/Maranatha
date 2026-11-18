/* ============================================================
   Dépôt de photos en lot.

   Les photos sont réduites dans le navigateur avant l'envoi :
   une photo de téléphone de 5 Mo part à environ 300 Ko. Sur une
   connexion mobile, c'est la différence entre un dépôt de deux
   minutes et un dépôt d'une demi-heure.
   ============================================================ */

declare global {
  interface Window {
    toast?: (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;
  }
}

type Outcome = {
  file: string;
  ok: boolean;
  sku?: string;
  productName?: string;
  url?: string;
  reason?: string;
};

/** Largeur maximale envoyée au serveur, qui produira ses rendus. */
const MAX_EDGE = 1800;
/** Nombre de photos par envoi : assez petit pour qu'une coupure coûte peu. */
const BATCH = 4;

const drop = document.querySelector<HTMLLabelElement>('[data-photo-drop]');
const input = document.querySelector<HTMLInputElement>('[data-photo-input]');
const progress = document.querySelector<HTMLElement>('[data-photo-progress]');
const bar = document.querySelector<HTMLElement>('[data-photo-bar]');
const text = document.querySelector<HTMLElement>('[data-photo-text]');
const resultsCard = document.querySelector<HTMLElement>('[data-photo-results]');
const resultsList = document.querySelector<HTMLElement>('[data-photo-list]');
const summary = document.querySelector<HTMLElement>('[data-photo-summary]');

/**
 * Réduit une image avec le canevas du navigateur.
 * En cas de doute (format exotique, mémoire), on renvoie le
 * fichier d'origine : mieux vaut un envoi lourd qu'un envoi raté.
 */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 400_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    if (scale >= 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.86),
    );
    if (!blob || blob.size >= file.size) return file;

    // Le nom est conservé : c'est lui qui porte la référence.
    return new File([blob], file.name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function addResult(outcome: Outcome): void {
  if (!resultsList) return;

  const row = document.createElement('div');
  row.className = 'row-item';

  if (outcome.ok && outcome.url) {
    const img = document.createElement('img');
    img.className = 'shot';
    img.src = outcome.url;
    img.alt = '';
    img.width = 34;
    img.height = 34;
    row.append(img);
  } else {
    const mark = document.createElement('span');
    mark.className = 'shot';
    mark.style.cssText =
      'display:grid;place-items:center;color:var(--a-danger);font-size:1rem;background:var(--a-danger-wash)';
    mark.textContent = '×';
    mark.setAttribute('aria-hidden', 'true');
    row.append(mark);
  }

  const body = document.createElement('div');
  body.className = 'row-item__text';

  const title = document.createElement('span');
  title.className = 'row-item__title';
  title.textContent = outcome.ok ? (outcome.productName ?? outcome.sku ?? '') : outcome.file;

  const meta = document.createElement('span');
  meta.className = 'row-item__meta';
  if (outcome.ok) {
    meta.textContent = `${outcome.file} → ${outcome.sku}`;
  } else {
    meta.style.color = 'var(--a-danger)';
    meta.textContent = outcome.reason ?? 'Échec';
  }

  body.append(title, meta);
  row.append(body);

  // Les échecs remontent en haut : ce sont eux qu'elle doit voir.
  if (outcome.ok) resultsList.append(row);
  else resultsList.prepend(row);
}

async function upload(files: File[]): Promise<void> {
  if (!files.length) return;

  if (resultsCard) resultsCard.style.display = 'block';
  if (resultsList) resultsList.innerHTML = '';
  if (progress) progress.style.display = 'block';

  let done = 0;
  let matched = 0;
  let failed = 0;

  const tick = (label: string) => {
    if (bar) bar.style.width = `${Math.round((done / files.length) * 100)}%`;
    if (text) text.textContent = label;
  };

  tick(`0 / ${files.length} photos`);

  for (let i = 0; i < files.length; i += BATCH) {
    const slice = files.slice(i, i + BATCH);

    tick(`${done} / ${files.length} photos · préparation…`);
    const prepared = await Promise.all(slice.map(shrink));

    const body = new FormData();
    for (const file of prepared) body.append('photos', file);

    try {
      const response = await fetch('/api/admin/produits/photos', { method: 'POST', body });
      const data = (await response.json()) as { ok: boolean; results?: Outcome[]; error?: string };

      if (!data.ok || !data.results) {
        for (const file of slice) {
          addResult({ file: file.name, ok: false, reason: data.error ?? 'Envoi refusé.' });
          failed += 1;
        }
      } else {
        for (const outcome of data.results) {
          addResult(outcome);
          if (outcome.ok) matched += 1;
          else failed += 1;
        }
      }
    } catch {
      for (const file of slice) {
        addResult({ file: file.name, ok: false, reason: 'Connexion interrompue pendant l’envoi.' });
        failed += 1;
      }
    }

    done += slice.length;
    tick(`${done} / ${files.length} photos · ${matched} rangées, ${failed} en attente`);

    if (summary) {
      summary.textContent =
        failed === 0
          ? `${matched} photo(s) rangée(s).`
          : `${matched} photo(s) rangée(s), ${failed} sans article correspondant.`;
    }
  }

  if (bar) {
    bar.style.width = '100%';
    bar.classList.add(failed === 0 ? 'bar__fill--success' : 'bar__fill--danger');
  }
  if (text) {
    text.textContent =
      failed === 0
        ? `Terminé : ${matched} photo(s) rangée(s).`
        : `Terminé : ${matched} rangée(s), ${failed} sans correspondance. Vérifiez les noms de fichiers ci-dessous.`;
  }

  window.toast?.(
    failed === 0
      ? `${matched} photo(s) ajoutée(s).`
      : `${matched} rangée(s), ${failed} sans article correspondant.`,
    failed === 0 ? 'success' : 'info',
    6000,
  );
}

input?.addEventListener('change', () => {
  const files = [...(input.files ?? [])];
  if (files.length) void upload(files);
  input.value = '';
});

for (const name of ['dragenter', 'dragover']) {
  drop?.addEventListener(name, (event) => {
    event.preventDefault();
    drop.classList.add('is-over');
  });
}

for (const name of ['dragleave', 'drop']) {
  drop?.addEventListener(name, (event) => {
    event.preventDefault();
    drop.classList.remove('is-over');
  });
}

drop?.addEventListener('drop', (event) => {
  const files = [...((event as DragEvent).dataTransfer?.files ?? [])];
  if (files.length) void upload(files);
});

for (const name of ['dragover', 'drop']) {
  window.addEventListener(name, (event) => {
    if (!(event.target as HTMLElement)?.closest('[data-photo-drop]')) event.preventDefault();
  });
}

document.querySelector('[data-photo-reload]')?.addEventListener('click', () => location.reload());

/* Copier la liste des références à photographier. */
document.querySelector('[data-copy-skus]')?.addEventListener('click', async () => {
  const area = document.querySelector<HTMLTextAreaElement>('[data-skus]');
  if (!area) return;

  try {
    await navigator.clipboard.writeText(area.value);
    window.toast?.('Références copiées. Collez-les où vous voulez.', 'success');
  } catch {
    // Les navigateurs anciens n'ont pas le presse-papiers moderne.
    area.style.position = 'static';
    area.style.opacity = '1';
    area.select();
    document.execCommand('copy');
    area.style.position = 'absolute';
    area.style.opacity = '0';
    window.toast?.('Références copiées.', 'success');
  }
});
