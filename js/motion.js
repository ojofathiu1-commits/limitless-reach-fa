(() => {
  'use strict';

  if (!document.body.classList.contains('new-design')) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mouseInput = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const mobileCarousel = window.matchMedia('(max-width: 1024px)');
  const programmeCarousel = document.querySelector('.home-page .programmes-grid');
  const pending = new Set();
  const animations = new Map();
  let observer;

  function trackAnimation(element, animation) {
    animations.set(element, animation);
    animation.finished.then(() => animations.delete(element), () => animations.delete(element));
  }

  // The reference hero uses three masked, angled line reveals, not a section fade.
  const hero = document.querySelector('.home-page .hero');
  const heroHeading = hero && hero.querySelector('.hero-heading');
  const heroContent = hero && hero.querySelector('.hero-content');
  const heroLines = hero ? Array.from(hero.querySelectorAll('.hero-line-text')) : [];
  let heroFinished = false;
  let heroFrame;

  function finishHero() {
    heroFinished = true;
    if (heroHeading) heroHeading.classList.remove('hero-motion-pending');
    heroLines.forEach(line => {
      const animation = animations.get(line);
      if (animation) animation.cancel();
    });
  }

  function updateHeroScroll() {
    heroFrame = null;
    if (!heroContent) return;
    if (reducedMotion.matches || heroContent.contains(document.activeElement)) {
      heroContent.style.removeProperty('--hero-scroll-opacity');
      return;
    }
    const bounds = hero.getBoundingClientRect();
    const distance = Math.max(0, -bounds.top);
    const opacity = Math.max(0, 1 - distance / (bounds.height * 0.8));
    heroContent.style.setProperty('--hero-scroll-opacity', opacity.toFixed(3));
  }

  function queueHeroScroll() {
    if (!heroFrame) heroFrame = requestAnimationFrame(updateHeroScroll);
  }

  if (heroLines.length && !reducedMotion.matches && heroLines[0].animate) {
    heroHeading.classList.add('hero-motion-pending');
    // Begin with the actual display font; a slow or failed font must never hide the title indefinitely.
    const fontReady = document.fonts ? document.fonts.load('400 1em "Anton"') : Promise.resolve();
    let fontTimeout;
    Promise.race([
      fontReady.catch(() => {}),
      new Promise(resolve => { fontTimeout = setTimeout(resolve, 1200); })
    ]).then(() => {
      clearTimeout(fontTimeout);
      if (heroFinished || reducedMotion.matches || hero.getBoundingClientRect().bottom <= 0) {
        finishHero();
        return;
      }
      heroLines.forEach((line, index) => {
        trackAnimation(line, line.animate([
          { transform: 'translateY(110%) rotate(5deg)' },
          { transform: 'translateY(0) rotate(0deg)' }
        ], {
          duration: 900,
          delay: index * 120,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'backwards'
        }));
      });
      heroHeading.classList.remove('hero-motion-pending');
    });
  }

  if (heroContent) {
    window.addEventListener('scroll', queueHeroScroll, { passive: true });
    window.addEventListener('resize', queueHeroScroll);
    window.addEventListener('pageshow', event => {
      if (event.persisted) finishHero();
      queueHeroScroll();
    });
    heroContent.addEventListener('focusout', queueHeroScroll);
    updateHeroScroll();
  }

  function reveal(element, immediate = false) {
    pending.delete(element);
    if (observer) observer.unobserve(element);
    element.classList.remove('motion-pending');

    if (immediate || reducedMotion.matches || !element.animate) return;

    const opacity = getComputedStyle(element).opacity;
    const isCarousel = element === programmeCarousel;
    const animation = element.animate(
      isCarousel ? [{ opacity: 0 }, { opacity }] : [
        { opacity: 0, translate: '0 28px' },
        { opacity, translate: '0 0' }
      ],
      {
        duration: isCarousel ? 300 : 650,
        delay: Number(element.dataset.motionDelay || 0),
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'backwards'
      }
    );

    trackAnimation(element, animation);
  }

  const revealSelector = [
    '.intro-header > *', '.intro-card', '.intro-cta', '.programmes-bar', '.programme-card',
    '.sponsor-showcase-title', '.sponsor-panel', '.sponsor-showcase-cta',
    '.talent-row > *', '.purpose-header > *', '.purpose-card',
    '.roots-header > *', '.roots-col', '.standards-header > *', '.standard-card',
    '.safeguarding-header > *', '.safeguarding-item',
    '.programme-detail-card', '.programme-detail-cta',
    '.partners-tabs', '.partners-panel-head > *', '.partner-category-info', '.partner-slot',
    '.partners-cta-copy > *', '.partners-cta-link',
    '.news-card', '.news-note', '.keep-reading-header > *',
    '.sponsor-offerings-header > *', '.sponsor-offerings-cards > .sponsor-card',
    '.sponsor-contact-heading',
    '.careers-roles-header > *', '.careers-role-card', '.careers-perk',
    '.careers-apply-aside', '.careers-application-form',
    '.final-cta-inner > *',
    '.footer-v2-top', '.footer-v2-col', '.footer-v2-office', '.footer-v2-bottom'
  ].join(', ');

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

    const elements = Array.from(document.querySelectorAll(revealSelector)).filter(element =>
      !mobileCarousel.matches || !element.matches('.home-page .programme-card')
    );
    if (mobileCarousel.matches && programmeCarousel) elements.push(programmeCarousel);
    elements.forEach(element => {
      // An animated parent already reveals all of its content together.
      if (elements.some(parent => parent !== element && parent.contains(element))) return;
      const siblings = Array.from(element.parentElement.children).filter(sibling => elements.includes(sibling));
      element.dataset.motionDelay = element === programmeCarousel ? '0' : String(Math.min(siblings.indexOf(element), 3) * 100);
      element.classList.add('motion-pending');
      pending.add(element);
      observer.observe(element);
    });
  }

  let pointerFocusTime = -Infinity;
  document.addEventListener('pointerdown', event => { pointerFocusTime = event.timeStamp; }, { capture: true, passive: true });
  document.addEventListener('keydown', () => { pointerFocusTime = -Infinity; }, { capture: true });

  // Keyboard navigation must never land in content that is still fading in.
  document.addEventListener('focusin', event => {
    if (heroContent && heroContent.contains(event.target)) {
      finishHero();
      updateHeroScroll();
    }
    // Pointer focus must not snap a moving control between mouse-down and mouse-up.
    if (event.timeStamp - pointerFocusTime < 150) return;
    pending.forEach(element => {
      if (element.contains(event.target)) reveal(element, true);
    });
    animations.forEach((animation, element) => {
      if (element.contains(event.target)) animation.cancel();
    });
  });

  const tiltCards = document.querySelectorAll('.intro-card, .home-page .programme-card, .academy-page .roots-col');
  const resetters = [];
  const invalidateTiltBounds = [];

  tiltCards.forEach(card => {
    let frame;
    let bounds;
    let lastTime;
    let active = false;
    const current = { x: 0, y: 0, lift: 0 };
    const target = { x: 0, y: 0, lift: 0 };
    card.classList.add('motion-tilt');

    function reset() {
      cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      active = false;
      bounds = null;
      current.x = current.y = current.lift = 0;
      target.x = target.y = target.lift = 0;
      card.classList.remove('is-tilting');
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
      card.style.removeProperty('--tilt-lift');
    }

    function tick(time) {
      // Ease the card itself each frame rather than restarting a CSS transition on every mouse move.
      const amount = 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 40) / 65);
      lastTime = time;
      let moving = false;
      for (const axis of ['x', 'y', 'lift']) {
        current[axis] += (target[axis] - current[axis]) * amount;
        if (Math.abs(target[axis] - current[axis]) > 0.01) moving = true;
      }
      card.style.setProperty('--tilt-x', `${current.x.toFixed(3)}deg`);
      card.style.setProperty('--tilt-y', `${current.y.toFixed(3)}deg`);
      card.style.setProperty('--tilt-lift', `${current.lift.toFixed(3)}px`);

      if (moving) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = null;
        lastTime = null;
        if (!active) reset();
      }
    }

    function start() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function pointAt(event) {
      if (event.pointerType !== 'mouse') {
        reset();
        return;
      }
      if (!mouseInput.matches || reducedMotion.matches) return;
      if (mobileCarousel.matches && card.matches('.home-page .programme-card')) return;
      if (!bounds) {
        const rect = card.getBoundingClientRect();
        // Use the layout dimensions so the changing 3D outline cannot feed back into the tilt.
        bounds = {
          left: rect.left + (rect.width - card.offsetWidth) / 2 + scrollX,
          top: rect.top + (rect.height - card.offsetHeight) / 2 - current.lift + scrollY,
          width: card.offsetWidth,
          height: card.offsetHeight
        };
      }
      const x = Math.max(-1, Math.min(1, (event.clientX + scrollX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY + scrollY - bounds.top) / bounds.height * 2 - 1));
      target.x = -y * 5;
      target.y = x * 5;
      target.lift = -7;
      active = true;
      card.classList.add('is-tilting');
      start();
    }

    card.addEventListener('pointerenter', pointAt);
    card.addEventListener('pointermove', pointAt);
    card.addEventListener('pointerleave', () => {
      active = false;
      bounds = null;
      target.x = target.y = target.lift = 0;
      if (card.classList.contains('is-tilting')) start();
    });
    card.addEventListener('pointercancel', reset);
    resetters.push(reset);
    invalidateTiltBounds.push(() => { bounds = null; });
  });

  window.addEventListener('scroll', () => invalidateTiltBounds.forEach(invalidate => invalidate()), { passive: true, capture: true });
  window.addEventListener('resize', () => invalidateTiltBounds.forEach(invalidate => invalidate()));
  window.addEventListener('blur', () => resetters.forEach(reset => reset()));
  mouseInput.addEventListener('change', () => resetters.forEach(reset => reset()));
  mobileCarousel.addEventListener('change', () => {
    resetters.forEach(reset => reset());
    if (!mobileCarousel.matches) return;
    pending.forEach(element => {
      if (element.matches('.home-page .programme-card')) reveal(element, true);
    });
    animations.forEach((animation, element) => {
      if (element.matches('.home-page .programme-card')) animation.cancel();
    });
  });
  reducedMotion.addEventListener('change', () => {
    resetters.forEach(reset => reset());
    updateHeroScroll();
    if (!reducedMotion.matches) return;
    finishHero();
    pending.forEach(element => reveal(element, true));
    animations.forEach(animation => animation.cancel());
  });

  // Printing includes sections the reader has not scrolled to yet.
  window.addEventListener('beforeprint', () => {
    finishHero();
    resetters.forEach(reset => reset());
    pending.forEach(element => reveal(element, true));
    animations.forEach(animation => animation.cancel());
  });
})();
