import { db } from "./db";
import { decrypt, encrypt } from "./crypto";

/** Platform plugins the super admin can switch on without touching the server. */
export interface PluginField { key: string; label: string; secret?: boolean; placeholder?: string; help?: string }
export interface PlatformPlugin { key: string; name: string; group: string; color: string; description: string; fields: PluginField[]; docs?: string; test?: boolean }

export const PLATFORM_PLUGINS: PlatformPlugin[] = [
  // Payments
  { key: "stripe", name: "Stripe", group: "Payments", color: "#635BFF", test: true, description: "Subscriptions, Academy sales, ad credits and invoice payments.", docs: "https://dashboard.stripe.com/apikeys", fields: [{ key: "STRIPE_SECRET_KEY", label: "Secret key", secret: true, placeholder: "sk_live_..." }, { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook signing secret", secret: true, placeholder: "whsec_...", help: "Webhook URL: {APP_URL}/api/webhooks/stripe" }, { key: "STRIPE_PUBLISHABLE_KEY", label: "Publishable key", placeholder: "pk_live_..." }] },
  { key: "paypal", name: "PayPal", group: "Payments", color: "#003087", description: "Offer PayPal at checkout.", fields: [{ key: "PAYPAL_CLIENT_ID", label: "Client ID" }, { key: "PAYPAL_CLIENT_SECRET", label: "Secret", secret: true }, { key: "PAYPAL_MODE", label: "Mode", placeholder: "live or sandbox" }] },
  { key: "moneris", name: "Moneris", group: "Payments", color: "#E31837", description: "Canadian card processing.", fields: [{ key: "MONERIS_STORE_ID", label: "Store ID" }, { key: "MONERIS_API_TOKEN", label: "API token", secret: true }] },
  { key: "square", name: "Square (platform)", group: "Payments", color: "#3E4348", description: "Square app for customers who connect Square.", fields: [{ key: "SQUARE_CLIENT_ID", label: "Application ID" }, { key: "SQUARE_CLIENT_SECRET", label: "Application secret", secret: true }] },
  // oenodpay
  { key: "airwallex", name: "Airwallex (bank payouts & FX)", group: "oenodpay", color: "#612FFF", test: true, description: "Sends money to bank accounts in 150+ countries and gives live exchange rates.", docs: "https://www.airwallex.com/app/account/apiKeys", fields: [{ key: "AIRWALLEX_CLIENT_ID", label: "Client ID" }, { key: "AIRWALLEX_API_KEY", label: "API key", secret: true }, { key: "AIRWALLEX_ENV", label: "Environment", placeholder: "live or demo" }, { key: "AIRWALLEX_WEBHOOK_SECRET", label: "Webhook secret", secret: true, help: "Webhook URL: {APP_URL}/api/webhooks/airwallex" }] },
  { key: "thunes", name: "Thunes (wallets, InstaPay, cash pickup)", group: "oenodpay", color: "#FF5A1F", test: true, description: "Pays into mobile wallets (Vodafone Cash, GCash, STC Pay...), InstaPay, cards and cash pickup worldwide.", docs: "https://docs.thunes.com", fields: [{ key: "THUNES_API_KEY", label: "API key" }, { key: "THUNES_API_SECRET", label: "API secret", secret: true }, { key: "THUNES_ENV", label: "Environment", placeholder: "live or pre" }, { key: "THUNES_CALLBACK_SECRET", label: "Callback secret", secret: true, help: "Any long random text. Keeps status callbacks private." }] },
  { key: "opensanctions", name: "OpenSanctions (AML screening)", group: "oenodpay", color: "#1F3A5F", test: true, description: "Screens customers and recipients against sanctions and PEP lists (UN, OFAC, Canada, EU, UK).", docs: "https://www.opensanctions.org/api/", fields: [{ key: "OPENSANCTIONS_API_KEY", label: "API key", secret: true }] },
  { key: "twelvedata", name: "Twelve Data (live markets)", group: "oenodpay", color: "#1D4ED8", test: true, description: "Live stocks, ETFs, gold and currency prices. Crypto prices work without a key.", docs: "https://twelvedata.com/account/api-keys", fields: [{ key: "TWELVEDATA_API_KEY", label: "API key", secret: true }, { key: "COINGECKO_API_KEY", label: "CoinGecko demo key (optional)", secret: true }] },
  { key: "airalo", name: "Airalo (travel eSIM)", group: "oenodpay", color: "#00A8A8", test: true, description: "Sell travel data eSIMs for 200+ countries.", docs: "https://partners.airalo.com", fields: [{ key: "AIRALO_CLIENT_ID", label: "Client ID" }, { key: "AIRALO_CLIENT_SECRET", label: "Client secret", secret: true }, { key: "AIRALO_ENV", label: "Environment", placeholder: "live or sandbox" }] },
  { key: "callcenter", name: "AI call center (Twilio Voice)", group: "oenodpay", color: "#F22F46", description: "Customers call your number and the AI agent answers, then hands off to a person. Uses the Twilio keys above.", fields: [{ key: "SUPPORT_PHONE", label: "Support phone number", placeholder: "+18005551234", help: "In Twilio, set this number's voice webhook to {APP_URL}/api/voice/inbound (POST)." }, { key: "SUPPORT_AGENT_PHONE", label: "Forward to agents at", placeholder: "+14165551234" }, { key: "SUPPORT_AI_MODEL", label: "AI model for support (optional)", placeholder: "claude-opus-5-5" }] },
  // Messaging
  { key: "resend", name: "Resend email", group: "Email & SMS", color: "#000000", test: true, description: "All emails: sign-up, invoices, payslips, alerts, campaigns.", docs: "https://resend.com/api-keys", fields: [{ key: "RESEND_API_KEY", label: "API key", secret: true, placeholder: "re_..." }, { key: "EMAIL_FROM", label: "Send from", placeholder: "OENOD <hello@oenod.com>" }] },
  { key: "twilio", name: "Twilio SMS & WhatsApp", group: "Email & SMS", color: "#F22F46", test: true, description: "Text alerts, 2-step codes, reminders and WhatsApp.", fields: [{ key: "TWILIO_ACCOUNT_SID", label: "Account SID" }, { key: "TWILIO_AUTH_TOKEN", label: "Auth token", secret: true }, { key: "TWILIO_FROM", label: "From number", placeholder: "+15551234567" }] },
  { key: "expo", name: "Push notifications (Expo)", group: "Email & SMS", color: "#000020", description: "Push notifications to the iPhone and Android apps.", fields: [{ key: "EXPO_ACCESS_TOKEN", label: "Access token", secret: true }] },
  // AI
  { key: "anthropic", name: "Claude AI", group: "AI", color: "#D97757", test: true, description: "Powers the AI Business Manager, drafting, planning, verification and the admin assistant.", docs: "https://console.anthropic.com/settings/keys", fields: [{ key: "ANTHROPIC_API_KEY", label: "API key", secret: true, placeholder: "sk-ant-..." }, { key: "AI_MODEL", label: "Model", placeholder: "claude-opus-5-5" }] },
  // Sign-in & app connections (one OAuth app per provider unlocks it for every customer)
  { key: "google", name: "Google apps", group: "App connections", color: "#4285F4", description: "Business Profile, Calendar, Gmail, Drive, Sheets, Workspace, Analytics, Ads.", fields: [{ key: "GOOGLE_CLIENT_ID", label: "Client ID" }, { key: "GOOGLE_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "microsoft", name: "Microsoft 365", group: "App connections", color: "#0078D4", description: "Outlook, Calendar, Teams, OneDrive, SharePoint, Excel and Entra ID.", fields: [{ key: "MICROSOFT_CLIENT_ID", label: "Application (client) ID" }, { key: "MICROSOFT_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "meta", name: "Meta (Facebook & Instagram)", group: "App connections", color: "#1877F2", description: "Posting, comments and lead ads.", fields: [{ key: "META_CLIENT_ID", label: "App ID" }, { key: "META_CLIENT_SECRET", label: "App secret", secret: true }] },
  { key: "quickbooks", name: "QuickBooks", group: "App connections", color: "#2CA01C", description: "Accounting sync for customers.", fields: [{ key: "QUICKBOOKS_CLIENT_ID", label: "Client ID" }, { key: "QUICKBOOKS_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "xero", name: "Xero", group: "App connections", color: "#13B5EA", description: "Accounting sync for customers.", fields: [{ key: "XERO_CLIENT_ID", label: "Client ID" }, { key: "XERO_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "salesforce", name: "Salesforce", group: "App connections", color: "#00A1E0", description: "CRM sync for customers.", fields: [{ key: "SALESFORCE_CLIENT_ID", label: "Consumer key" }, { key: "SALESFORCE_CLIENT_SECRET", label: "Consumer secret", secret: true }] },
  { key: "zoho", name: "Zoho", group: "App connections", color: "#E42527", description: "Zoho CRM & Books sync.", fields: [{ key: "ZOHO_CLIENT_ID", label: "Client ID" }, { key: "ZOHO_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "slack", name: "Slack", group: "App connections", color: "#4A154B", description: "Alerts and approvals in Slack.", fields: [{ key: "SLACK_CLIENT_ID", label: "Client ID" }, { key: "SLACK_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "shopify", name: "Shopify", group: "App connections", color: "#95BF47", description: "Store sync.", fields: [{ key: "SHOPIFY_CLIENT_ID", label: "API key" }, { key: "SHOPIFY_CLIENT_SECRET", label: "API secret", secret: true }] },
  { key: "zoom", name: "Zoom", group: "App connections", color: "#2D8CFF", description: "Meeting links.", fields: [{ key: "ZOOM_CLIENT_ID", label: "Client ID" }, { key: "ZOOM_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "linkedin", name: "LinkedIn", group: "App connections", color: "#0A66C2", description: "Company posts and jobs.", fields: [{ key: "LINKEDIN_CLIENT_ID", label: "Client ID" }, { key: "LINKEDIN_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "tiktok", name: "TikTok", group: "App connections", color: "#000000", description: "Video posting.", fields: [{ key: "TIKTOK_CLIENT_ID", label: "Client key" }, { key: "TIKTOK_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "mailchimp", name: "Mailchimp", group: "App connections", color: "#FFE01B", description: "Audience sync.", fields: [{ key: "MAILCHIMP_CLIENT_ID", label: "Client ID" }, { key: "MAILCHIMP_CLIENT_SECRET", label: "Client secret", secret: true }] },
  { key: "freshbooks", name: "FreshBooks", group: "App connections", color: "#0075DD", description: "Accounting sync.", fields: [{ key: "FRESHBOOKS_CLIENT_ID", label: "Client ID" }, { key: "FRESHBOOKS_CLIENT_SECRET", label: "Client secret", secret: true }] },
  // Maps, analytics, security
  { key: "maps", name: "Maps", group: "Maps & analytics", color: "#4264FB", description: "Free OpenStreetMap is used by default. Add Mapbox for premium map styles.", fields: [{ key: "MAPBOX_TOKEN", label: "Mapbox public token", placeholder: "pk..." }] },
  { key: "analytics", name: "Website analytics", group: "Maps & analytics", color: "#E37400", description: "Google Analytics and/or PostHog on the public website.", fields: [{ key: "GA_MEASUREMENT_ID", label: "Google Analytics ID", placeholder: "G-XXXX" }, { key: "POSTHOG_KEY", label: "PostHog key" }] },
  { key: "turnstile", name: "Bot protection (Cloudflare Turnstile)", group: "Security", color: "#F38020", description: "Stops bots on sign-up, job applications and forms.", fields: [{ key: "TURNSTILE_SITE_KEY", label: "Site key" }, { key: "TURNSTILE_SECRET_KEY", label: "Secret key", secret: true }] },
  { key: "storage", name: "File storage (S3 compatible)", group: "Storage", color: "#569A31", description: "Store large files in S3, Cloudflare R2, Backblaze or Wasabi instead of the database.", fields: [{ key: "S3_ENDPOINT", label: "Endpoint" }, { key: "S3_BUCKET", label: "Bucket" }, { key: "S3_ACCESS_KEY_ID", label: "Access key ID" }, { key: "S3_SECRET_ACCESS_KEY", label: "Secret access key", secret: true }] },
];

export const PLUGIN_KEYS = new Set(PLATFORM_PLUGINS.flatMap((p) => p.fields.map((f) => f.key)));

// Values from the hosting environment, kept so removing a setting restores them.
const original: Record<string, string | undefined> = {};
let loadedAt = 0;
let loading: Promise<void> | null = null;

/** Copy saved plugin settings into process.env so every library picks them up. */
export async function loadPlatformSettings(force = false) {
  if (!force && Date.now() - loadedAt < 30_000) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const rows = await db.platformSetting.findMany();
      const seen = new Set<string>();
      for (const r of rows) {
        if (!PLUGIN_KEYS.has(r.key)) continue;
        if (!(r.key in original)) original[r.key] = process.env[r.key];
        const v = decrypt(r.value);
        if (v) { process.env[r.key] = v; seen.add(r.key); }
      }
      for (const k of Object.keys(original)) if (!seen.has(k)) {
        if (original[k] === undefined) delete process.env[k];
        else process.env[k] = original[k];
      }
      loadedAt = Date.now();
    } catch {
      // Database not ready yet (first deploy): keep environment values.
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export async function saveSetting(key: string, value: string | null, plugin: string, by: string) {
  if (!PLUGIN_KEYS.has(key)) throw new Error(`Unknown setting ${key}`);
  if (value === null || value === "") await db.platformSetting.deleteMany({ where: { key } });
  else await db.platformSetting.upsert({ where: { key }, create: { key, value: encrypt(value), plugin, updatedBy: by }, update: { value: encrypt(value), plugin, updatedBy: by } });
  await loadPlatformSettings(true);
}

/** Status for the admin screen (never returns secret values). */
export async function pluginStatus() {
  await loadPlatformSettings(true);
  const rows = await db.platformSetting.findMany();
  return PLATFORM_PLUGINS.map((p) => ({
    ...p,
    fields: p.fields.map((f) => {
      const saved = rows.find((r) => r.key === f.key);
      const v = process.env[f.key];
      return { ...f, set: Boolean(v), source: saved ? "admin" : v ? "hosting" : null, preview: v ? (f.secret ? `••••${v.slice(-4)}` : v) : null };
    }),
    enabled: p.fields.filter((f) => f.secret || /CLIENT_ID|KEY|SID|TOKEN/.test(f.key)).every((f) => Boolean(process.env[f.key])),
  }));
}

/** "Test connection" for plugins that support it. */
export async function testPlugin(key: string): Promise<{ ok: boolean; message: string }> {
  await loadPlatformSettings(true);
  try {
    if (key === "stripe") {
      const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
      return r.ok ? { ok: true, message: "Stripe key works." } : { ok: false, message: `Stripe said ${r.status}. Check the key.` };
    }
    if (key === "resend") {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
      const j = (await r.json().catch(() => ({}))) as { data?: { name: string; status: string }[] };
      return r.ok ? { ok: true, message: `Resend works. Domains: ${(j.data ?? []).map((d) => `${d.name} (${d.status})`).join(", ") || "none yet, add your domain in Resend"}` } : { ok: false, message: `Resend said ${r.status}.` };
    }
    if (key === "twilio") {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}` } });
      return r.ok ? { ok: true, message: "Twilio account found." } : { ok: false, message: `Twilio said ${r.status}.` };
    }
    if (key === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" } });
      return r.ok ? { ok: true, message: "Claude API key works." } : { ok: false, message: `Anthropic said ${r.status}.` };
    }
    const pay: Record<string, () => Promise<string>> = {
      airwallex: () => import("./pay/providers/airwallex").then((m) => m.test()),
      thunes: () => import("./pay/providers/thunes").then((m) => m.test()),
      opensanctions: () => import("./pay/providers/sanctions").then((m) => m.test()),
      airalo: () => import("./pay/providers/airalo").then((m) => m.test()),
      twelvedata: () => import("./pay/providers/market").then(async (m) => { const q = await m.quotes(); const live = q.filter((x) => x.price != null).length; return `${live} of ${q.length} live prices are coming through.`; }),
    };
    if (pay[key]) return { ok: true, message: await pay[key]() };
    return { ok: true, message: "Saved. This plugin has no live test." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Test failed" };
  }
}
