# SoloWorks (솔로웍스) — website

The client-facing website for **SoloWorks**, outsourcing for solo founders and small businesses: short-form video editing, landing pages and AI translation review, with one Korean-speaking PM per project. Visitors send a quote request; your team sees and manages every request in a private dashboard.

Plain HTML, CSS and JavaScript with three small Vercel functions. No framework, no build step and no npm packages to install.

---

## What's in it

| Page | What it does |
|---|---|
| `/` (Korean, default) | Hero with an animated example project, services and prices, free test edit offer, sample work, how it works (4 steps), comparison, about the operator, quote request form, FAQ |
| `/en` | The same page in English. The 한국어 / EN switch in the header links the two |
| `/privacy`, `/en-privacy` | Privacy policy (Korean and English), linked from the form's consent box and the footer |
| `/admin` | Your team's password-protected dashboard: quote requests, status, notes, CSV export |
| 404 | A friendly not-found page |

Link straight to the form with `/#contact`. Links like `/?service=test_edit#contact` pre-select the type of work (the service cards and the free test edit button use this). Service ids: `video`, `development`, `translation`, `test_edit`, `other`.

**Quote form:** three short slides, like a lead form: (1) tap the type of work, which moves on by itself, (2) a line or two about what they need, (3) name, email, phone (optional) and a required privacy consent. Links with `?service=` skip straight to slide 2. The page language is saved with each request, so the confirmation email and your reply can match it. Company and timeline are no longer asked; the PM covers them on the call (the columns stay in the database).

**Colour code:** orange is the SoloWorks accent (buttons, prices, highlights); navy with aqua is the secondary pairing. Orange buttons use navy text for contrast.

### Copy rule
This site speaks to clients only, as SoloWorks. It does not say where or by whom the work is done, does not mention any freelancer panel or delivery team, and does not mention UD IMPACT. The only place the operating company is named is the privacy policy, which Korean law requires. The flow promised on the site is: request, PM gets in touch right away (business hours), work starts, delivery. Payment is by card, with the card receipt as proof; the site does not mention tax invoices.

---

## Deploy to Vercel (about 15 minutes)

### 1. Create the database (Supabase, free tier is fine)
1. Go to [supabase.com](https://supabase.com) → **New project**. A Seoul region (`ap-northeast-2`) keeps it close to your visitors.
2. Open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and click **Run**. It is safe to run again, and running it again also updates an older table for the short form.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role** secret key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep it secret; it only lives on the server)

### 2. Put the code on Vercel
**Option A — GitHub (recommended):** push this folder to a GitHub repository, then in Vercel click **Add New → Project → Import** that repository. Leave **Framework Preset = Other** and leave Build Command and Output Directory empty (`vercel.json` already sets them). Click **Deploy**.

**Option B — Vercel CLI:**
```bash
npm i -g vercel
cd soloworks-site
vercel          # first deploy (preview)
vercel --prod   # production
```

### 3. Add environment variables
Vercel → your project → **Settings → Environment Variables**. Add these, then **redeploy** (Deployments → ⋯ → Redeploy):

