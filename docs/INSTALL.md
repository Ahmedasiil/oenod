# Installing OENOD

This guide takes you from the zip to a running platform on your own hosting.
It assumes you can run commands on a server or use a host like Vercel, Render, Railway or a VPS.

## What you need

- **Node.js 22** and **pnpm 10** (`corepack enable` turns pnpm on)
- **PostgreSQL 15 or newer** (Supabase, Neon, Amazon RDS, or your own)
- A domain, for example `oenod.com` for the website and app
- Accounts you connect later (all optional at first): Anthropic (AI), Stripe (payments),
  Resend (email), Twilio (SMS), Expo/Apple/Google (mobile), plus any integrations

Never paste secret keys into chats or emails. Put them in your hosting settings or in Super admin, Plugin centre.

## 1. Unzip and install

```bash
unzip oenod-v1.zip && cd oenod
corepack enable
pnpm install
```

## 2. Settings (environment variables)

Copy `apps/web/.env.example` to `apps/web/.env` (or add the same names in your host's settings) and fill in at least:

| Name | What to put |
| --- | --- |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `APP_URL` | Your public address, no trailing slash, e.g. `https://oenod.com` |
| `AUTH_SECRET` | A long random string: `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | Another long random string (encrypts saved keys and tokens). Keep a safe copy: if it is lost, saved keys can't be read |
| `CRON_SECRET` | Another random string, protects the background jobs |
| `SUPER_ADMIN_EMAIL` | Your email. This account becomes the super admin |

Everything else in `.env.example` is optional and explained there.
Most service keys (AI, Stripe, email, SMS, maps, sign-in with Google or Microsoft) can be added later
in **Super admin, Plugin centre**, where they are encrypted and can be tested with one click.

## 3. Create the database

```bash
pnpm db:migrate            # creates all tables
SEED_DEMO=false pnpm db:seed
```

The seed adds the plans, the platform switches, the welcome and re-engagement emails,
the 30 OENOD Academy courses and your super admin account. It prints a strong password for the
super admin if you did not set `SEED_ADMIN_PASSWORD`; save it in your password manager.
Leave out `SEED_DEMO=false` on a test server to get a realistic demo company to explore.

## 4. Build and start

```bash
pnpm build
pnpm start                 # serves on port 3000; put it behind HTTPS
```

On Vercel: import the repository, set the root directory to `apps/web`, add the settings, deploy.
On a VPS: run `pnpm start` with a process manager (pm2 or systemd) behind Nginx or Caddy with HTTPS.

If you are behind a proxy or CDN, set `CLIENT_IP_HEADER` (for example `cf-connecting-ip` on Cloudflare)
and `TRUSTED_PROXY_HOPS` so sign-in limits and IP allowlists see the real visitor address.

## 5. Background jobs

Call this every 5 minutes (reminders, monitors, fleet alerts, campaign automations, trial emails, webhooks retries):

```
GET https://YOUR-DOMAIN/api/cron/tick
Authorization: Bearer YOUR_CRON_SECRET
```

- Vercel: `apps/web/vercel.json` schedules it once a day so it deploys on the free plan. On Vercel Pro, change the schedule to `*/5 * * * *`; on the free plan, also add an outside scheduler such as cron-job.org for the 5-minute runs. Set `CRON_SECRET` either way (Vercel sends the header for its own cron).
- Linux: `*/5 * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-DOMAIN/api/cron/tick`

## 6. First sign-in

1. Go to `https://YOUR-DOMAIN/signin` and sign in as the super admin.
2. Turn on two-step sign-in (it is required for super admins in production).
3. Open **Super admin** (`/admin`):
   - **Plugin centre:** add Anthropic (AI), Stripe, Resend and Twilio, and press Test.
   - **Plans:** check prices.
   - **Controls:** maintenance switches for the website, web app, mobile, desktop and API.
4. In Stripe, add a webhook to `https://YOUR-DOMAIN/api/webhooks/stripe` and choose the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` and `invoice.payment_failed`, and save its signing secret in the Plugin centre.

## 7. Before you go live

- Have a lawyer review `/legal/privacy` and `/legal/terms` (they are templates with [placeholders]),
  then set `NEXT_PUBLIC_LEGAL_REVIEWED=1`.
- Set a map tile provider (`NEXT_PUBLIC_MAP_TILES`) if many people will use the live map.
- Marketing emails and SMS only go to people who agreed to receive them and always include an unsubscribe link.
  Keep it that way to stay within anti-spam laws (CASL in Canada, CAN-SPAM, GDPR).
- Back up the database daily and keep `ENCRYPTION_KEY` somewhere safe.

## 8. Mobile and desktop apps

- Mobile (App Store and Google Play): see `apps/mobile/README.md`.
- Desktop (Windows, Mac, Linux): see `apps/desktop/README.md`.
- After you publish, put the store and download links in the `NEXT_PUBLIC_*_URL` settings so the website's Download page links to them.

## Updating later

```bash
pnpm install
pnpm db:migrate
pnpm build && pnpm start
```

Use **Super admin, Controls** to show a maintenance screen during the update, with the time you expect to be back.

## oenodpay (personal money app)

oenodpay lives at `/pay` on the website and in the **Pay** tab of the mobile app. People can open a
personal account at `/signup?for=pay` without a company. Super admins get **Call center & support**,
**Pay overview** and **Compliance (AML)** in the admin menu.

### 1. Licences come first

Holding customer money and sending it abroad is regulated. Before real customers:

- **Canada:** register as a Money Services Business with FINTRAC, appoint a compliance officer and write
  your AML programme (oenodpay's reports, screening and record-keeping are built to support it).
- **United States:** register with FinCEN as an MSB and hold state money transmitter licences, or launch
  through a licensed partner (banking-as-a-service) whose licence covers you.
- **Cards:** Stripe Issuing is available to US businesses (and UK/EU). For Canadian cards, use a Canadian
  issuing partner; the card rules engine stays the same.
- **Markets:** prices are information only. Buying stocks or crypto needs a registered broker partner.

### 2. Sign up for the providers and paste the keys in Super admin, Plugin centre (group "oenodpay")

| Provider | What it does | Where to sign up | Keys |
| --- | --- | --- | --- |
| Stripe | Card top-ups, ID + selfie checks, cards | dashboard.stripe.com (turn on Identity and Issuing) | already under Stripe |
| Airwallex | Bank payouts in 150+ countries, live FX | airwallex.com, Developer, API keys | Client ID, API key, webhook secret |
| Thunes | Mobile wallets, InstaPay, cash pickup | thunes.com (sales contact) | API key, secret, callback secret |
| OpenSanctions | Sanctions and PEP screening | opensanctions.org/api | API key |
| Twelve Data | Live stocks, gold, currencies | twelvedata.com | API key |
| Airalo | Travel eSIMs | partners.airalo.com | Client ID, client secret |
| Twilio Voice | AI phone line | twilio.com (buy a phone number) | already under Twilio, plus Support phone |
| Anthropic | Money coach and support AI | console.anthropic.com | already under Claude AI |

Press **Test** on each one. Start with sandbox/demo environments, then switch `*_ENV` to `live`.

### 3. Webhooks

- **Stripe:** add these events to the existing webhook: `checkout.session.async_payment_succeeded`,
  `charge.dispute.created`, `identity.verification_session.verified`,
  `identity.verification_session.requires_input`, `identity.verification_session.canceled`,
  `issuing_authorization.request`, `issuing_authorization.updated`, `issuing_transaction.created`,
  `issuing_card.updated`. In Issuing settings, turn on real-time authorizations to the same URL.
- **Airwallex:** `https://YOUR-DOMAIN/api/webhooks/airwallex`, events `payout.transfer.*`.
- **Thunes:** callbacks are set automatically on each transfer.
- **Twilio:** set your support number's voice webhook to `https://YOUR-DOMAIN/api/voice/inbound` (POST).

### 4. Background jobs

`/api/cron/tick` must run every 5 minutes for transfer status, price alerts and weekly sanctions re-screening.
On Vercel this needs a Pro plan (change the schedule in `vercel.json` to `*/5 * * * *`); anywhere else use any
scheduler with `Authorization: Bearer $CRON_SECRET`.

### 5. Security defaults

- Money can't move without two-step sign-in, a verified identity and a 6-digit PIN (5 tries, then a 30-minute lock).
- New recipients, cards, and transfers over `PAY_STEP_UP_OVER_CENTS` need a fresh authenticator code.
- New devices are capped at `PAY_NEW_DEVICE_CAP_CENTS` per transfer for 24 hours.
- Every transfer is screened (sanctions, PEP, FATF countries, velocity, structuring). Risky ones wait in
  **Compliance** with the money held; approve sends it, reject refunds it.
- Account details are encrypted (AES-256-GCM with `ENCRYPTION_KEY`), and every action is in the audit log.
