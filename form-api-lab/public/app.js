const form = document.querySelector('#demo-form');
const button = form.querySelector('button[type="submit"]');
const status = document.querySelector('#status');
const outbox = document.querySelector('#outbox');
const refreshButton = document.querySelector('#refresh-outbox');

function showStatus(message, kind) {
  status.textContent = message;
  status.className = kind || '';
}

async function refreshOutbox() {
  const response = await fetch('/api/test/outbox');
  const data = await response.json();
  outbox.textContent = data.emails.length
    ? JSON.stringify(data.emails, null, 2)
    : 'No requests yet.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  for (const field of form.querySelectorAll('input')) {
    field.value = field.value.trim();
    if (!field.checkValidity()) {
      showStatus(field.type === 'email' ? 'Enter a valid email address.' : 'Complete every field.', 'error');
      field.focus();
      return;
    }
  }

  button.disabled = true;
  showStatus('Sending request…');

  try {
    const response = await fetch('/v1/demo-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: form.elements.contactName.value,
        workEmail: form.elements.workEmail.value,
        storeBrand: form.elements.storeBrand.value,
        recaptchaToken: 'local-test-token'
      })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Request failed.');

    showStatus(data.message, 'success');
    form.reset();
    await refreshOutbox();
  } catch (error) {
    showStatus(error.message || 'Network error. Please retry.', 'error');
  } finally {
    button.disabled = false;
  }
});

refreshButton.addEventListener('click', refreshOutbox);
refreshOutbox();
