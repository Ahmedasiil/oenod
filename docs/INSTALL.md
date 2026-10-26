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
