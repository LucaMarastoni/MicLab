// MENÙ A TENDINA
const menuBtn = document.getElementById('menuToggle');
const menu = document.getElementById('siteMenu');

function toggleMenu() {
  const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
  menuBtn.setAttribute('aria-expanded', String(!isOpen));
  if (isOpen) {
    menu.classList.remove('open');
    setTimeout(() => { menu.hidden = true; }, 250);
  } else {
    menu.hidden = false;
    void menu.offsetHeight; // reflow
    menu.classList.add('open');
  }
}
menuBtn.addEventListener('click', toggleMenu);
menu.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMenu(); });

// HERO VIDEO REATTIVO
const heroVideo = document.getElementById('heroVideo');
const playOverlay = document.getElementById('playOverlay');

function pickHeroSrc() {
  const w = window.innerWidth;
  if (w >= 1000) return heroVideo.dataset.srcLg;
  if (w >= 560) return heroVideo.dataset.srcMd;
  return heroVideo.dataset.srcSm;
}

let currentBucket = null;
function setHeroSource() {
  const src = pickHeroSrc();
  const bucket = (src === heroVideo.dataset.srcLg) ? 'lg'
               : (src === heroVideo.dataset.srcMd) ? 'md' : 'sm';
  if (bucket !== currentBucket) {
    currentBucket = bucket;
    const wasPlaying = !heroVideo.paused;
    heroVideo.src = src;
    heroVideo.load();
    (wasPlaying ? heroVideo.play() : heroVideo.play()).then(() => {
      playOverlay.hidden = true;
    }).catch(() => {
      playOverlay.hidden = false;
    });
  }
}

let rAF = null;
window.addEventListener('resize', () => {
  if (rAF) cancelAnimationFrame(rAF);
  rAF = requestAnimationFrame(setHeroSource);
});
window.addEventListener('orientationchange', setHeroSource);

heroVideo.addEventListener('canplay', () => {
  heroVideo.classList.add('is-ready');
});

playOverlay.addEventListener('click', () => {
  heroVideo.play().then(() => { playOverlay.hidden = true; });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) heroVideo.pause();
  else heroVideo.play().catch(() => {});
});

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) {
  heroVideo.removeAttribute('autoplay');
  heroVideo.pause();
}

setHeroSource();

// CAROSELLO
const rail = document.querySelector('[data-carousel]');
const prevBtn = document.querySelector('[data-prev]');
const nextBtn = document.querySelector('[data-next]');

function updateNavButtons() {
  const maxScroll = rail.scrollWidth - rail.clientWidth - 1;
  prevBtn.disabled = rail.scrollLeft <= 0;
  nextBtn.disabled = rail.scrollLeft >= maxScroll;
}
function scrollByAmount(dir = 1) {
  const amount = Math.max(240, Math.floor(rail.clientWidth * 0.8));
  rail.scrollBy({ left: dir * amount, behavior: 'smooth' });
}
prevBtn.addEventListener('click', () => scrollByAmount(-1));
nextBtn.addEventListener('click', () => scrollByAmount(1));
rail.addEventListener('scroll', updateNavButtons);
window.addEventListener('load', updateNavButtons);
window.addEventListener('resize', updateNavButtons);

// Drag to scroll
let isDown = false, startX = 0, startScroll = 0;
rail.addEventListener('pointerdown', (e) => {
  isDown = true;
  rail.setPointerCapture(e.pointerId);
  startX = e.clientX;
  startScroll = rail.scrollLeft;
  rail.style.cursor = 'grabbing';
});
rail.addEventListener('pointermove', (e) => {
  if (!isDown) return;
  const dx = e.clientX - startX;
  rail.scrollLeft = startScroll - dx;
});
['pointerup','pointercancel','pointerleave'].forEach(evt => {
  rail.addEventListener(evt, () => { isDown = false; rail.style.cursor = ''; });
});

/* ===== REVEAL ON SCROLL + ROTATORE ===== */

// Entrata morbida on-scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Rotatore parola (about__rotator)
(function setupWordRotator(){
  const rot = document.querySelector('.about__rotator');
  if (!rot) return;

  // Rispetta reduced motion: non ruotare parole
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const words = (() => {
    try { return JSON.parse(rot.dataset.words || '[]'); }
    catch { return []; }
  })();

  if (reduced || words.length === 0) return;

  let i = 0;
  const base = rot.textContent.trim() || words[0];

  rot.textContent = base;

  const swap = () => {
    i = (i + 1) % words.length;
    // piccola transizione in/out
    rot.style.opacity = '0';
    rot.style.transform = 'translateY(4px)';
    setTimeout(() => {
      rot.textContent = words[i];
      rot.style.opacity = '1';
      rot.style.transform = 'translateY(0)';
    }, 180);
  };

  // cambia parola ogni ~2.4s
  const interval = setInterval(swap, 2400);

  // Se la scheda va in background, ferma/riavvia per risparmiare batteria
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(interval);
  }, { once: true });
})();

/* ===== PRIVACY POLICY MODAL ===== */
(function setupPrivacyModal(){
  const openBtn = document.getElementById('ppOpen');
  const dialog  = document.getElementById('ppDialog');
  const closeBtn= document.getElementById('ppClose');
  const backdrop= dialog?.querySelector('[data-close-modal]');
  let lastFocused = null;

  if (!openBtn || !dialog || !closeBtn || !backdrop) return;

  const getTabbables = () => [
    ...dialog.querySelectorAll(
      'a, button, input, textarea, select, details,[tabindex]:not([tabindex="-1"])'
    )
  ].filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

  function openModal(){
    lastFocused = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('no-scroll');
    // focus primo elemento utile
    const tabbables = getTabbables();
    (tabbables[0] || closeBtn).focus();
    // ARIA
    openBtn.setAttribute('aria-expanded', 'true');
    // chiudi su ESC
    document.addEventListener('keydown', onKeydown);
    // focus trap
    dialog.addEventListener('keydown', trapTab);
  }

  function closeModal(){
    dialog.hidden = true;
    document.body.classList.remove('no-scroll');
    openBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown);
    dialog.removeEventListener('keydown', trapTab);
    // torna al punto di partenza
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function onKeydown(e){
    if (e.key === 'Escape') closeModal();
  }

  function trapTab(e){
    if (e.key !== 'Tab') return;
    const tabbables = getTabbables();
    if (tabbables.length === 0) return;
    const first = tabbables[0];
    const last  = tabbables[tabbables.length - 1];

    if (e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
})();
