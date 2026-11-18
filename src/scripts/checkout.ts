/* ============================================================
   Caisse : la livraison s'affiche avant la validation.
   Le serveur recalcule tout de son côté — ce qui suit n'est
   là que pour que le client voie le montant tout de suite.
   ============================================================ */

type Zones = {
  zones: { name: string; fee: number }[];
  fallback: number;
  freeFrom: number;
  subtotal: number;
};

const form = document.querySelector<HTMLFormElement>('[data-checkout]');

if (form) {
  const config = JSON.parse(form.dataset.zones || '{}') as Zones;
  const fields = form.querySelector<HTMLElement>('[data-delivery-fields]');
  const city = form.querySelector<HTMLSelectElement>('[data-city]');
  const feeNode = form.querySelector<HTMLElement>('[data-fee]');
  const totalNode = form.querySelector<HTMLElement>('[data-total]');
  const address = form.querySelector<HTMLTextAreaElement>('#adresse');

  const THIN = ' ';

  function money(amount: number): string {
    const digits = Math.round(amount).toString();
    let out = '';
    for (let i = 0; i < digits.length; i += 1) {
      if (i > 0 && (digits.length - i) % 3 === 0) out += THIN;
      out += digits[i];
    }
    return `${out}${THIN}F`;
  }

  function currentMode(): string {
    return (
      form!.querySelector<HTMLInputElement>('[data-mode]:checked')?.value ?? 'livraison'
    );
  }

  function feeFor(mode: string): number {
    if (mode === 'retrait') return 0;
    if (config.freeFrom > 0 && config.subtotal >= config.freeFrom) return 0;

    const chosen = city?.value ?? '';
    const zone = (config.zones ?? []).find((z) => z.name === chosen);
    return zone ? zone.fee : (config.fallback ?? 0);
  }

  function paint(): void {
    const mode = currentMode();
    const fee = feeFor(mode);

    if (fields) fields.hidden = mode === 'retrait';
    // Une adresse n'est exigée que si l'on fait livrer.
    if (address) address.required = mode === 'livraison';

    if (feeNode) {
      feeNode.textContent =
        mode === 'retrait' ? 'retrait en boutique' : fee > 0 ? money(fee) : 'offerte';
    }
    if (totalNode) totalNode.textContent = money(config.subtotal + fee);
  }

  for (const radio of form.querySelectorAll<HTMLInputElement>('[data-mode]')) {
    radio.addEventListener('change', paint);
  }
  city?.addEventListener('change', paint);

  paint();

  /* Un seul envoi, même si le réseau traîne. */
  form.addEventListener('submit', () => {
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]');
    if (!button) return;
    setTimeout(() => {
      button.disabled = true;
      button.textContent = 'Enregistrement…';
    }, 0);
  });
}
