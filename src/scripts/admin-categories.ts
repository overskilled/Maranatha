/* Rayons : créer, renommer, supprimer. */

declare global {
  interface Window {
    toast?: (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;
  }
}

async function call(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { ok: boolean; message?: string; error?: string };

    if (!data.ok) {
      window.toast?.(data.error ?? 'Action impossible.', 'danger');
      return false;
    }
    window.toast?.(data.message ?? 'Fait.', 'success');
    return true;
  } catch {
    window.toast?.('Connexion interrompue.', 'danger');
    return false;
  }
}

document.querySelector<HTMLFormElement>('[data-new-category]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);

  const button = form.querySelector<HTMLButtonElement>('button[type=submit]');
  if (button) button.disabled = true;

  const done = await call({
    action: 'creer',
    name: data.get('name'),
    division: data.get('division'),
    description: data.get('description'),
  });

  if (button) button.disabled = false;
  if (done) setTimeout(() => location.reload(), 500);
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-rename]')) {
  button.addEventListener('click', async () => {
    const current = button.dataset.name ?? '';
    const name = prompt('Nouveau nom du rayon', current);
    if (!name?.trim() || name === current) return;

    if (await call({ action: 'modifier', id: button.dataset.rename, name: name.trim() })) {
      setTimeout(() => location.reload(), 500);
    }
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-remove]')) {
  button.addEventListener('click', async () => {
    const count = Number(button.dataset.count ?? '0');
    const name = button.dataset.name ?? 'ce rayon';

    const message =
      count > 0
        ? `Supprimer le rayon « ${name} » ?\n\nLes ${count} article(s) qu’il contient ne seront pas supprimés : ils se retrouveront simplement sans rayon.`
        : `Supprimer le rayon « ${name} » ?`;

    if (!confirm(message)) return;

    if (await call({ action: 'supprimer', id: button.dataset.remove })) {
      setTimeout(() => location.reload(), 500);
    }
  });
}
