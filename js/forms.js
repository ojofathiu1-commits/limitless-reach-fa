const FORMSPREE_FORM_ID = 'mjygkyrq';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/' + FORMSPREE_FORM_ID;
const RECAPTCHA_SITE_KEY = '6LfMncwsAAAAANskXc8qhix7-itJwvl47mOIAqeL';
const RECAPTCHA_ACTION = 'submit';
const RECAPTCHA_TIMEOUT_MS = 15000;
const SUPPORT_EMAIL = 'operations@limitlessreachfa.com';

const FORM_ENDPOINTS = [
  {
    selector: '.contact-form',
    formType: 'Contact enquiry',
    emailSource: 'contact-info',
    confirm: {
      name: 'name',
      reply: 'contact-info'
    }
  },
  {
    selector: '.register-main',
    formType: 'Trial registration',
    confirm: {
      name: 'declare-name',
      player: 'player-name',
      method: contactMethod,
      detail: contactDetail
    }
  },
  {
    selector: '.sponsor-enquiry-form',
    formType: 'Sponsorship enquiry',
    confirm: {
      name: 'contact-name',
      organisation: 'organisation',
      reply: 'email'
    }
  }
];

const TRIMMABLE_TYPES = ['text', 'email', 'tel', 'url', 'search'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const TOUCH_SCREEN = window.matchMedia('(pointer: coarse)');
const MAX_NAME_WORDS = 6;

function setFormStatus(form, message, state) {
  const toast = window.toast;

  if (toast) {
    if (state === 'error') {
      toast.error(message);
    } else if (state === 'success') {
      toast.success(message);
    } else {
      toast.info(message);
    }

    return;
  }

  const status = form.querySelector('.form-status');

  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = state ? 'form-status is-' + state : 'form-status';
  status.hidden = false;
}

function clearFormStatus(form) {
  const status = form.querySelector('.form-status');

  if (status) {
    status.hidden = true;
    status.textContent = '';
  }
}

function invalidMessage(field) {
  const validity = field.validity;

  if (validity.customError) {
    return field.validationMessage;
  }

  if (validity.valueMissing) {
    return field.type === 'radio' || field.tagName === 'SELECT'
      ? 'Please choose an option.'
      : 'Please fill in this field.';
  }

  if (validity.typeMismatch) {
    return field.type === 'email'
      ? 'Please enter a valid email address.'
      : 'Please check the format of this field.';
  }

  if (validity.patternMismatch && field.title) {
    return field.title;
  }

  return field.validationMessage || 'Please check this field.';
}

function isPhoneNumber(value) {
  const digits = value.replace(/\D/g, '');

  return /^[+\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

function validateFieldValue(field) {
  const value = field.value.trim();

  if (field.type === 'email') {
    field.setCustomValidity(
      value && !EMAIL_PATTERN.test(value) ? 'Please enter a valid email address.' : ''
    );
    return;
  }

  if (field.type === 'tel') {
    field.setCustomValidity(
      value && !isPhoneNumber(value) ? 'Please enter a valid phone number.' : ''
    );
    return;
  }

  if (field.name === 'contact-info') {
    field.setCustomValidity(
      value && !EMAIL_PATTERN.test(value) && !isPhoneNumber(value)
        ? 'Please enter a valid email address or phone number.'
        : ''
    );
  }
}

function valueFrom(form, name) {
  const field = form.elements[name];

  return field && typeof field.value === 'string' ? field.value.trim() : '';
}

function nameWords(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function hasNameWords(value) {
  return nameWords(value).length > 0;
}

function canBuildFrom(words, text, needed) {
  if (!text) {
    return needed <= 0;
  }

  return words.some(function (word, index) {
    if (!text.startsWith(word)) {
      return false;
    }

    const remaining = words.filter(function (other, position) {
      return position !== index;
    });

    return canBuildFrom(remaining, text.slice(word.length), needed - 1);
  });
}

function namesMatch(reference, candidate) {
  const referenceWords = nameWords(reference);
  const candidateWords = nameWords(candidate);
  const referenceText = referenceWords.join('');
  const candidateText = candidateWords.join('');

  if (!referenceText || !candidateText) {
    return false;
  }

  if (referenceText === candidateText) {
    return true;
  }

  const needed = Math.min(2, referenceWords.length);

  return (
    (referenceWords.length <= MAX_NAME_WORDS &&
      canBuildFrom(referenceWords, candidateText, needed)) ||
    (candidateWords.length <= MAX_NAME_WORDS &&
      canBuildFrom(candidateWords, referenceText, needed))
  );
}

function matchesAnyName(names, value) {
  return names.some(function (name) {
    return namesMatch(name, value);
  });
}

function dateFromIso(value) {
  const parts = value.split('-').map(Number);

  return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
}

function ageOnDate(date, today) {
  let age = today.getFullYear() - date.getFullYear();
  const birthdayStillAhead =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());

  return birthdayStillAhead ? age - 1 : age;
}

function playerIsUnder18(form, today) {
  const dob = form.elements.dob;
  const age = form.elements.age;
  const birthDate = dob && dob.value ? dateFromIso(dob.value) : null;

  if (birthDate && birthDate <= today) {
    return ageOnDate(birthDate, today) < 18;
  }

  return Boolean(age && age.value && Number(age.value) < 18);
}

function syncGuardianRequirements(form) {
  if (!form.matches('.register-main')) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isMinor = playerIsUnder18(form, today);
  const guardianFields = [
    'guardian-name',
    'guardian-relationship'
  ];

  guardianFields.forEach(function (id) {
    const field = form.elements[id];
    const marker = form.querySelector('[data-guardian-required-for="' + id + '"]');

    if (field) {
      field.required = isMinor;
      field.setAttribute('aria-required', String(isMinor));
    }

    if (marker) {
      marker.hidden = !isMinor;
    }
  });

  const note = form.querySelector('#guardian-requirement-note');

  if (note) {
    note.textContent = isMinor
      ? 'Required for players under 18.'
      : 'Optional for players aged 18 and over.';
  }
}

function wireGuardianRequirements() {
  const form = document.querySelector('.register-main');

  if (!form) {
    return;
  }

  const dateDisplay = document.getElementById('dob-display');
  const dob = form.elements.dob;
  const age = form.elements.age;

  [dateDisplay, dob, age].filter(Boolean).forEach(function (field) {
    field.addEventListener('input', function () {
      syncGuardianRequirements(form);
    });
    field.addEventListener('change', function () {
      syncGuardianRequirements(form);
    });
  });

  syncGuardianRequirements(form);
}

function selectedRadio(form, name) {
  return form.querySelector('input[name="' + name + '"]:checked');
}

function requireDetailsWhenYes(form, answerName, detailsName, message) {
  const details = form.elements[detailsName];
  const answer = selectedRadio(form, answerName);

  if (!details) {
    return;
  }

  details.setCustomValidity(
    answer && answer.value === 'yes' && !details.value.trim() ? message : ''
  );
}

function requireAffirmativeAnswer(form, name, message) {
  const controls = form.querySelectorAll('input[name="' + name + '"]');
  const answer = selectedRadio(form, name);

  controls.forEach(function (control) {
    control.setCustomValidity('');
  });

  if (answer && answer.value !== 'yes') {
    answer.setCustomValidity(message);
  }
}

function validateTrialForm(form) {
  if (!form.matches('.register-main')) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dob = form.elements.dob;
  const age = form.elements.age;
  const birthDate = dob && dob.value ? dateFromIso(dob.value) : null;

  if (dob) {
    dob.setCustomValidity(
      birthDate && birthDate > today ? 'Date of birth cannot be in the future.' : ''
    );
  }

  if (age) {
    const enteredAge = Number(age.value);
    age.setCustomValidity(
      birthDate && birthDate <= today && age.value && enteredAge !== ageOnDate(birthDate, today)
        ? 'Age must match the date of birth entered above.'
        : ''
    );
  }

  const declarationDate = form.elements['declare-date'];
  const signedDate = declarationDate && declarationDate.value
    ? dateFromIso(declarationDate.value)
    : null;

  if (declarationDate) {
    declarationDate.setCustomValidity(
      signedDate && signedDate > today ? 'Declaration date cannot be in the future.' : ''
    );
  }

  const playerName = valueFrom(form, 'player-name');
  const guardianName = valueFrom(form, 'guardian-name');
  const declarationName = valueFrom(form, 'declare-name');
  const signature = valueFrom(form, 'declare-signature');
  const declarationField = form.elements['declare-name'];
  const signatureField = form.elements['declare-signature'];
  const isMinor = playerIsUnder18(form, today);

  syncGuardianRequirements(form);
  const permittedNames = (isMinor ? [guardianName] : [playerName, guardianName]).filter(hasNameWords);
  const signerDescription = isMinor ? 'parent or guardian' : 'player or guardian';

  if (declarationField) {
    declarationField.setCustomValidity(
      declarationName && permittedNames.length && !matchesAnyName(permittedNames, declarationName)
        ? 'Enter the ' + signerDescription + ' name supplied above.'
        : ''
    );
  }

  if (signatureField) {
    signatureField.setCustomValidity(
      signature && permittedNames.length && !matchesAnyName(permittedNames, signature)
        ? 'Signature must match the ' + signerDescription + ' name supplied above.'
        : ''
    );
  }

  requireDetailsWhenYes(
    form,
    'medical-condition',
    'medical-details',
    'Please provide the relevant medical details.'
  );
  requireDetailsWhenYes(
    form,
    'medication',
    'medication-details',
    'Please provide the relevant medication details.'
  );
  requireAffirmativeAnswer(
    form,
    'consent-trial',
    'Trial Participation Consent must be accepted to register.'
  );
  requireAffirmativeAnswer(
    form,
    'consent-emergency',
    'Emergency Medical Consent must be accepted to register.'
  );
}

function prepareFields(form, trim) {
  form.querySelectorAll('input, select, textarea').forEach(function (field) {
    if (trim && (field.tagName === 'TEXTAREA' || TRIMMABLE_TYPES.indexOf(field.type) !== -1)) {
      field.value = field.value.trim();
    }

    validateFieldValue(field);
  });

  validateTrialForm(form);
}

function visibleControl(field) {
  return field.dataset.dateDisplay ? document.getElementById(field.dataset.dateDisplay) : field;
}

function errorAnchor(field) {
  return field.closest('.radio-pill-group, .date-field') || field;
}

function controlsWithin(anchor) {
  return anchor.matches('input, select, textarea')
    ? [anchor]
    : anchor.querySelectorAll('input, select, textarea');
}

function collectProblems(form) {
  const problems = [];
  const anchors = [];

  form.querySelectorAll('input, select, textarea').forEach(function (field) {
    if (field.checkValidity()) {
      return;
    }

    const anchor = errorAnchor(field);

    if (anchors.indexOf(anchor) !== -1) {
      return;
    }

    anchors.push(anchor);
    problems.push({
      anchor: anchor,
      control: visibleControl(field),
      message: invalidMessage(field)
    });
  });

  return problems;
}

function showFieldError(problem) {
  let error = problem.anchor.previousElementSibling;

  if (!error || !error.classList.contains('field-error')) {
    error = document.createElement('p');
    error.className = 'field-error';
    error.id = (problem.control.id || problem.control.name) + '-error';
    problem.anchor.insertAdjacentElement('beforebegin', error);
  }

  error.textContent = problem.message;

  controlsWithin(problem.anchor).forEach(function (control) {
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', error.id);
  });
}

function clearFieldError(error) {
  controlsWithin(error.nextElementSibling).forEach(function (control) {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
  });

  error.remove();
}

function renderFieldErrors(form, problems) {
  const anchors = problems.map(function (problem) {
    return problem.anchor;
  });

  form.querySelectorAll('.field-error').forEach(function (error) {
    if (anchors.indexOf(error.nextElementSibling) === -1) {
      clearFieldError(error);
    }
  });

  problems.forEach(showFieldError);
}

function refreshFieldErrors(form) {
  const shown = Array.from(form.querySelectorAll('.field-error')).map(function (error) {
    return error.nextElementSibling;
  });

  if (!shown.length) {
    return;
  }

  prepareFields(form, false);

  const problems = collectProblems(form).filter(function (problem) {
    return shown.indexOf(problem.anchor) !== -1;
  });

  renderFieldErrors(form, problems);
}

function focusProblem(problem) {
  const message = problem.anchor.previousElementSibling;
  const behavior = REDUCED_MOTION.matches ? 'auto' : 'smooth';

  if (TOUCH_SCREEN.matches) {
    document.activeElement.blur();
    message.setAttribute('tabindex', '-1');
    message.scrollIntoView({ behavior: behavior, block: 'start' });
    message.focus({ preventScroll: true });
    return;
  }

  message.scrollIntoView({ behavior: behavior, block: 'center' });
  problem.control.focus({ preventScroll: true });
}

function formatDateForDisplay(value) {
  const parts = value.split('-');

  return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : '';
}

function formatTypedDate(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return digits.slice(0, 2) + '/' + digits.slice(2);
  }

  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

function isoDateFromDisplay(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  if (!match) {
    return '';
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return isRealDate ? year + '-' + match[2] + '-' + match[1] : '';
}

function wireDateDisplays() {
  const dateFields = document.querySelectorAll('[data-date-display]');

  dateFields.forEach(function (dateField) {
    const display = document.getElementById(dateField.dataset.dateDisplay);

    if (!display) {
      return;
    }

    const syncDisplay = function () {
      display.value = formatDateForDisplay(dateField.value);
      display.setCustomValidity('');
    };

    const syncNativeValue = function () {
      display.value = formatTypedDate(display.value);

      const isoValue = isoDateFromDisplay(display.value);
      dateField.value = isoValue;
      display.setCustomValidity(
        display.value && !isoValue ? 'Please enter a valid date in DD/MM/YYYY format.' : ''
      );
    };

    display.addEventListener('input', syncNativeValue);
    dateField.addEventListener('input', syncDisplay);
    dateField.addEventListener('change', syncDisplay);

    if (dateField.value) {
      syncDisplay();
    } else {
      syncNativeValue();
    }
  });
}

function addSubmissionContext(formData, form, config) {
  formData.set('form_type', config.formType);
  formData.set('page_url', window.location.href);
  formData.set('submitted_at', new Date().toISOString());

  // Formspree uses an `email` field as the notification reply-to address.
  // The contact form accepts an email address or phone number in one field,
  // so add an email reply-to only when the visitor supplied an email address.
  if (config.emailSource) {
    const emailValue = form.elements[config.emailSource].value.trim();

    if (EMAIL_PATTERN.test(emailValue)) {
      formData.set('email', emailValue);
    }
  }
}

function messageForStatus(status) {
  if (status === 400 || status === 422) {
    return 'Please check your details and try again.';
  }

  if (status === 429) {
    return 'Too many requests. Please try again later.';
  }

  if (status >= 500) {
    return "We couldn't send your request. Please email " + SUPPORT_EMAIL + ' directly.';
  }

  return 'Something went wrong. Please try again or email ' + SUPPORT_EMAIL + '.';
}

function contactMethod(form) {
  const method = selectedRadio(form, 'contact-method');
  const phrases = { phone: 'phone call on', whatsapp: 'WhatsApp on', email: 'email at' };

  return method ? phrases[method.value] : '';
}

function contactDetail(form) {
  const method = selectedRadio(form, 'contact-method');

  return valueFrom(form, method && method.value === 'email' ? 'email' : 'phone');
}

function fillConfirmation(form, panel, answers) {
  panel.querySelectorAll('[data-confirm]').forEach(function (slot) {
    const source = answers[slot.dataset.confirm];

    slot.textContent = typeof source === 'function' ? source(form) : valueFrom(form, source);
  });
}

function showConfirmation(form, config) {
  const panel = form.querySelector('.form-confirmation');

  fillConfirmation(form, panel, config.confirm);
  clearFormStatus(form);

  form.reset();
  syncGuardianRequirements(form);
  form.classList.add('form-is-complete');

  form.scrollIntoView({
    behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth',
    block: 'start'
  });
  panel.focus({ preventScroll: true });
}

function wireConfirmationReset(form) {
  const button = form.querySelector('[data-confirm-reset]');

  if (!button) {
    return;
  }

  button.addEventListener('click', function () {
    form.classList.remove('form-is-complete');

    const firstField = form.querySelector('.field-input, .form-input, .form-select');

    if (firstField) {
      firstField.focus();
    }
  });
}

let recaptchaLoading = null;

function loadRecaptcha() {
  if (!RECAPTCHA_SITE_KEY) {
    return Promise.resolve();
  }

  if (recaptchaLoading) {
    return recaptchaLoading;
  }

  recaptchaLoading = new Promise(function (resolve, reject) {
    const script = document.createElement('script');

    script.src = 'https://www.google.com/recaptcha/api.js?render=' + RECAPTCHA_SITE_KEY;
    script.async = true;

    script.onload = function () {
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(resolve);
        return;
      }

      recaptchaLoading = null;
      reject(new Error('recaptcha-unavailable'));
    };

    script.onerror = function () {
      recaptchaLoading = null;
      reject(new Error('recaptcha-unavailable'));
    };

    document.head.appendChild(script);
  });

  return recaptchaLoading;
}

function withTimeout(promise, milliseconds) {
  return Promise.race([
    promise,
    new Promise(function (resolve, reject) {
      setTimeout(function () {
        reject(new Error('timeout'));
      }, milliseconds);
    })
  ]);
}

function recaptchaToken() {
  if (!RECAPTCHA_SITE_KEY) {
    return Promise.resolve('');
  }

  return withTimeout(
    loadRecaptcha().then(function () {
      return window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: RECAPTCHA_ACTION });
    }),
    RECAPTCHA_TIMEOUT_MS
  ).catch(function () {
    throw Object.assign(new Error('recaptcha-unavailable'), { status: 503 });
  });
}

function wireForm(config) {
  const form = document.querySelector(config.selector);

  if (!form) {
    return;
  }

  form.setAttribute('novalidate', '');
  wireConfirmationReset(form);

  const submitButton = form.querySelector('button[type="submit"]');
  let sending = false;

  form.addEventListener('input', function () {
    refreshFieldErrors(form);
  });

  form.addEventListener('change', function () {
    refreshFieldErrors(form);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    clearFormStatus(form);
    prepareFields(form, true);

    const problems = collectProblems(form);

    renderFieldErrors(form, problems);

    if (problems.length) {
      focusProblem(problems[0]);
      return;
    }

    sending = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add('is-sending');
    }

    setFormStatus(form, 'Sending your request...', 'sending');

    const formData = new FormData(form);
    addSubmissionContext(formData, form, config);

    recaptchaToken()
      .then(function (token) {
        if (token) {
          formData.set('g-recaptcha-response', token);
        }

        return fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' }
        });
      })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!response.ok || !data.ok) {
              throw Object.assign(new Error('request-failed'), {
                status: response.status,
                message: data.error || 'request-failed'
              });
            }

            return data;
          });
      })
      .then(function () {
        showConfirmation(form, config);
      })
      .catch(function (error) {
        setFormStatus(
          form,
          error.status
            ? messageForStatus(error.status)
            : 'Network error. Please check your connection and try again.',
          'error'
        );
      })
      .finally(function () {
        sending = false;

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove('is-sending');
        }
      });
  });
}

wireDateDisplays();
wireGuardianRequirements();
FORM_ENDPOINTS.forEach(wireForm);
loadRecaptcha().catch(function () {});
