# Connected mode setup

Begin with test accounts. Demo mode does not require any credentials. The integrations below are implemented, but were not tested end-to-end with external provider credentials during project delivery.

## 1. Supabase identity

1. Create a Supabase project. Copy its project URL and public anon/publishable key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never use the service-role key in a `VITE_` variable.
2. In Authentication → Providers, enable **Google**, **Apple** and/or **Azure (Microsoft)** and enter each provider's client credentials. Configure the provider's callback URL exactly as Supabase shows it, usually `https://PROJECT.supabase.co/auth/v1/callback`.
3. In Authentication → URL configuration, set Site URL and allowed redirects. For development include `http://127.0.0.1:5173` and `http://localhost:5173`; for production add your exact HTTPS origin. Set `APP_URL` to the origin you actually use.
4. In each provider's developer console configure consent, application audience, authorized callback URLs and test users. Apple requires its developer configuration and ongoing secret rotation. Microsoft is passed the `email` scope; the server requires a verified email address.
5. Set `VITE_DEMO_MODE=false`. Restart both servers. Open the login dialog and complete the provider flow. First-time social sign-in also creates the Supabase account.

The API validates every access token with `supabase.auth.getUser`. User IDs and emails are taken from the verified identity, never from a request body. No Supabase database tables are required: Supabase is used only for identity.

## 2. Stripe: cards, Apple Pay, Google Pay and eligible local methods

1. Add a Stripe **test** secret key to `STRIPE_SECRET_KEY`.
2. Configure available payment methods in the Stripe dashboard. Checkout uses your account's dynamic payment methods. Wallets appear only when the browser/device/account is eligible.
3. Install the official Stripe CLI and authenticate. Forward test events to the Node server:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

4. Copy the printed `whsec_...` signing secret to `STRIPE_WEBHOOK_SECRET`, then restart the app.
5. Buy a pass through the app using Stripe's official test cards. Confirm the webhook is received and the pass appears in **My MOVE**. Replay an event and confirm credits do not duplicate.
6. On production, register `https://YOUR_DOMAIN/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and use that endpoint's signing secret.

The webhook requires the raw request body and verifies Stripe's signature. It checks payment status, amount, EUR currency and metadata before fulfillment. Visiting `?payment=success` cannot grant credits. Delayed payment methods are granted only after success. Prices in the browser cannot override server prices.

The app sells one-time class passes, not recurring Stripe subscriptions. Refunds, disputes, tax calculations and automatic pass revocation after refunds are outside this implementation.

## 3. PayPal

1. Create a sandbox REST app in PayPal Developer.
2. Set `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` using the sandbox merchant's credentials.
3. Sign into MOVE, select a pass, choose **PayPal**, and continue to PayPal. Use a sandbox buyer account separate from the merchant account.
4. After approval, PayPal returns to `APP_URL/?payment=paypal&token=ORDER_ID`. The app calls the authenticated capture endpoint.
5. Confirm the pass appears once; reloading the return URL must not create duplicate credits.

Orders are created on the server. The database binds each order to its user and pass. Capture verifies ownership, custom ID, currency, total and completed capture status. `PayPal-Request-Id` and purchase uniqueness support retries. Secrets never reach the browser.

**Recovery limit:** there is no PayPal webhook/reconciliation worker yet. If a buyer closes the return page or the app stops after capture but before local fulfillment, retry the same return URL after signing in; the server retrieves already completed orders before fulfillment. A real deployment should add verified capture webhooks, periodic reconciliation and an order-recovery screen. Do not treat this version as ready for unattended commercial payments.

## 4. Booking email with Resend

1. Create a Resend account and verify a sending domain.
2. Add `RESEND_API_KEY` and a sender such as `EMAIL_FROM=The MOVE Studio <bookings@your-domain.com>`.
3. Reserve a future class. Booking and email-outbox creation occur in one transaction.
4. The server checks the outbox every 30 seconds. It sends plain-text confirmation or cancellation messages, using an idempotency key per email. **My MOVE → Refresh** updates delivery status.
5. Check the Resend delivery logs and the recipient inbox. An accepted send is not proof of inbox delivery.

Failed requests remain pending for up to 20 attempts. The `outbox` table records attempts and status; a production system needs monitoring, dead-letter handling, bounce processing and an operator retry mechanism. Without email configuration, bookings remain valid but emails stay queued. Do not claim that a queued message was delivered.

## 5. Production setup

- Run Node 24+ behind HTTPS on the same machine as a reverse proxy; `npm start` binds to `127.0.0.1:3001`.
- Build with connected-mode public variables, then run with server secrets configured separately. `VITE_` values are bundled into JavaScript.
- Set `APP_URL` to the public origin. Add the same origin to Supabase redirects. Configure Stripe's production webhook signing secret.
- Use persistent storage for `.data/`, backups and a single app instance. SQLite transactions protect capacity in this configuration. Multi-instance deployment requires a shared transactional database and migrations.
- Review proxy/rate-limit configuration for your host. The app does not trust arbitrary forwarded headers.
- Replace sample schedules and teachers. The sample generator uses stable UTC slots displayed in Europe/Berlin, so local clock times change with daylight saving.
- Add real operator contact information, policies, email-delivery monitoring and payment recovery before commercial launch.

## HTTP API

| Method | Path                   | Authentication   | Purpose                               |
| ------ | ---------------------- | ---------------- | ------------------------------------- |
| GET    | `/api/health`          | None             | Health and mode                       |
| GET    | `/api/classes`         | None             | Schedule and available spots          |
| GET    | `/api/me`              | Bearer           | User's passes and reservations        |
| POST   | `/api/bookings`        | Bearer           | `{ "classId": "..." }`                |
| DELETE | `/api/bookings/:id`    | Bearer           | Cancel user's booking                 |
| POST   | `/api/checkout`        | Bearer           | `{ "planId": "flow" }` → Stripe URL   |
| POST   | `/api/paypal/orders`   | Bearer           | `{ "planId": "flow" }` → approval URL |
| POST   | `/api/paypal/capture`  | Bearer           | `{ "orderId": "..." }`                |
| POST   | `/api/webhooks/stripe` | Stripe signature | Verified payment fulfillment          |

`single`, `flow` and `rhythm` are the supported plan IDs. In demo mode the frontend uses its in-browser adapter and protected backend endpoints are disabled.
