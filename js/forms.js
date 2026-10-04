const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const SUPPORT_EMAIL = 'operations@limitlessreachfa.com';

const FORM_ENDPOINTS = [
  {
    selector: '.contact-form',
    formType: 'Contact enquiry',
    emailSource: 'contact-info',
    success: 'Thanks. Your message has reached us and we will reply within a few working days.'
  },
  {
    selector: '.register-main',
    formType: 'Trial registration',
    success: 'Registration received. The team will contact you with your trial date, time and venue.'
  },
  {
    selector: '.sponsor-enquiry-form',
    formType: 'Sponsorship enquiry',
    success: 'Thanks. We will reply within a few working days with a tailored proposal.'
  }
];

const TRIMMABLE_TYPES = ['text', 'email', 'tel', 'url', 'search'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function labelFor(field) {
  const group = field.closest('.field-group, .form-group, .consent-agree');
  const label = group
    ? group.querySelector('.field-label, .form-label, .consent-agree-label')
    : null;

  if (!label) {
    return '';
  }

  const text = label.textContent.replace(/\*/g, '').replace(/\s+/g, ' ').trim();

  return text.length > 80 ? text.slice(0, 77).trim() + '...' : text;
}

function invalidMessage(field) {
  const name = labelFor(field);

  if (field.validity.customError) {
    return field.validationMessage;
  }

  if (field.validity.typeMismatch) {
    return field.type === 'email'
      ? 'Please enter a valid email address.'
      : 'Please check the format of ' + (name || 'this field') + '.';
  }

  if (field.type === 'radio') {
    return name ? 'Please answer: ' + name : 'Please answer all required questions.';
  }

  return name ? 'Please complete: ' + name : 'Please complete all required fields.';
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

function normalisedName(value) {
  return value
    .toLocaleLowerCase()
    .replace(/[.'’`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    'guardian-relationship',
    'guardian-phone',
    'guardian-email'
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

  const playerName = normalisedName(valueFrom(form, 'player-name'));
  const guardianName = normalisedName(valueFrom(form, 'guardian-name'));
  const declarationName = normalisedName(valueFrom(form, 'declare-name'));
  const signature = normalisedName(valueFrom(form, 'declare-signature'));
  const declarationField = form.elements['declare-name'];
  const signatureField = form.elements['declare-signature'];
  const isMinor = playerIsUnder18(form, today);

  syncGuardianRequirements(form);
  const permittedNames = isMinor
    ? [guardianName].filter(Boolean)
    : [playerName, guardianName].filter(Boolean);
  const signerDescription = isMinor ? 'parent or guardian' : 'player or guardian';

  if (declarationField) {
    declarationField.setCustomValidity(
      declarationName && permittedNames.length && permittedNames.indexOf(declarationName) === -1
        ? 'Enter the ' + signerDescription + ' name supplied above.'
        : ''
    );
  }

  if (signatureField) {
    signatureField.setCustomValidity(
      signature && permittedNames.length && permittedNames.indexOf(signature) === -1
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

function firstInvalidField(form) {
  const fields = Array.prototype.slice.call(
    form.querySelectorAll('input, select, textarea')
  );

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (field.tagName === 'TEXTAREA' || TRIMMABLE_TYPES.indexOf(field.type) !== -1) {
      field.value = field.value.trim();
    }

    validateFieldValue(field);
  }

  validateTrialForm(form);

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (!field.checkValidity()) {
      return field;
    }
  }

  return null;
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

function wireSignaturePreview() {
  const signature = document.getElementById('declare-signature');
  const preview = document.getElementById('signature-preview');
  const previewValue = document.getElementById('signature-preview-value');

  if (!signature || !preview || !previewValue) {
    return;
  }

  const syncPreview = function () {
    const value = signature.value.trim();

    previewValue.textContent = value;
    preview.hidden = !value;
  };

  signature.addEventListener('input', syncPreview);
  syncPreview();
}

function addSubmissionContext(formData, form, config) {
  formData.set('form_type', config.formType);
  formData.set('page_url', window.location.href);
  formData.set('submitted_at', new Date().toISOString());

  // Web3Forms uses an `email` field as the notification reply-to address.
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
  if (status === 400) {
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

function wireForm(config) {
  const form = document.querySelector(config.selector);

  if (!form) {
    return;
  }

  form.setAttribute('novalidate', '');

  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton ? submitButton.innerHTML : '';
  let sending = false;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    const invalid = firstInvalidField(form);

    if (invalid) {
      setFormStatus(form, invalidMessage(invalid), 'error');
      invalid.focus();
      return;
    }

    sending = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    setFormStatus(form, 'Sending your request...', null);

    const formData = new FormData(form);
    addSubmissionContext(formData, form, config);

    fetch(form.action || WEB3FORMS_ENDPOINT, {
      method: form.method || 'POST',
      body: formData,
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!response.ok || !data.success) {
              throw Object.assign(new Error('request-failed'), {
                status: response.status,
                message: data.message || 'request-failed'
              });
            }

            return data;
          });
      })
      .then(function () {
        setFormStatus(form, config.success, 'success');
        form.reset();
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
          submitButton.innerHTML = submitLabel;
        }
      });
  });
}

wireDateDisplays();
wireGuardianRequirements();
wireSignaturePreview();
FORM_ENDPOINTS.forEach(wireForm);
