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

function firstInvalidField(form) {
  const fields = Array.prototype.slice.call(
    form.querySelectorAll('input, select, textarea')
  );

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (field.tagName === 'TEXTAREA' || TRIMMABLE_TYPES.indexOf(field.type) !== -1) {
      field.value = field.value.trim();
    }

    if (!field.checkValidity()) {
      return field;
    }
  }

  return null;
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

FORM_ENDPOINTS.forEach(wireForm);
