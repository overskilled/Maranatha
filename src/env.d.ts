/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Compte connecté au back-office, s'il y en a un. */
    user: import('./lib/auth').SessionUser | null;
    /** Nombre d'articles dans le panier, pour l'en-tête. */
    cartCount: number;
  }
}