| Variable | Required | Example |
|---|---|---|
| `SUPABASE_URL` | Yes | `https://abcd1234.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJhbGciOi…` |
| `ADMIN_PASSWORD` | Yes, for /admin | at least 8 characters |
| `RESEND_API_KEY` | Recommended | from [resend.com](https://resend.com) → API Keys |
| `NOTIFY_EMAIL` | Optional | `hello@soloworks.in` (default). Comma-separate several addresses |
| `REPLY_TO` | Optional | where client replies to confirmation emails go. Defaults to `hello@soloworks.in` |
| `RESEND_FROM` | Optional | `SoloWorks <hello@your-domain.com>`, a sender on a domain you verified in Resend. When set, people who submit also get a confirmation email in their language |
| `SEND_CONFIRMATIONS` | Optional | `false` to switch confirmation emails off |
| `SLACK_WEBHOOK_URL` | Optional | Incoming Webhook URL for #soloworks-leads (api.slack.com/apps → Create New App → Incoming Webhooks → Add New Webhook → pick #soloworks-leads) |
| `SITE_URL` | Optional | your live address (puts a dashboard link in alerts) |

> Without `RESEND_FROM`, alerts are sent from Resend's test sender, which can only deliver to the email address on your Resend account. Verify your domain in Resend for production.

### 4. Check it
Open `https://your-site.vercel.app/api/health`. You want `"database": "connected"` and `"accepting_submissions": true`. Or run:
```bash
node scripts/check.js https://your-site.vercel.app
```
Then send one test request from `/` and one from `/en`, and open `/admin`.

### 5. Connect your domain
Vercel → project → **Settings → Domains** → add your domain, then add the DNS records Vercel shows (usually an `A` record for `@` to `76.76.21.21` and a `CNAME` for `www` to `cname.vercel-dns.com`). Once the domain is live, change the `og:image` and `hreflang` links at the top of each page to full URLs on that domain.

---

## Day-to-day: running requests in /admin

1. Sign in at `/admin` with `ADMIN_PASSWORD`.
2. Open a request, add team notes (call, scope, quote, feedback) and move it along:
   `New → PM called, scoping → Quote sent → In production → Quality check → Delivered / Closed`.
3. Each row notes which page it came from ("KO site" or "EN site"). Reply in that language.
4. **Export CSV** downloads what's on screen (respects filters).

---

## What happens if something isn't connected
- **No database and no email/Slack:** the form shows a clear message plus "Email my answers" and "Copy my answers", so nobody loses what they typed.
- **Email or Slack only (no database):** requests are delivered as alerts; `/admin` needs the database.
- **Opening a copy from disk** (the separate local-preview folder): the form shows a labelled "Preview only. Nothing was sent." screen, and the dashboard shows sample requests.

The form saves an unsent draft in the visitor's own browser so a refresh doesn't wipe their answers; it's cleared after a successful submit.

Spam protection: a hidden honeypot field, a minimum time-on-form check, and full server-side validation.

---

## Editing content
- **Text and layout:** edit `public/index.html` (Korean) and `public/en.html` (English). Header and footer are repeated in each page, so change them in every file.
- **Prices:** they appear in the services section of both home pages and in `public/assets/img/og.png` (the image shown when the link is shared).
- **Services, timelines, statuses:** `public/assets/js/options.js` holds the lists the server checks submissions against and the dashboard displays, in Korean and English. The same service names appear in the form in both home pages, so if you rename or add a service, change it in all three places (and in the `check` list in `supabase/schema.sql` if you add a status).
- **Hero example:** the four steps and the price come from the `plan` and `plan_price` copy; edit them in the hero card of each home page.
- **Styles and colours:** `public/assets/css/site.css`. Colour tokens are at the top.
- **Fonts:** Pretendard, loaded from jsDelivr (allowed in the Content-Security-Policy in `vercel.json`). If you self-host it later, put the files in `public/assets/fonts/` and remove jsDelivr from the policy.

## Brand assets
- `public/assets/brand/soloworks/`: from the SoloWorks brand package. Wordmark (header and footer), SW monogram (dashboard, favicon), the continuous-flow ribbon (hero, with a still image for visitors who turn off motion) and two website elements used as quiet decoration.

## Run it on your computer
Requires Node.js 18 or newer.
```bash
cp .env.example .env.local   # fill in at least the Supabase values to test saving
node scripts/dev-server.js   # http://localhost:3000
```
`scripts/dev-server.js` serves the site with the same clean URLs, headers and API routes as Vercel.

## Project structure
```
public/                 static site (served by Vercel)
  index.html en.html privacy.html en-privacy.html admin.html 404.html
  assets/css/site.css   design system and all styles
  assets/js/site.js     navigation, menus, the animated example project
  assets/js/forms.js    quote request form: validation, drafts, submission, email fallback
  assets/js/admin.js    team dashboard
  assets/js/options.js  services, timelines and statuses (browser + server)
  assets/brand/         SoloWorks logos and brand artwork
  assets/img/           partner logos, social image
api/                    Vercel serverless functions (Node.js)
  register.js           POST: save and notify
  admin.js              GET/POST: dashboard data and status updates (password)
  health.js             GET: which integrations are connected
  _lib/                 validation, Supabase client, notifications
supabase/schema.sql     database table: projects (run once)
vercel.json             clean URLs, security headers, caching
```

## Before launch
- Have the privacy policy and the consent text on the form reviewed by your legal adviser, especially the retention period (currently 1 year after the conversation ends).
- Confirm you have permission to show each partner logo.
- Confirm the prices, the free test edit offer and the example projects in the hero animation match what your team will deliver.
