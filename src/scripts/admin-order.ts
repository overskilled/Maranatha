/* Fiche commande : avancement, paiement, note, impression. */

declare global {
  interface Window {
    toast?: (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;
  }
}

const root = document.querySelector<HTMLElement>('[data-order]');

if (root) {
  const orderId = root.dataset.order!;

  async function send(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/commandes/statut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, ...payload }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string; error?: string };

      if (!data.ok) {
        window.toast?.(data.error ?? 'Action impossible.', 'danger');
        return false;
      }
      window.toast?.(data.message ?? 'Fait.', 'success');
      return true;
    } catch {
      window.toast?.('Connexion interrompue. Rien n’a changé.', 'danger');
      return false;
    }
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-status]')) {
    button.addEventListener('click', async () => {
      const status = button.dataset.status!;

      if (status === 'annulee') {
        const confirmed = confirm(
          'Annuler cette commande ?\n\nLes articles seront remis en stock.',
        );
        if (!confirmed) return;
      }

      const siblings = [...document.querySelectorAll<HTMLButtonElement>('[data-status]')];
      for (const s of siblings) s.disabled = true;

      if (await send({ status })) {
        setTimeout(() => location.reload(), 600);
      } else {
        for (const s of siblings) s.disabled = false;
      }
    });
  }

  document.querySelector<HTMLSelectElement>('[data-payment]')?.addEventListener('change', (event) => {
    void send({ paymentStatus: (event.target as HTMLSelectElement).value });
  });

  document.querySelector('[data-save-note]')?.addEventListener('click', () => {
    const area = document.querySelector<HTMLTextAreaElement>('[data-note]');
    if (area) void send({ internalNote: area.value });
  });

  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
}
