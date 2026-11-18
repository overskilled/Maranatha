/* Dépôt du fichier d'import : glisser-déposer, envoi, redirection. */

declare global {
  interface Window {
    toast?: (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;
  }
}

const drop = document.querySelector<HTMLLabelElement>('[data-drop]');
const input = document.querySelector<HTMLInputElement>('[data-file]');
const state = document.querySelector<HTMLElement>('[data-upload-state]');
const nameEl = document.querySelector<HTMLElement>('[data-upload-name]');
const textEl = document.querySelector<HTMLElement>('[data-upload-text]');
const bar = document.querySelector<HTMLElement>('[data-upload-bar]');
const errorBox = document.querySelector<HTMLElement>('[data-upload-error]');

function showError(message: string): void {
  if (!errorBox) return;
  errorBox.style.display = 'block';
  errorBox.innerHTML = '';

  const note = document.createElement('div');
  note.className = 'note note--danger';
  note.setAttribute('role', 'alert');
  const p = document.createElement('p');
  p.textContent = message;
  note.append(p);
  errorBox.append(note);

  if (state) state.style.display = 'none';
  if (drop) drop.style.display = 'block';
}

async function send(file: File): Promise<void> {
  if (errorBox) errorBox.style.display = 'none';
  if (drop) drop.style.display = 'none';
  if (state) state.style.display = 'block';
  if (nameEl) nameEl.textContent = file.name;
  if (textEl) {
    textEl.textContent =
      file.size > 2_000_000
        ? 'Envoi du fichier… cela peut prendre un moment sur une connexion mobile.'
        : 'Lecture des colonnes…';
  }
  if (bar) bar.style.width = '35%';

  const body = new FormData();
  body.append('fichier', file);

  try {
    const response = await fetch('/api/admin/import/depot', { method: 'POST', body });
    if (bar) bar.style.width = '80%';

    const data = (await response.json()) as {
      ok: boolean;
      error?: string;
      redirect?: string;
      rows?: number;
    };

    if (!data.ok || !data.redirect) {
      showError(data.error ?? 'Le fichier n’a pas pu être lu.');
      return;
    }

    if (bar) bar.style.width = '100%';
    if (textEl) {
      textEl.textContent = `${(data.rows ?? 0).toLocaleString('fr-FR')} lignes lues. Ouverture de la correspondance…`;
    }
    location.href = data.redirect;
  } catch {
    showError('Connexion interrompue pendant l’envoi. Réessayez.');
  }
}

input?.addEventListener('change', () => {
  const file = input.files?.[0];
  if (file) void send(file);
});

/* Glisser-déposer */
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
  const file = (event as DragEvent).dataTransfer?.files?.[0];
  if (file) void send(file);
});

/* La page entière accepte le dépôt, sans ouvrir le fichier par erreur. */
for (const name of ['dragover', 'drop']) {
  window.addEventListener(name, (event) => {
    if (!(event.target as HTMLElement)?.closest('[data-drop]')) event.preventDefault();
  });
}

/* Suppression d'un modèle enregistré */
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-delete-profile]')) {
  button.addEventListener('click', async () => {
    if (!confirm('Supprimer ce modèle de correspondance ?')) return;

    const response = await fetch('/api/admin/import/profils', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: button.dataset.deleteProfile }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };

    if (data.ok) location.reload();
    else window.toast?.(data.error ?? 'Suppression impossible.', 'danger');
  });
}
