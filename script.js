// MENÙ A TENDINA
const menuBtn = document.getElementById('menuToggle');
const menu = document.getElementById('siteMenu');

if (menuBtn && menu) {
  const toggleMenu = () => {
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
  };

  menuBtn.addEventListener('click', toggleMenu);
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) toggleMenu();
  });
}

// HERO VIDEO REATTIVO
const heroVideo = document.getElementById('heroVideo');

if (heroVideo) {
  const playOverlay = document.getElementById('playOverlay');
  const audioToggle = document.getElementById('audioToggle');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentBucket = null;
  let resizeFrame = null;
  let userEnabledAudio = false;

  // enforce autoplay + loop for browsers that ignore markup attributes
  heroVideo.autoplay = true;
  heroVideo.loop = true;
  heroVideo.muted = true;
  heroVideo.playsInline = true;
  heroVideo.setAttribute('autoplay', '');
  heroVideo.setAttribute('loop', '');
  heroVideo.setAttribute('muted', '');
  heroVideo.setAttribute('playsinline', '');

  const attemptPlay = () => heroVideo.play()
    .then(() => { if (playOverlay) playOverlay.hidden = true; })
    .catch(() => { if (playOverlay) playOverlay.hidden = false; });

  const pickHeroSrc = () => {
    const w = window.innerWidth;
    if (w >= 1000) return heroVideo.dataset.srcLg;
    if (w >= 560) return heroVideo.dataset.srcMd;
    return heroVideo.dataset.srcSm;
  };

  const setHeroSource = (force = false) => {
    const src = pickHeroSrc();
    if (!src) return;
    const bucket = (src === heroVideo.dataset.srcLg) ? 'lg'
                 : (src === heroVideo.dataset.srcMd) ? 'md' : 'sm';
    const currentSrc = heroVideo.getAttribute('src');
    if (force || bucket !== currentBucket || currentSrc !== src) {
      const shouldResume = !heroVideo.paused && !heroVideo.ended;
      currentBucket = bucket;
      heroVideo.setAttribute('src', src);
      heroVideo.load();
      if (shouldResume && !prefersReducedMotion) {
        attemptPlay();
      }
    }
  };

  window.addEventListener('resize', () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => setHeroSource(false));
  });
  window.addEventListener('orientationchange', () => setHeroSource(false));

  heroVideo.addEventListener('canplay', () => {
    heroVideo.classList.add('is-ready');
    if (!prefersReducedMotion) attemptPlay();
  });

  heroVideo.addEventListener('loadeddata', () => {
    if (!prefersReducedMotion) attemptPlay();
  });

  if (playOverlay) {
    playOverlay.addEventListener('click', () => {
      attemptPlay();
    });
  }

  const updateAudioToggle = () => {
    if (!audioToggle) return;
    const unmuted = !heroVideo.muted && heroVideo.volume > 0;
    audioToggle.setAttribute('aria-pressed', String(unmuted));
    audioToggle.setAttribute('aria-label', unmuted ? 'Disattiva audio' : 'Attiva audio');
    audioToggle.dataset.state = unmuted ? 'unmuted' : 'muted';
    const icon = unmuted ? '🔊' : '🔇';
    audioToggle.querySelector('[aria-hidden]')?.replaceChildren(document.createTextNode(icon));
  };

  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      userEnabledAudio = !userEnabledAudio;
      heroVideo.muted = !userEnabledAudio;
      if (userEnabledAudio) {
        heroVideo.volume = 1;
        attemptPlay();
      }
      updateAudioToggle();
    });

    heroVideo.addEventListener('volumechange', updateAudioToggle);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      heroVideo.pause();
    } else if (!prefersReducedMotion) {
      attemptPlay();
    }
  });

  if (prefersReducedMotion) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
    if (playOverlay) playOverlay.hidden = false;
    if (audioToggle) audioToggle.hidden = true;
  }

  setHeroSource(true);
  if (!prefersReducedMotion) {
    attemptPlay();
  }

  updateAudioToggle();
}

// CAROSELLO
const rail = document.querySelector('[data-carousel]');
const prevBtn = document.querySelector('[data-prev]');
const nextBtn = document.querySelector('[data-next]');

