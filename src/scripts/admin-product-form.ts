/* Fiche article : photos, duplication, suppression. */

declare global {
  interface Window {
    toast?: (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;
  }
}

const panel = document.querySelector<HTMLElement>('[data-photos]');
const productId = panel?.dataset.product;

/* ---------- Photos ---------- */

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 400_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
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
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    return blob && blob.size < file.size ? new File([blob], file.name, { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

const input = document.querySelector<HTMLInputElement>('[data-photo-input]');
const drop = document.querySelector<HTMLLabelElement>('[data-photo-drop]');
const progress = document.querySelector<HTMLElement>('[data-photo-progress]');
const bar = document.querySelector<HTMLElement>('[data-photo-bar]');
const text = document.querySelector<HTMLElement>('[data-photo-text]');

async function addPhotos(files: File[]): Promise<void> {
  if (!files.length || !productId) return;

  if (progress) progress.style.display = 'block';
  if (text) text.textContent = 'Préparation…';
  if (bar) bar.style.width = '20%';

  const body = new FormData();
  body.append('productId', productId);
  for (const file of await Promise.all(files.map(shrink))) body.append('photos', file);

  if (bar) bar.style.width = '60%';
  if (text) text.textContent = `Envoi de ${files.length} photo(s)…`;

  try {
    const response = await fetch('/api/admin/produits/photos', { method: 'POST', body });
    const data = (await response.json()) as {
      ok: boolean;
      matched?: number;
      failed?: number;
      results?: { ok: boolean; reason?: string }[];
      error?: string;
    };

    if (!data.ok) {
      window.toast?.(data.error ?? 'Envoi refusé.', 'danger');
      if (progress) progress.style.display = 'none';
      return;
    }

    if (bar) bar.style.width = '100%';
    const failure = data.results?.find((r) => !r.ok);
    if (failure) window.toast?.(failure.reason ?? 'Une photo a été refusée.', 'danger');

    if (text) text.textContent = 'Terminé. Actualisation…';
    setTimeout(() => location.reload(), 500);
  } catch {
    window.toast?.('Connexion interrompue pendant l’envoi.', 'danger');
    if (progress) progress.style.display = 'none';
  }
}

input?.addEventListener('change', () => {
  const files = [...(input.files ?? [])];
  if (files.length) void addPhotos(files);
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
  if (files.length) void addPhotos(files);
});

async function photoAction(action: string, id: string): Promise<void> {
  const response = await fetch('/api/admin/produits/photos', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, id }),
  });
  const data = (await response.json()) as { ok: boolean; message?: string; error?: string };

  if (!data.ok) {
    window.toast?.(data.error ?? 'Action impossible.', 'danger');
    return;
  }
  location.reload();
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-remove]')) {
  button.addEventListener('click', () => {
    if (confirm('Retirer cette photo ? Elle sera supprimée du serveur.')) {
      void photoAction('supprimer', button.dataset.remove!);
    }
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-cover]')) {
  button.addEventListener('click', () => void photoAction('couverture', button.dataset.cover!));
}

/* ---------- Dupliquer et supprimer ---------- */

document.querySelector<HTMLButtonElement>('[data-duplicate]')?.addEventListener('click', async (event) => {
  const id = (event.currentTarget as HTMLButtonElement).dataset.duplicate!;

  const response = await fetch('/api/admin/produits/lot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dupliquer', ids: [id] }),
  });
  const data = (await response.json()) as { ok: boolean; message?: string; error?: string };

  if (!data.ok) {
    window.toast?.(data.error ?? 'Duplication impossible.', 'danger');
    return;
  }
  location.href = `/admin/produits?statut=draft&message=${encodeURIComponent(data.message ?? 'Copie créée.')}`;
});

document.querySelector<HTMLButtonElement>('[data-delete]')?.addEventListener('click', async (event) => {
  const id = (event.currentTarget as HTMLButtonElement).dataset.delete!;

  const confirmed = confirm(
    'Supprimer définitivement cet article et ses photos ?\n\n' +
      'Cette action est irréversible. Pour simplement le retirer de la boutique, ' +
      'choisissez plutôt le statut « Archivé ».',
  );
  if (!confirmed) return;

  const response = await fetch('/api/admin/produits/lot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'supprimer', ids: [id] }),
  });
  const data = (await response.json()) as { ok: boolean; message?: string; error?: string };

  if (!data.ok) {
    window.toast?.(data.error ?? 'Suppression impossible.', 'danger');
    return;
  }
  location.href = `/admin/produits?message=${encodeURIComponent(data.message ?? 'Article supprimé.')}`;
});

/* ---------- Confort de saisie ---------- */

/* Les montants se reformatent à la sortie du champ : « 12500 » → « 12 500 ». */
for (const field of ['price', 'comparePrice', 'cost']) {
  const el = document.getElementById(field) as HTMLInputElement | null;
  el?.addEventListener('blur', () => {
    const digits = el.value.replace(/[^\d]/g, '');
    if (!digits) return;
    el.value = Number(digits).toLocaleString('fr-FR').replace(/ /g, ' ');
  });
}
