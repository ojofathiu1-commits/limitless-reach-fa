# Form API Learning Lab

This is a safe, dependency-free, local-only learning exercise. It reproduces the important parts of the QueueReceipts form flow without contacting its live API and without sending an actual email.

## Start it

Run this command from the project root:

```sh
node form-api-lab/server.js
```

Open `http://127.0.0.1:8787` in a browser. Submit the form, then inspect the simulated inbox on the same page.

## What to test

1. A valid submission returns `201`, shows a success message, and creates one entry in the local outbox.
2. An empty name or organisation is stopped in the browser before the API call.
3. An invalid email is stopped in the browser before the API call.
4. Send three valid requests; the fourth returns `429 Too Many Requests`. Stop and restart the server to reset the local test rate limit.
5. Change `recaptchaToken` in `public/app.js` to anything other than `local-test-token`; the API returns `403`. Change it back after the test.
6. Use browser DevTools → Network to inspect the JSON request, response, status, and timing.

## Why there is no real email or reCAPTCHA account

Those require credentials and a deployed domain. The lab models their place in the flow without putting private keys in source code. It deliberately refuses to start with `NODE_ENV=production` and binds only to `127.0.0.1`.

## What to request from the company for production

- A deployed API URL, plus separate staging and production URLs.
- An approved destination inbox or CRM and access to its email provider credentials.
- A reCAPTCHA v3 site key for the browser and secret key stored only in the API environment.
- The expected reCAPTCHA action, hostname, and score threshold.
- API field names, validation rules, success response, and error-status contract.
- Allowed website origins for CORS.
- Rate-limit rules, duplicate-submission policy, retention period, and who owns submitted data.
- Logging/alerting access and a staging test process.

## Production changes required

Do not deploy `server.js` as-is. Replace `verifyLocalRecaptcha` with real server-side verification, replace `sendLocalEmail` with an approved email or CRM integration, use persistent rate limiting, restrict CORS, and keep every secret in the host's environment settings.