if (rail && prevBtn && nextBtn) {
  const updateNavButtons = () => {
    const maxScroll = rail.scrollWidth - rail.clientWidth - 1;
    prevBtn.disabled = rail.scrollLeft <= 0;
    nextBtn.disabled = rail.scrollLeft >= maxScroll;
  };

  const scrollByAmount = (dir = 1) => {
    const amount = Math.max(240, Math.floor(rail.clientWidth * 0.8));
    rail.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  prevBtn.addEventListener('click', () => scrollByAmount(-1));
  nextBtn.addEventListener('click', () => scrollByAmount(1));
  rail.addEventListener('scroll', updateNavButtons);
  window.addEventListener('load', updateNavButtons);
  window.addEventListener('resize', updateNavButtons);

  // Drag to scroll
  let isDown = false;
  let startX = 0;
  let startScroll = 0;

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

  ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) => {
    rail.addEventListener(evt, () => {
      isDown = false;
      rail.style.cursor = '';
    });
  });
}

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

/* ===== STAFF MODAL ===== */
(function setupStaffModal(){
  const triggers = document.querySelectorAll('.staff-card__trigger[data-name]');
  const modal = document.getElementById('staffModal');
  if (!modal || triggers.length === 0) return;

  const nameEl = modal.querySelector('[data-staff-modal-name]');
  const roleEl = modal.querySelector('[data-staff-modal-role]');
  const descEl = modal.querySelector('[data-staff-modal-desc]');
  const photoEl = modal.querySelector('[data-staff-modal-photo]');
  const dismissEls = modal.querySelectorAll('[data-staff-dismiss]');
  const dialog = modal.querySelector('.staff-modal__dialog');
  const closeBtn = modal.querySelector('.staff-modal__close');
  const instaWrap = modal.querySelector('.staff-modal__actions');
  const instaLink = modal.querySelector('[data-staff-modal-instagram]');
  const mailLink = modal.querySelector('[data-staff-modal-mail]');
  const siteLink = modal.querySelector('[data-staff-modal-site]');
  let activeTrigger = null;
  let activeCard = null;

  if (!dialog || !nameEl || !roleEl || !descEl || !photoEl) return;

  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  };

  function normalizeHandle(handle = ''){
    const trimmed = String(handle).trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('@')) return trimmed;
    return `@${trimmed.replace(/^@+/, '')}`;
  }

  const spawnLucaParticles = () => {
    if (!dialog) return;
    const fragment = document.createDocumentFragment();
    const colors = ['#8ab8ff', '#ff9ce6', '#ffd06a', '#7af0ff'];
    for (let i = 0; i < 10; i += 1) {
      const span = document.createElement('span');
      span.className = 'luca-particle';
      const angle = (Math.PI * 2 * i) / 10;
      const radius = 90 + Math.random() * 60;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      span.style.setProperty('--dx', `${dx}px`);
      span.style.setProperty('--dy', `${dy}px`);
      span.style.setProperty('--delay', `${Math.random() * 120}ms`);
      span.style.setProperty('--color', colors[i % colors.length]);
      span.addEventListener('animationend', () => span.remove());
      fragment.appendChild(span);
    }
    requestAnimationFrame(() => {
      dialog.appendChild(fragment);
    });
  };

  const cleanupLucaParticles = () => {
    dialog.querySelectorAll('.luca-particle').forEach((node) => node.remove());
  };

  function openModal(trigger){
    activeTrigger = trigger;
    const { name, role, desc, photo, instagram, mail, site } = trigger.dataset;
    if (activeCard) activeCard.classList.remove('is-active');
    activeCard = trigger.closest('.staff-card');
    activeCard?.classList.add('is-active');

    nameEl.textContent = name || '';
    roleEl.textContent = role || '';
    descEl.textContent = desc || '';
    photoEl.src = photo || '';
    photoEl.alt = name ? `Ritratto di ${name}` : '';

    const isLuca = (name || '').toLowerCase() === 'luca marastoni';
    if (isLuca) {
      modal.classList.add('staff-modal--luca');
      dialog.classList.add('staff-modal__dialog--luca');
      spawnLucaParticles();
    } else {
      modal.classList.remove('staff-modal--luca');
      dialog.classList.remove('staff-modal__dialog--luca');
      cleanupLucaParticles();
    }

    if (instaWrap) {
      const displayName = name || 'membro dello staff';
      let visibleActions = 0;

      if (instaLink) {
        const handle = normalizeHandle(instagram || '');
        if (handle) {
          const slug = handle.slice(1);
          instaLink.href = `https://www.instagram.com/${slug}/`;
          instaLink.setAttribute('aria-label', `Apri Instagram di ${displayName}`);
          instaLink.hidden = false;
          visibleActions += 1;
        } else {
          instaLink.href = 'https://www.instagram.com/';
          instaLink.setAttribute('aria-label', `Instagram di ${displayName}`);
          instaLink.hidden = true;
        }
      }

      if (mailLink) {
        const email = (mail || '').trim();
        if (email) {
          const normalized = email.replace(/\s+/g, '');
          mailLink.href = `mailto:${normalized}`;
          mailLink.setAttribute('aria-label', `Scrivi una mail a ${displayName}`);
          mailLink.hidden = false;
          visibleActions += 1;
        } else {
          mailLink.hidden = true;
          mailLink.removeAttribute('href');
        }
      }

      if (siteLink) {
        const website = (site || '').trim();
        if (website) {
          siteLink.href = website;
          siteLink.setAttribute('aria-label', `Visita il sito di ${displayName}`);
          siteLink.hidden = false;
          visibleActions += 1;
        } else {
          siteLink.hidden = true;
          siteLink.removeAttribute('href');
        }
      }

      instaWrap.hidden = visibleActions === 0;
    }

    modal.hidden = false;
    document.body.classList.add('no-scroll');
    document.addEventListener('keydown', onKeydown);

    requestAnimationFrame(() => {
      try {
        closeBtn?.focus({ preventScroll: true });
      } catch {
        closeBtn?.focus();
      }
    });
  }

  function closeModal(){
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKeydown);
    modal.classList.remove('staff-modal--luca');
    dialog.classList.remove('staff-modal__dialog--luca');
    cleanupLucaParticles();
    if (activeCard) {
      activeCard.classList.remove('is-active');
      activeCard = null;
    }
    if (activeTrigger && typeof activeTrigger.focus === 'function') {
      activeTrigger.focus();
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openModal(trigger));
  });

  dismissEls.forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
})();

