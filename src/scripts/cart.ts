/* Panier : quantités et retrait, sans rechargement de page. */

import { refreshCartCount, notify } from './shop';

const root = document.querySelector<HTMLElement>('[data-cart]');

if (root) {
  let busy = false;

  async function send(payload: Record<string, unknown>) {
    const response = await fetch('/api/boutique/panier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as {
      ok: boolean;
      count?: number;
      subtotalLabel?: string;
      lineTotal?: string | null;
      quantity?: number;
      problem?: string | null;
      message?: string;
      error?: string;
    };
  }

  function paintSubtotal(label?: string): void {
    if (!label) return;
    for (const node of document.querySelectorAll<HTMLElement>('[data-subtotal]')) {
      node.textContent = label;
    }
  }

  /* Changement de quantité */
  async function changeQuantity(line: HTMLElement, quantity: number): Promise<void> {
    if (busy) return;
    busy = true;

    const id = line.dataset.line!;
    const field = line.querySelector<HTMLInputElement>('[data-qty]');

    try {
      const data = await send({ action: 'quantite', id, quantity });

      if (!data.ok) {
        notify(data.error ?? 'Modification impossible.', 'error');
        return;
      }

      if (data.quantity === 0) {
        line.remove();
      } else {
        if (field && data.quantity) field.value = String(data.quantity);
        const total = line.querySelector<HTMLElement>('[data-line-total]');
        if (total && data.lineTotal) total.textContent = data.lineTotal;
      }

      paintSubtotal(data.subtotalLabel);
      refreshCartCount(data.count);

      // Le total et les boutons de validation dépendent du serveur :
      // on recharge pour que la page reste exacte.
      setTimeout(() => location.reload(), 400);
    } catch {
      notify('Connexion interrompue.', 'error');
    } finally {
      busy = false;
    }
  }

  for (const line of root.querySelectorAll<HTMLElement>('[data-line]')) {
    const field = line.querySelector<HTMLInputElement>('[data-qty]');
    const min = Number(field?.dataset.min ?? '1') || 1;
    const max = Number(field?.dataset.max ?? '9999') || 9999;

    for (const button of line.querySelectorAll<HTMLButtonElement>('[data-step]')) {
      button.addEventListener('click', () => {
        const step = Number(button.dataset.step) || 1;
        const now = Number((field?.value ?? '').replace(/[^\d]/g, '')) || min;
        const next = now + step * (min > 1 ? min : 1);

        // Descendre sous le minimum revient à retirer la ligne.
        if (next < min) {
          void changeQuantity(line, 0);
          return;
        }
        void changeQuantity(line, Math.min(max, next));
      });
    }

    field?.addEventListener('change', () => {
      const value = Number((field.value ?? '').replace(/[^\d]/g, '')) || 0;
      void changeQuantity(line, value);
    });

    line.querySelector<HTMLButtonElement>('[data-drop]')?.addEventListener('click', () => {
      void changeQuantity(line, 0);
    });
  }
}
