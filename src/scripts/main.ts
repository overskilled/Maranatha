import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------
   Smooth scroll
   ------------------------------------------------------------ */

let lenis: Lenis | null = null;

if (!reduceMotion) {
  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.15,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------------------------------------
   Header state
   ------------------------------------------------------------ */

const header = document.querySelector<HTMLElement>('[data-header]');
let lastScroll = -1;

function updateHeader() {
  if (!header) return;
  const y = window.scrollY;
  if (y === lastScroll) return;
  lastScroll = y;
  header.classList.toggle('is-scrolled', y > 28);
}

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

/* ------------------------------------------------------------
   Mega menu
   ------------------------------------------------------------ */

const mega = document.querySelector<HTMLElement>('[data-mega]');
const megaToggle = document.querySelector<HTMLButtonElement>('[data-mega-toggle]');
const megaWrap = document.querySelector<HTMLElement>('[data-mega-wrap]');
let megaPinned = false;
let megaCloseTimer: number | undefined;

function setMega(open: boolean, pin = false) {
  if (!mega || !megaToggle) return;
  megaPinned = open ? pin : false;
  mega.classList.toggle('is-open', open);
  mega.setAttribute('aria-hidden', String(!open));
  mega.inert = !open;
  megaToggle.setAttribute('aria-expanded', String(open));
  if (open) window.clearTimeout(megaCloseTimer);
}

function scheduleMegaClose() {
  if (megaPinned) return;
  window.clearTimeout(megaCloseTimer);
  megaCloseTimer = window.setTimeout(() => setMega(false), 180);
}

if (mega && megaToggle && megaWrap) {
  mega.inert = true;

  megaToggle.addEventListener('click', () => {
    const isOpen = mega.classList.contains('is-open');
    setMega(!isOpen, !isOpen);
  });

  if (finePointer) {
    megaWrap.addEventListener('mouseenter', () => {
      if (window.innerWidth > 1080) setMega(true);
    });
    megaWrap.addEventListener('mouseleave', scheduleMegaClose);
    mega.addEventListener('mouseenter', () => window.clearTimeout(megaCloseTimer));
    mega.addEventListener('mouseleave', scheduleMegaClose);
  }

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    if (
      mega.classList.contains('is-open') &&
      !mega.contains(target) &&
      !megaToggle.contains(target)
    ) {
      setMega(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mega.classList.contains('is-open')) {
      setMega(false);
      megaToggle.focus();
    }
  });
}

/* ------------------------------------------------------------
   Mobile menu
   ------------------------------------------------------------ */

const mobileMenu = document.querySelector<HTMLElement>('[data-mobile-menu]');
const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menuClose = document.querySelector<HTMLButtonElement>('[data-menu-close]');
let lastFocused: HTMLElement | null = null;

function focusableIn(element: HTMLElement) {
  return Array.from(
    element.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => !node.hasAttribute('hidden') && node.offsetParent !== null);
}

function setMenu(open: boolean) {
  if (!mobileMenu || !menuToggle) return;
  mobileMenu.classList.toggle('is-open', open);
  mobileMenu.setAttribute('aria-hidden', String(!open));
  mobileMenu.inert = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);

  if (open) {
    lastFocused = document.activeElement as HTMLElement;
    lenis?.stop();
    window.setTimeout(() => focusableIn(mobileMenu)[0]?.focus(), 120);
  } else {
    lenis?.start();
    lastFocused?.focus();
  }
}

if (mobileMenu && menuToggle) {
  mobileMenu.inert = true;

  menuToggle.addEventListener('click', () => setMenu(true));
  menuClose?.addEventListener('click', () => setMenu(false));

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  mobileMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenu(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = focusableIn(mobileMenu);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080 && mobileMenu.classList.contains('is-open')) {
      setMenu(false);
    }
  });
}

/* ------------------------------------------------------------
   Métiers accordion
   ------------------------------------------------------------ */

const metiers = Array.from(document.querySelectorAll<HTMLElement>('[data-metier]'));

if (metiers.length) {
  const activate = (index: number) => {
    metiers.forEach((metier, i) => {
      const active = i === index;
      metier.classList.toggle('is-active', active);
      const trigger = metier.querySelector<HTMLButtonElement>('[data-metier-toggle]');
      trigger?.setAttribute('aria-expanded', String(active));
    });
  };

  activate(0);

  metiers.forEach((metier, index) => {
    const trigger = metier.querySelector<HTMLButtonElement>('[data-metier-toggle]');
    if (!trigger) return;
    trigger.addEventListener('click', () => activate(index));
    trigger.addEventListener('focus', () => activate(index));
    if (finePointer) {
      trigger.addEventListener('mouseenter', () => activate(index));
    }
  });
}

