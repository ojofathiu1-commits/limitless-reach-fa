const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const desktopNavigation = window.matchMedia('(min-width: 1025px)');
const menuBackground = new Set();

function setMenuBackground(isOpen) {
  if (isOpen) {
    // Keep the announcement and header usable while the page underneath is covered.
    Array.from(document.body.children).forEach(function (element) {
      if (!element.matches('.site-header, .announcement-bar, .nav-backdrop, script, style, link') && !element.inert) {
        element.inert = true;
        menuBackground.add(element);
      }
    });
  } else {
    menuBackground.forEach(function (element) { element.inert = false; });
    menuBackground.clear();
  }
}

function setMenuState(isOpen) {
  if (!navToggle || !navLinks) {
    return;
  }

  isOpen = isOpen && !desktopNavigation.matches;

  // Move focus before hiding the mobile links from keyboard and screen-reader users.
  if (!isOpen && !desktopNavigation.matches && navLinks.contains(document.activeElement)) {
    navToggle.focus({ preventScroll: true });
  }

  navLinks.inert = !desktopNavigation.matches && !isOpen;
  if (navLinks.inert) {
    navLinks.setAttribute('aria-hidden', 'true');
  } else {
    navLinks.removeAttribute('aria-hidden');
  }

  navLinks.classList.toggle('is-open', isOpen);
  navToggle.classList.toggle('is-open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('nav-open', isOpen);
  setMenuBackground(isOpen);
}

if (navToggle && navLinks) {
  const navBackdrop = document.createElement('div');
  navBackdrop.className = 'nav-backdrop';
  navBackdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(navBackdrop);
  navLinks.setAttribute('aria-label', 'Main navigation');
  setMenuState(false);

  navToggle.addEventListener('click', function (event) {
    const isOpen = !navLinks.classList.contains('is-open');
    setMenuState(isOpen);
    if (isOpen) {
      navLinks.scrollTop = 0;
      if (event.detail === 0) {
        navLinks.querySelector('a').focus({ preventScroll: true });
      }
    }
  });

  navLinks.addEventListener('click', function (event) {
    if (event.target.closest('a')) {
      setMenuState(false);
    }
  });

  document.addEventListener('click', function (event) {
    if (
      navLinks.classList.contains('is-open') &&
      !navLinks.contains(event.target) &&
      !navToggle.contains(event.target)
    ) {
      setMenuState(false);
    }
  });

  window.addEventListener('keydown', function (event) {
    if (!navLinks.classList.contains('is-open')) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuState(false);
      navToggle.focus({ preventScroll: true });
    }

    if (event.key === 'Tab') {
      const controls = Array.from(document.querySelectorAll(
        '.announcement-bar a[href], .site-header a[href], .site-header button:not(:disabled)'
      )).filter(function (element) { return element.getClientRects().length > 0; });
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];

      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    }
  });

  desktopNavigation.addEventListener('change', function () {
    const toggleHadFocus = document.activeElement === navToggle;
    setMenuState(false);
    if (desktopNavigation.matches && toggleHadFocus) {
      navLinks.querySelector('a').focus({ preventScroll: true });
    }
  });

  // A page restored with the browser's Back button must not retain a locked menu.
  window.addEventListener('pageshow', function () { setMenuState(false); });
}

const sponsorTracks = document.querySelectorAll('.sponsors-track');

sponsorTracks.forEach(function (track) {
  function resumeSponsorScroll() {
    track.classList.remove('is-interacting');
  }

  track.addEventListener('pointerdown', function (event) {
    // On touch devices, pause only while the visitor is pressing a sponsor
    // card. This avoids the sticky :hover state that can freeze a marquee.
    if (event.pointerType !== 'mouse') {
      track.classList.add('is-interacting');
    }
  });

  track.addEventListener('pointercancel', resumeSponsorScroll);
  window.addEventListener('pointerup', resumeSponsorScroll, { passive: true });
});

const mobileFieldSelector = '.form-input, .form-select, .form-textarea, .field-input, .field-select';
let focusedMobileField = null;

