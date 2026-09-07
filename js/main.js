const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

function setMenuState(isOpen) {
  navLinks.classList.toggle('is-open', isOpen);
  navToggle.classList.toggle('is-open', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
  navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('nav-open', isOpen);
}

navToggle.addEventListener('click', function () {
  setMenuState(!navLinks.classList.contains('is-open'));
});

navLinks.addEventListener('click', function (event) {
  if (event.target.closest('.nav-link')) {
    setMenuState(false);
  }
});

window.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && navLinks.classList.contains('is-open')) {
    setMenuState(false);
    navToggle.focus();
  }
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