/* ------------------------------------------------------------
   Reveals and motion
   ------------------------------------------------------------ */

async function initMotion() {
  if (reduceMotion) return;

  html.classList.add('js');

  const allReveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  const heroReveals = allReveals.filter((el) => el.closest('.page-hero, .home-hero'));
  const scrollReveals = allReveals.filter((el) => !heroReveals.includes(el));

  gsap.set(heroReveals, { opacity: 0, y: 22 });
  gsap.to(heroReveals, {
    opacity: 1,
    y: 0,
    duration: 0.95,
    ease: 'power3.out',
    stagger: 0.075,
    delay: 0.12,
    clearProps: 'transform',
  });

  gsap.set(scrollReveals, { opacity: 0, y: 24 });

  scrollReveals.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.95,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true,
      },
      clearProps: 'transform',
    });
  });

  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));

  groups.forEach((group) => {
    const children = Array.from(group.children) as HTMLElement[];
    if (!children.length) return;
    gsap.set(children, { opacity: 0, y: 22 });
    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: {
        trigger: group,
        start: 'top 88%',
        once: true,
      },
      clearProps: 'transform',
    });
  });

  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((container) => {
    const image = container.querySelector('img');
    if (!image) return;
    gsap.fromTo(
      image,
      { yPercent: -4, scale: 1.1 },
      {
        yPercent: 4,
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
  });

  const routeLine = document.querySelector<HTMLElement>('[data-route-line]');
  if (routeLine) {
    gsap.fromTo(
      routeLine,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: routeLine.closest('[data-route]') ?? routeLine,
          start: 'top 82%',
          end: 'bottom 68%',
          scrub: true,
        },
      },
    );
  }

  const route = document.querySelector<SVGPathElement>('[data-route-path]');
  if (route) {
    route.style.strokeDasharray = '1';
    route.style.strokeDashoffset = '1';
    gsap.to(route, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '[data-route]',
        start: 'top 72%',
        end: 'bottom 68%',
        scrub: true,
      },
    });
  }

  await document.fonts?.ready;
  ScrollTrigger.refresh();
}

initMotion().catch(() => {
  html.classList.remove('js');
});

/* ------------------------------------------------------------
   Page progress (articles)
   ------------------------------------------------------------ */

const progress = document.querySelector<HTMLElement>('[data-progress]');

function updateProgress() {
  if (!progress) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  progress.style.transform = `scaleX(${ratio})`;
}

if (progress) {
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

/* ------------------------------------------------------------
   In-page anchors, with header offset
   ------------------------------------------------------------ */

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    event.preventDefault();
    const offset = window.innerWidth < 720 ? 82 : 104;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    if (lenis) {
      lenis.scrollTo(top, { duration: 1.1 });
    } else {
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    history.replaceState(null, '', href);
  });
});

/* ------------------------------------------------------------
   Mailto forms
   ------------------------------------------------------------ */

document.querySelectorAll<HTMLFormElement>('[data-mailto-form]').forEach((form) => {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const email = form.dataset.email || '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const lines: string[] = [];

    data.forEach((value, key) => {
      const text = String(value).trim();
      if (!text) return;
      const label =
        form.querySelector(`[name="${key}"]`)?.closest('.field')?.querySelector('label')?.textContent ||
        key;
      lines.push(`${label.trim()} : ${text}`);
    });

    const name = String(data.get('name') || 'Nouvelle demande');
    const subjectPrefix = form.dataset.subject || 'Demande de devis';
    const subject = `${subjectPrefix} · ${name}`;
    const body = [
      'Bonjour,',
      '',
      'Je souhaite vous présenter la demande suivante :',
      '',
      ...lines,
      '',
      'Merci de me revenir avec une proposition.',
    ].join('\n');

    if (status) {
      status.hidden = false;
      status.textContent =
        "Votre logiciel de messagerie va s'ouvrir avec la demande pré-remplie. Si rien ne se passe, écrivez-nous directement à l'adresse indiquée.";
    }

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});

/* ------------------------------------------------------------
   Refresh after assets
   ------------------------------------------------------------ */

window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
