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

  focusedMobileField.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest'
  });
}

document.addEventListener('focusin', function (event) {
  if (!event.target.matches(mobileFieldSelector)) {
    return;
  }

  focusedMobileField = event.target;
  window.setTimeout(keepFocusedFieldVisible, 180);
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
    window.setTimeout(keepFocusedFieldVisible, 80);
  });
}