function keepFocusedFieldVisible() {
  if (!focusedMobileField || !window.matchMedia('(max-width: 480px)').matches) {
    return;
  }

  const fieldBounds = focusedMobileField.getBoundingClientRect();
  const headerBounds = document.querySelector('.site-header').getBoundingClientRect();
  const visibleHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const safeTop = Math.max(headerBounds.bottom, 0) + 16;
  const safeBottom = visibleHeight - 24;
  let adjustment = 0;

  if (fieldBounds.bottom > safeBottom) {
    adjustment = fieldBounds.bottom - safeBottom;
  } else if (fieldBounds.top < safeTop) {
    adjustment = fieldBounds.top - safeTop;
  }

  if (adjustment !== 0) {
    window.scrollBy({ top: adjustment, left: 0, behavior: 'auto' });
  }
}

document.addEventListener('focusin', function (event) {
  if (!event.target.matches(mobileFieldSelector)) {
    return;
  }

  focusedMobileField = event.target;
  window.setTimeout(keepFocusedFieldVisible, 280);
});

document.addEventListener('focusout', function (event) {
  if (event.target !== focusedMobileField) {
    return;
  }

  window.setTimeout(function () {
    if (document.activeElement !== focusedMobileField) {
      focusedMobileField = null;
    }
  });
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', function () {
    window.requestAnimationFrame(function () {
      window.setTimeout(keepFocusedFieldVisible, 80);
    });
  });
}

const announcementBar = document.querySelector('.announcement-bar');

if (announcementBar) {
  function updateAnnouncementOffset() {
    document.body.style.setProperty('--announce-offset', announcementBar.offsetHeight + 'px');
  }

  updateAnnouncementOffset();
  window.addEventListener('resize', updateAnnouncementOffset);
  window.addEventListener('load', updateAnnouncementOffset);

  if ('ResizeObserver' in window) {
    new ResizeObserver(updateAnnouncementOffset).observe(announcementBar);
  }
}

const programmesGrid = document.querySelector('.programmes-grid');
const programmesPrev = document.querySelector('.programmes-arrow--prev');
const programmesNext = document.querySelector('.programmes-arrow--next');

if (programmesGrid && programmesPrev && programmesNext) {
  function programmesStep() {
    const card = programmesGrid.querySelector('.programme-card');
    const gap = parseFloat(window.getComputedStyle(programmesGrid).columnGap) || 0;
    return card ? card.offsetWidth + gap : programmesGrid.clientWidth;
  }

  function updateProgrammesArrows() {
    const maxScroll = programmesGrid.scrollWidth - programmesGrid.clientWidth;
    programmesPrev.disabled = programmesGrid.scrollLeft <= 1;
    programmesNext.disabled = programmesGrid.scrollLeft >= maxScroll - 1;
  }

  programmesPrev.addEventListener('click', function () {
    programmesGrid.scrollBy({ left: -programmesStep(), behavior: 'smooth' });
  });

  programmesNext.addEventListener('click', function () {
    programmesGrid.scrollBy({ left: programmesStep(), behavior: 'smooth' });
  });

  programmesGrid.addEventListener('scroll', updateProgrammesArrows, { passive: true });
  window.addEventListener('resize', updateProgrammesArrows);
  updateProgrammesArrows();
}

const partnerTabs = document.querySelectorAll('.partners-tab');

partnerTabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    partnerTabs.forEach(function (other) {
      const isActive = other === tab;
      const panel = document.getElementById(other.getAttribute('aria-controls'));

      other.classList.toggle('is-active', isActive);
      other.setAttribute('aria-selected', String(isActive));
      other.setAttribute('tabindex', isActive ? '0' : '-1');

      if (panel) {
        panel.hidden = !isActive;
      }
    });
  });

  tab.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    const tabs = Array.prototype.slice.call(partnerTabs);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });
});

const partnerDialog = document.getElementById('partner-dialog');
const partnerSlots = document.querySelectorAll('.partner-slot');