/* ===== ARTISTS GALLERY ===== */
(function setupArtistGalleries(){
  const modal = document.querySelector('[data-gallery-modal]');
  const triggers = document.querySelectorAll('[data-gallery]');
  if (!modal || triggers.length === 0) return;

  const panel = modal.querySelector('.gallery-modal__panel');
  const imageEl = modal.querySelector('[data-gallery-image]');
  const nameEl = modal.querySelector('[data-gallery-name]');
  const summaryEl = modal.querySelector('[data-gallery-summary]');
  const metaWrap = modal.querySelector('[data-gallery-meta]');
  const counterEl = modal.querySelector('[data-gallery-counter]');
  const prevBtn = modal.querySelector('[data-gallery-prev]');
  const nextBtn = modal.querySelector('[data-gallery-next]');
  const thumbsWrap = modal.querySelector('[data-gallery-thumbs]');
  const dismissEls = modal.querySelectorAll('[data-gallery-dismiss]');
  const closeBtn = modal.querySelector('.gallery-modal__close');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zoomLayer = modal.querySelector('[data-gallery-zoom]');
  const zoomImg = modal.querySelector('[data-gallery-zoom-image]');
  const zoomCaption = modal.querySelector('[data-gallery-zoom-caption]');
  const zoomDismissEls = modal.querySelectorAll('[data-gallery-zoom-dismiss]');

  if (!panel || !imageEl || !nameEl || !counterEl || !thumbsWrap) return;

  const galleryData = {
    cantanti: [
      {
        name: 'Ernesto Alemà',
        src: 'assets/people/cantanti/MICLAB-Ernesto Alemà .jpg',
        alt: 'Ritratto di Ernesto Alemà',
        details: [
          { label: 'Nome e Cognome', value: 'Ernesto Alemà' },
          { label: "Nome d'arte", value: 'Ernesto Alemà' },
          { label: 'Città', value: 'Roma' },
          { label: 'Band', value: 'Soloperisoci' },
          { label: 'Band IG', value: '@soloperisoci' }
        ],
        instagram: '@ernyboyle'
      },
      {
        name: 'Francesca Vezzali',
        src: 'assets/people/cantanti/MICLAB-Francesca.jpg',
        alt: 'Ritratto di Francesca',
        details: [
          { label: 'Nome e Cognome', value: 'Francesca Vezzali' },
          { label: "Nome d'arte", value: 'Francesca' },
          { label: 'Città', value: 'Verona' },
          { label: 'Band', value: 'Something Else' }
        ],
        instagram: '@francesca_vezzali'
      },
      {
        name: 'Sesto VI',
        src: 'assets/people/cantanti/MICLAB-Sesto.jpg',
        alt: 'Ritratto di Sesto',
        details: [
          { label: 'Nome e Cognome', value: 'Samuele Magagnini' },
          { label: "Nome d'arte", value: 'Sesto VI' }
        ],
        instagram: '@samuelesesto'
      },
      {
        name: 'Sole',
        src: 'assets/people/cantanti/MICLAB-Sole.jpg',
        alt: 'Ritratto di Sole',
        details: [
          { label: 'Nome e Cognome', value: 'Mariasole Benvenuto' },
          { label: "Nome d'arte", value: 'Sole' },
          { label: 'Città', value: 'Verona' }
        ],
        instagram: '@soundslikesole'
      }
    ],
    rapper: [
      {
        name: 'Blackmill',
        src: 'assets/people/rapper/MICLAB-Blackmill.jpg',
        alt: 'Ritratto di Blackmill',
        details: [
          { label: 'Nome e Cognome', value: 'Martin Elekwachi' },
          { label: "Nome d'arte", value: 'Blackmill' },
          { label: 'Città', value: 'Modena' }
        ],
        instagram: '@blackmillofficial'
      },
      {
        name: 'JoeJoe',
        src: 'assets/people/rapper/MICLAB-JoeJoe.jpg',
        alt: 'Ritratto di JoeJoe',
        details: [
          { label: 'Nome e Cognome', value: 'Joel Mateus' },
          { label: "Nome d'arte", value: 'JoeJoe' },
          { label: 'Città', value: 'Lecco' }
        ],
        instagram: '@joejoe8m'
      },
      {
        name: 'Numb',
        src: 'assets/people/rapper/MICLAB-Numb.jpg',
        alt: 'Ritratto di Numb',
        details: [
          { label: 'Nome e Cognome', value: 'Filippo Toffanin' },
          { label: "Nome d'arte", value: 'Numb' },
          { label: 'Città', value: 'Verona' }
        ],
        instagram: '@numb_real'
      },
      {
        name: 'Ozymandias',
        src: 'assets/people/rapper/MICLAB-Ozymandias.jpg',
        alt: 'Ritratto di Ozymandias',
        details: [
          { label: 'Nome e Cognome', value: 'Giovanni Fausto Meloni' },
          { label: "Nome d'arte", value: 'Ozymandias' },
          { label: 'Città', value: 'Roma' }
        ],
        instagram: '@ozymandias.official'
      }
    ],
    musicisti: [
      {
        name: 'Sbre',
        src: 'assets/people/musicisti/MICLAB-Sbre.jpg',
        alt: 'Ritratto di Sbre',
        details: [
          { label: 'Nome e Cognome', value: 'Luca Ghirlanda' },
          { label: "Nome d'arte", value: 'Sbre' },
          { label: 'Città', value: 'Verona' },
          { label: 'Band', value: 'The Foolz' }
        ],
        instagram: '@luca.ghirlanda'
      },
      {
        name: 'Simone Rodriquez',
        src: 'assets/people/musicisti/MICLAB-Simone Rodriquez.jpg',
        alt: 'Ritratto di Simone Rodriquez',
        details: [
          { label: 'Nome e Cognome', value: 'Simone Rodriquez' },
          { label: "Nome d'arte", value: 'Simone Rodriquez' },
          { label: 'Città', value: 'Napoli' }
        ],
        instagram: '@simone.gennaro.rodriquez'
      },
      {
        name: 'Spettrosereno',
        src: 'assets/people/musicisti/MICLAB-Spettrosereno.jpg',
        alt: 'Ritratto di Spettrosereno',
        details: [
          { label: 'Nome e Cognome', value: 'Riccardo Scaioli' },
          { label: "Nome d'arte", value: 'Spettrosereno' },
          { label: 'Città', value: 'Verona' },
          { label: 'Band', value: 'Inaria' }
        ],
        instagram: '@spettrosereno'
      },
      {
        name: 'Vamnto',
        src: 'assets/people/musicisti/MICLAB-Vamnto .jpg',
        alt: 'Ritratto di Vamnto',
        details: [
          { label: 'Nome e Cognome', value: 'Luca Manzini' },
          { label: "Nome d'arte", value: 'Vamnto' },
          { label: 'Città', value: 'Verona' },
          { label: 'Band', value: 'Seeds' }
        ],
        instagram: '@ukladimir_lincolini'
      }
    ],
    producer: [
      {
        name: 'Dave the Mojo',
        src: 'assets/people/producer/MICLAB-Dave.jpg',
        alt: 'Ritratto di Dave',
        details: [
          { label: 'Nome e Cognome', value: 'Davide Carli' },
          { label: "Nome d'arte", value: 'Dave the Mojo' },
          { label: 'Alias', value: 'The Mojomatic' },
          { label: 'Città', value: 'Verona' }
        ],
        instagram: '@dave_mojomatic'
      },
      {
        name: 'Drew',
        src: 'assets/people/producer/MICLAB-Drew.jpg',
        alt: 'Ritratto di Drew',
        details: [
          { label: 'Nome e Cognome', value: 'Andrea Vecchietti' },
          { label: "Nome d'arte", value: 'Drew' },
          { label: 'Città', value: 'Verona' }
        ],
        instagram: '@drewisdatyou'
      },
      {
        name: 'Pry',
        src: 'assets/people/producer/MICLAB-Pry.jpg',
        alt: 'Ritratto di Pry',
        details: [
          { label: 'Nome e Cognome', value: 'Thomas Prymus' },
          { label: "Nome d'arte", value: 'Pry' },
          { label: 'Città', value: 'Verona' }
        ],
        instagram: '@motionpry'
      },
      {
        name: 'Tokyo',
        src: 'assets/people/producer/MICLAB-Tokyo.jpg',
        alt: 'Ritratto di Tokyo',
        details: [
          { label: 'Nome e Cognome', value: 'Federico Accordini' },
          { label: "Nome d'arte", value: 'Tokyo' },
          { label: 'Città', value: 'Verona' }
        ],
        instagram: '@tokyello'
      }
    ]
  };

  const toSrc = (path) => encodeURI(path);

  let currentGroup = null;
  let currentIndex = 0;
  let lastTrigger = null;
  let closeTimeout = null;
  let transitionDirection = 0;
  let zoomActive = false;
  let zoomLastFocus = null;

  const deactivateTrigger = (btn) => {
    if (!btn) return;
    btn.classList.remove('is-active');
    btn.classList.remove('is-opening');
    btn.setAttribute('aria-expanded', 'false');
  };

  const slideClasses = ['slide-next', 'slide-prev'];

  const ensureHandle = (handle) => {
    if (!handle) return '';
    const trimmed = String(handle).trim();
    if (!trimmed) return '';
    const normalized = trimmed.startsWith('@') ? trimmed : `@${trimmed.replace(/^@+/, '')}`;
    return normalized.replace(/\s+/g, '');
  };

  const handleImageLoad = () => {
    imageEl.classList.remove('is-swapping');
    const directionToPlay = transitionDirection;
    transitionDirection = 0;
    if (prefersReducedMotion || directionToPlay === 0) return;
    imageEl.classList.remove(...slideClasses);
    void imageEl.offsetWidth;
    imageEl.classList.add(directionToPlay > 0 ? 'slide-next' : 'slide-prev');
  };

  imageEl.addEventListener('load', () => {
    requestAnimationFrame(handleImageLoad);
  });

  if (!prefersReducedMotion) {
    imageEl.addEventListener('animationend', (event) => {
      if (event.target !== imageEl) return;
      if (slideClasses.some(cls => imageEl.classList.contains(cls))) {
        imageEl.classList.remove(...slideClasses);
      }
    });
  }

  const onZoomKeydown = (event) => {
    if (!zoomActive) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeZoom();
    }
  };

  function openZoom(){
    if (!zoomLayer || !zoomImg) return;
    const src = imageEl.dataset.zoomSrc || imageEl.getAttribute('src');
    if (!src) return;

    zoomLastFocus = document.activeElement;
    zoomImg.src = src;
    zoomImg.alt = imageEl.dataset.zoomAlt || imageEl.alt || '';

    if (zoomCaption) {
      const nameText = nameEl.textContent || '';
      const summaryText = summaryEl && !summaryEl.hidden ? summaryEl.textContent.trim() : '';
      const captionText = summaryText ? `${nameText} — ${summaryText}`.trim() : nameText;
      zoomCaption.textContent = captionText;
      zoomCaption.hidden = captionText.length === 0;
    }

    zoomLayer.hidden = false;
    zoomActive = true;
    document.addEventListener('keydown', onZoomKeydown, true);

    const zoomCloseBtn = zoomLayer.querySelector('.gallery-zoom__close');
    requestAnimationFrame(() => {
      try {
        zoomCloseBtn?.focus({ preventScroll: true });
      } catch {
        zoomCloseBtn?.focus();
      }
    });
  }

  function closeZoom(silent = false){
    if (!zoomActive || !zoomLayer) return;
    zoomLayer.hidden = true;
    zoomActive = false;
    document.removeEventListener('keydown', onZoomKeydown, true);
    if (!silent && zoomLastFocus && typeof zoomLastFocus.focus === 'function') {
      try {
        zoomLastFocus.focus({ preventScroll: true });
      } catch {
        zoomLastFocus.focus();
      }
    }
    zoomLastFocus = null;
  }

  function getCurrentGallery(){
    return galleryData[currentGroup] || null;
  }

  function formatCounter(index, total){
    const digits = Math.max(2, String(total).length);
    return `${String(index + 1).padStart(digits, '0')} / ${String(total).padStart(digits, '0')}`;
  }

  function ensureActiveThumbInView(){
    const activeThumb = thumbsWrap.querySelector('.gallery-thumb.is-active');
    if (!activeThumb || typeof activeThumb.scrollIntoView !== 'function') return;
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';
    try {
      activeThumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior });
    } catch {
      activeThumb.scrollIntoView();
    }
  }

  function updateThumbHighlight(){
    const thumbs = thumbsWrap.querySelectorAll('.gallery-thumb');
    thumbs.forEach((thumb, idx) => {
      const isActive = idx === currentIndex;
      thumb.classList.toggle('is-active', isActive);
      thumb.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
    ensureActiveThumbInView();
  }

  function updateView(){
    const gallery = getCurrentGallery();
    if (!gallery || gallery.length === 0) return;
    const entry = gallery[currentIndex];
    if (!entry) return;

    const src = toSrc(entry.src);
    if (imageEl.getAttribute('src') !== src) {
      if (!prefersReducedMotion) imageEl.classList.add('is-swapping');
      imageEl.setAttribute('src', src);
    } else {
      imageEl.classList.remove('is-swapping');
    }

    imageEl.alt = entry.alt || entry.name;
    imageEl.dataset.zoomSrc = src;
    imageEl.dataset.zoomAlt = entry.alt || entry.name || '';
    nameEl.textContent = entry.name;

    if (summaryEl) {
      const summary = entry.summary || '';
      summaryEl.textContent = summary;
      summaryEl.hidden = summary.trim().length === 0;
    }

    if (metaWrap) {
      metaWrap.innerHTML = '';

      const rawDetails = Array.isArray(entry.details) ? entry.details : [];
      const detailsToDisplay = [];
      let firstName = '';
      let lastName = '';
      let bandInstagramHandle = '';

      rawDetails.forEach((detail) => {
        const originalLabel = (detail.label || '').trim();
        const normalizedLabel = originalLabel.toLowerCase();
        const value = String(detail.value ?? '').trim();
        if (!value) return;
        if (normalizedLabel === "nome d'arte") return;

        if (normalizedLabel.includes('band') && normalizedLabel.includes('ig')) {
          bandInstagramHandle = value;
          return;
        }

        if (normalizedLabel === 'nome') { firstName = value; return; }
        if (normalizedLabel === 'cognome') { lastName = value; return; }

        detailsToDisplay.push({ value, label: originalLabel, url: detail.url });
      });

      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (fullName) {
        detailsToDisplay.unshift({ value: fullName, label: 'Nome e cognome' });
      }

      const instaHandle = ensureHandle(entry.instagram);
      if (instaHandle) {
        detailsToDisplay.push({
          value: instaHandle,
          label: 'Instagram',
          url: `https://www.instagram.com/${instaHandle.replace(/^@/, '')}/`
        });
      }

      const normalizedBandHandle = ensureHandle(bandInstagramHandle);
      if (normalizedBandHandle) {
        detailsToDisplay.push({
          value: normalizedBandHandle,
          label: 'Band IG',
          url: `https://www.instagram.com/${normalizedBandHandle.replace(/^@/, '')}/`
        });
      }

      const cards = [];

      detailsToDisplay.forEach((detail) => {
        const rawValue = String(detail.value || '').trim();
        if (!rawValue) return;

        const trimmedLabel = (detail.label || '').trim();
        const labelText = trimmedLabel || 'Info';
        const looksLikeHandle = rawValue.startsWith('@')
          || trimmedLabel.toLowerCase().includes('instagram')
          || trimmedLabel.toLowerCase().includes('ig');
        const href = detail.url || (looksLikeHandle
          ? `https://www.instagram.com/${rawValue.replace(/^@/, '')}/`
          : '');

        const card = document.createElement('div');
        card.className = 'gallery-meta-card';

        const labelEl = document.createElement('span');
        labelEl.className = 'gallery-meta-card__label';
        labelEl.textContent = labelText.replace(/:+$/, '');
        card.append(labelEl);

        const valueEl = href ? document.createElement('a') : document.createElement('span');
        valueEl.className = 'gallery-meta-card__value';
        valueEl.textContent = rawValue;

        if (href) {
          valueEl.href = href;
          valueEl.target = '_blank';
          valueEl.rel = 'noopener noreferrer';
          valueEl.setAttribute('aria-label', `Apri ${labelText.toLowerCase()} di ${entry.name}`);
        }

        card.append(valueEl);
        cards.push(card);
      });

      if (cards.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'gallery-meta-grid';
        cards.forEach((card) => grid.append(card));
        metaWrap.append(grid);
        metaWrap.hidden = false;
      } else {
        metaWrap.hidden = true;
      }
    }
    counterEl.textContent = formatCounter(currentIndex, gallery.length);

    if (prevBtn) prevBtn.disabled = gallery.length <= 1;
    if (nextBtn) nextBtn.disabled = gallery.length <= 1;

    updateThumbHighlight();
  }

  function goTo(index){
    const gallery = getCurrentGallery();
    if (!gallery || gallery.length === 0) return;
    if (gallery.length === 1) {
      transitionDirection = 0;
      currentIndex = 0;
    } else {
      const total = gallery.length;
      const prevIndex = currentIndex;
      const normalized = ((index % total) + total) % total;
      currentIndex = normalized;

      if (normalized === prevIndex) {
        transitionDirection = 0;
      } else {
        const forward = (prevIndex + 1) % total;
        const backward = (prevIndex - 1 + total) % total;
        if (normalized === forward) {
          transitionDirection = 1;
        } else if (normalized === backward) {
          transitionDirection = -1;
        } else {
          transitionDirection = normalized > prevIndex ? 1 : -1;
        }
      }
    }
    updateView();
  }

  function renderThumbs(entries){
    thumbsWrap.innerHTML = '';
    const fragment = document.createDocumentFragment();

    entries.forEach((entry, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery-thumb';
      btn.setAttribute('aria-label', entry.name);

      const img = document.createElement('img');
      img.src = toSrc(entry.src);
      img.alt = `Anteprima di ${entry.name}`;

      btn.appendChild(img);
      btn.addEventListener('click', () => {
        goTo(index);
      });

      fragment.appendChild(btn);
    });

    thumbsWrap.appendChild(fragment);
    if (typeof thumbsWrap.scrollTo === 'function') {
      thumbsWrap.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      thumbsWrap.scrollTop = 0;
      thumbsWrap.scrollLeft = 0;
    }
    updateThumbHighlight();
  }

  function onKeydown(event){
    if (modal.hidden) return;
    if (zoomActive) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeGallery();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(currentIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(currentIndex - 1);
    }
  }

  function closeGallery(){
    if (modal.hidden || modal.classList.contains('is-closing')) return;

    if (zoomActive) closeZoom(true);

    modal.classList.remove('is-active');
    modal.classList.add('is-closing');
    document.body.classList.remove('no-scroll');
    window.removeEventListener('keydown', onKeydown);

    const triggerToFocus = lastTrigger;
    deactivateTrigger(triggerToFocus);

    const finalize = () => {
      modal.hidden = true;
      modal.classList.remove('is-closing');
      closeTimeout = null;
      lastTrigger = triggerToFocus || null;
      if (triggerToFocus && typeof triggerToFocus.focus === 'function') {
        try {
          triggerToFocus.focus({ preventScroll: true });
        } catch {
          triggerToFocus.focus();
        }
      }
    };

    if (!prefersReducedMotion) {
      const onTransitionEnd = (event) => {
        if (event.target !== modal && event.target !== panel) return;
        modal.removeEventListener('transitionend', onTransitionEnd);
        finalize();
      };
      modal.addEventListener('transitionend', onTransitionEnd);
      closeTimeout = window.setTimeout(() => {
        modal.removeEventListener('transitionend', onTransitionEnd);
        finalize();
      }, 320);
    } else {
      finalize();
    }
  }

  function openGallery(group, trigger){
    const gallery = galleryData[group];
    if (!gallery || gallery.length === 0) return;

    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }

    if (trigger && trigger !== lastTrigger) {
      deactivateTrigger(lastTrigger);
    }

    currentGroup = group;
    currentIndex = 0;
    transitionDirection = 0;
    lastTrigger = trigger || lastTrigger;

    if (panel) panel.scrollTop = 0;
    if (thumbsWrap) thumbsWrap.scrollLeft = 0;

    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('is-active');
      if (!prefersReducedMotion) {
        trigger.classList.add('is-opening');
        window.setTimeout(() => trigger.classList.remove('is-opening'), 520);
      } else {
        trigger.classList.remove('is-opening');
      }
    }

    renderThumbs(gallery);
    updateView();

    modal.hidden = false;
    modal.classList.remove('is-closing');
    document.body.classList.add('no-scroll');
    window.addEventListener('keydown', onKeydown);

    const activate = () => modal.classList.add('is-active');
    if (!prefersReducedMotion) {
      requestAnimationFrame(activate);
    } else {
      activate();
    }

    if (closeBtn && typeof closeBtn.focus === 'function') {
      try {
        closeBtn.focus({ preventScroll: true });
      } catch {
        closeBtn.focus();
      }
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openGallery(trigger.dataset.gallery, trigger));
  });

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

  dismissEls.forEach((el) => {
    el.addEventListener('click', closeGallery);
  });

  if (zoomLayer && zoomImg) {
    imageEl.addEventListener('click', () => {
      if (!zoomActive) openZoom();
    });

    zoomDismissEls.forEach((el) => {
      el.addEventListener('click', () => closeZoom());
    });

    zoomLayer.addEventListener('click', (event) => {
      if (event.target === zoomLayer) closeZoom();
    });
  }
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
