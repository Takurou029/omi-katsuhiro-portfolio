/* =========================================================
   Lucca Leather — Main JavaScript
   ========================================================= */

(function () {
  'use strict';

  const announceBar   = document.getElementById('announceBar');
  const announceClose = document.getElementById('announceClose');
  const siteHeader    = document.getElementById('siteHeader');
  const navToggle     = document.getElementById('navToggle');
  const globalnav     = document.getElementById('globalnav');
  const floatShop     = document.getElementById('floatShop');
  const welcomeModal  = document.getElementById('welcomeModal');
  const modalClose    = document.getElementById('modalClose');
  const modalSkip     = document.getElementById('modalSkip');
  const contactForm   = document.getElementById('contactForm');

  /* ---------- Stacked fixed bars: announce + header ---------- */
  /* Both bars are position:fixed. Body gets padding-top to avoid
     content hidden beneath them. */

  var announceVisible = true;

  function getAnnounceHeight() {
    return (announceBar && announceVisible) ? announceBar.offsetHeight : 0;
  }

  function getHeaderHeight() {
    return siteHeader ? siteHeader.offsetHeight : 60;
  }

  function layoutFixedBars() {
    var ah = getAnnounceHeight();
    var hh = getHeaderHeight();
    if (siteHeader) siteHeader.style.top = ah + 'px';
    // Push main content below both fixed bars
    document.body.style.paddingTop = (ah + hh) + 'px';
  }

  if (announceClose && announceBar) {
    announceClose.addEventListener('click', function () {
      announceVisible = false;
      announceBar.style.display = 'none';
      layoutFixedBars();
    });
  }

  layoutFixedBars();
  window.addEventListener('resize', layoutFixedBars, { passive: true });

  /* ---------- Header scroll state & floating button ---------- */
  function onScroll() {
    if (!siteHeader) return;
    var ah = getAnnounceHeight();
    siteHeader.classList.toggle('scrolled', window.scrollY > ah + 40);

    if (floatShop) {
      floatShop.classList.toggle('visible', window.scrollY > window.innerHeight * 0.45);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  if (navToggle && globalnav) {
    navToggle.addEventListener('click', toggleNav);
    globalnav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && globalnav.classList.contains('open')) closeNav();
    });
  }

  function toggleNav() {
    var open = globalnav.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function closeNav() {
    if (!globalnav || !navToggle) return;
    globalnav.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        // Stagger cards/items that share the same parent grid
        var el     = entry.target;
        var parent = el.parentElement;
        var sibs   = Array.from(parent.querySelectorAll('.reveal:not(.visible)'));
        var idx    = sibs.indexOf(el);
        setTimeout(function () {
          el.classList.add('visible');
        }, Math.max(0, idx) * 75);

        revealObserver.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- Works category filter ---------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var workCards  = document.querySelectorAll('.work-card');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.dataset.filter;
      workCards.forEach(function (card) {
        card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter);
      });
    });
  });

  /* ---------- Smooth scroll for in-page anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var offset = getAnnounceHeight() + getHeaderHeight() + 12;
      var y = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      closeNav();
    });
  });

  /* ---------- Welcome modal ---------- */
  if (welcomeModal) {
    var modalEl = welcomeModal.querySelector('.modal');

    if (!sessionStorage.getItem('lucca-modal-seen')) {
      setTimeout(function () {
        welcomeModal.classList.add('open');
        if (modalEl) {
          modalEl.setAttribute('tabindex', '-1');
          modalEl.focus();
        }
      }, 2000);
    }

    function closeModal() {
      welcomeModal.classList.remove('open');
      sessionStorage.setItem('lucca-modal-seen', '1');
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalSkip)  modalSkip.addEventListener('click', closeModal);

    welcomeModal.addEventListener('click', function (e) {
      if (e.target === welcomeModal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && welcomeModal.classList.contains('open')) closeModal();
    });
  }

  /* ---------- Contact form demo ---------- */
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('contactSubmit');
      if (!btn || btn.disabled) return;

      var orig = btn.textContent;
      btn.textContent = '送信しました ✓';
      btn.style.background = '#4a7c59';
      btn.disabled = true;

      setTimeout(function () {
        btn.textContent = orig;
        btn.style.background = '';
        btn.disabled = false;
        contactForm.reset();
      }, 3500);
    });
  }

  /* ---------- Recalculate on font load (avoids height mismatch) ---------- */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layoutFixedBars);
  }

})();