if (partnerDialog && partnerSlots.length) {
  const dialogEyebrow = partnerDialog.querySelector('.partner-dialog-eyebrow');
  const dialogTitle = partnerDialog.querySelector('.partner-dialog-title');
  const dialogTag = partnerDialog.querySelector('.partner-dialog-tag');
  const dialogText = partnerDialog.querySelector('.partner-dialog-text');
  const dialogLink = partnerDialog.querySelector('.partner-dialog-link');
  const dialogLinkText = partnerDialog.querySelector('.partner-dialog-link-text');
  let openedFrom = null;

  function fillPartnerDialog(slot) {
    const category = slot.closest('.partner-category').dataset.category;
    const website = slot.dataset.website;

    dialogEyebrow.textContent = category + ' partner';
    dialogTitle.textContent = slot.querySelector('.partner-slot-name').textContent;
    dialogTag.textContent = slot.querySelector('.partner-slot-label').textContent;
    dialogText.textContent = slot.dataset.description;
    dialogLink.hidden = !website;

    if (website) {
      dialogLink.href = 'https://' + website;
      dialogLinkText.textContent = website;
    }
  }

  partnerSlots.forEach(function (slot) {
    slot.addEventListener('click', function () {
      openedFrom = slot;
      fillPartnerDialog(slot);
      partnerDialog.showModal();
    });
  });

  partnerDialog.addEventListener('click', function (event) {
    if (event.target === partnerDialog || event.target.closest('.partner-dialog-close')) {
      partnerDialog.close();
    }
  });

  partnerDialog.addEventListener('close', function () {
    if (openedFrom) {
      openedFrom.focus({ preventScroll: true });
    }
  });
}

const galleryFilters = document.querySelectorAll('.gallery-filter');
const galleryTiles = document.querySelectorAll('.gallery-tile');

galleryFilters.forEach(function (filter) {
  filter.addEventListener('click', function () {
    const category = filter.dataset.filter;

    galleryFilters.forEach(function (other) {
      const isActive = other === filter;

      other.classList.toggle('is-active', isActive);
      other.setAttribute('aria-pressed', String(isActive));
    });

    galleryTiles.forEach(function (tile) {
      tile.hidden = category !== 'all' && tile.dataset.category !== category;
    });
  });
});

const galleryDialog = document.getElementById('gallery-dialog');

if (galleryDialog && galleryTiles.length) {
  const galleryImage = galleryDialog.querySelector('.gallery-dialog-image');
  const galleryPlaceholder = galleryDialog.querySelector('.gallery-dialog-placeholder');
  const galleryCaption = galleryDialog.querySelector('.gallery-dialog-caption');
  const galleryCount = galleryDialog.querySelector('.gallery-dialog-count');
  const galleryPrev = galleryDialog.querySelector('.gallery-dialog-prev');
  const galleryNext = galleryDialog.querySelector('.gallery-dialog-next');
  let currentTile = null;

  function visibleGalleryTiles() {
    return Array.from(galleryTiles).filter(function (tile) {
      return !tile.hidden;
    });
  }

  function showGalleryTile(tile) {
    const tiles = visibleGalleryTiles();
    const label = tile.querySelector('.gallery-tile-label').textContent;
    const source = tile.dataset.src;

    currentTile = tile;
    galleryImage.hidden = !source;
    galleryPlaceholder.hidden = Boolean(source);

    if (source) {
      galleryImage.src = source;
      galleryImage.alt = tile.dataset.alt || label;
    }

    galleryCaption.textContent = tile.dataset.caption || label;
    galleryCount.textContent = tiles.indexOf(tile) + 1 + ' / ' + tiles.length;
    galleryPrev.disabled = tiles.length < 2;
    galleryNext.disabled = tiles.length < 2;
  }

  function stepGallery(direction) {
    const tiles = visibleGalleryTiles();
    const index = tiles.indexOf(currentTile);

    showGalleryTile(tiles[(index + direction + tiles.length) % tiles.length]);
  }

  galleryTiles.forEach(function (tile) {
    tile.querySelector('.gallery-tile-button').addEventListener('click', function () {
      showGalleryTile(tile);
      galleryDialog.showModal();
    });
  });

  galleryPrev.addEventListener('click', function () {
    stepGallery(-1);
  });

  galleryNext.addEventListener('click', function () {
    stepGallery(1);
  });

  galleryDialog.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') {
      stepGallery(-1);
    } else if (event.key === 'ArrowRight') {
      stepGallery(1);
    }
  });

  galleryDialog.addEventListener('click', function (event) {
    if (event.target === galleryDialog || event.target.closest('.gallery-dialog-close')) {
      galleryDialog.close();
    }
  });

  galleryDialog.addEventListener('close', function () {
    if (currentTile) {
      currentTile.querySelector('.gallery-tile-button').focus();
    }
  });
}
