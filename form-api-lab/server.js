/*
 * Local-only form API learning lab.
 *
 * This deliberately binds to 127.0.0.1 and captures emails in memory. It is
 * for learning the request/validation/response flow; it must not be deployed.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

if (process.env.NODE_ENV === 'production') {
  throw new Error('This training server is local-only and must not run in production.');
}

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 3);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const OUTBOX = [];
const REQUESTS_BY_IP = new Map();

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

function serveFile(response, filename, contentType) {
  fs.readFile(path.join(PUBLIC_DIR, filename), (error, content) => {
    if (error) {
      sendJson(response, 500, { message: 'Could not load the local learning page.' });
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    response.end(content);
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body-too-large'));
        request.destroy();
        return;
      }
      raw += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid-json'));
      }
    });
    request.on('error', reject);
  });
}

function text(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validateSubmission(payload) {
  const contactName = text(payload.contactName, 100);
  const workEmail = text(payload.workEmail, 255).toLowerCase();
  const storeBrand = text(payload.storeBrand, 150);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail);

  if (!contactName || !workEmail || !storeBrand || !isEmail) {
    return { error: 'Please supply a name, valid email address, and organisation.' };
  }

  return { value: { contactName, workEmail, storeBrand } };
}

function verifyLocalRecaptcha(token) {
  // This simulates only the *shape* of the reCAPTCHA step. A production API
  // must call Google's verification endpoint with a server-only secret.
  return token === 'local-test-token';
}

function isRateLimited(ipAddress) {
  const now = Date.now();
  const recentRequests = (REQUESTS_BY_IP.get(ipAddress) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= RATE_LIMIT_MAX) return true;

  recentRequests.push(now);
  REQUESTS_BY_IP.set(ipAddress, recentRequests);
  return false;
}

function sendLocalEmail(submission) {
  const email = {
    id: randomUUID(),
    to: 'your-email@example.com',
    subject: `New demo request from ${submission.storeBrand}`,
    text: [
      `Contact: ${submission.contactName}`,
      `Email: ${submission.workEmail}`,
      `Organisation: ${submission.storeBrand}`
    ].join('\n'),
    receivedAt: new Date().toISOString()
  };

  OUTBOX.unshift(email);
  return email;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'GET' && url.pathname === '/') {
    serveFile(response, 'index.html', 'text/html; charset=utf-8');
    return;
  }

  if (request.method === 'GET' && url.pathname === '/app.js') {
    serveFile(response, 'app.js', 'text/javascript; charset=utf-8');
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/test/outbox') {
    sendJson(response, 200, { emails: OUTBOX });
    return;
  }

  if (request.method !== 'POST' || url.pathname !== '/v1/demo-request') {
    sendJson(response, 404, { message: 'Route not found.' });
    return;
  }

  const ipAddress = request.socket.remoteAddress || 'unknown';
  if (isRateLimited(ipAddress)) {
    sendJson(response, 429, { message: 'Too many requests. Please try again later.' });
    return;
  }

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    const message = error.message === 'body-too-large'
      ? 'Request body is too large.'
      : 'Request body must be valid JSON.';
    sendJson(response, 400, { message });
    return;
  }

  const validation = validateSubmission(payload);
  if (validation.error) {
    sendJson(response, 400, { message: validation.error });
    return;
  }

  if (!verifyLocalRecaptcha(payload.recaptchaToken)) {
    sendJson(response, 403, { message: 'The local spam-check simulation failed.' });
    return;
  }

  const email = sendLocalEmail(validation.value);
  sendJson(response, 201, {
    message: 'Submission accepted. Open the local outbox below to see the simulated email.',
    submissionId: email.id
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Form API learning lab: http://${HOST}:${PORT}`);
  console.log(`Outbox inspector:       http://${HOST}:${PORT}/api/test/outbox`);
  console.log('Local simulation only — no real emails will be sent.');
});
