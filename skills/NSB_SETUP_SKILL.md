---
name: setup-nsb
description: "Next.js Super Boilerplate setup wizard — guides you step-by-step through product identity, environment variables, feature flags, and branding after forking."
---

# Next.js Super Boilerplate — Setup Wizard

You are helping a developer (or vibe-coder) configure their fork of the **Next.js Super Boilerplate** (NSB). Walk them through the key configuration files step by step, write the changes, and explain what each setting does.

## Before you start

Check if the user has a workspace folder mounted. If yes, read `config/product.ts` and `config/env.ts` to understand their current state. If these files are already customized, acknowledge it and offer to review / improve them.

Create a task list with the steps below so the user can see progress.

---

## Step 1 — Product identity (`config/product.ts`)

Tell the user: "This is the single file that defines your product's identity — name, author, links, and SEO metadata. Let's fill it in."

Ask these questions (you can batch them in one message):

1. **Product name** — e.g. "My SaaS App" (shown in browser tab, og:title, PWA)
2. **Short name** — e.g. "MySaaS" (shown in sidebar logo area)
3. **Description** — one sentence, used in meta tags and structured data
4. **Author name & GitHub URL** — or `null` if you don't want a public author persona
5. **GitHub repo URL** — or `null` if private/not open source
6. **Live demo URL** — or `null`

After collecting answers, edit `config/product.ts` with the correct values. Show the diff before writing.

---

## Step 2 — Core environment variables (`.env.local`)

Tell the user: "Now let's set your critical environment variables. You only need to touch a few to get started."

**Required:**
- `NEXT_PUBLIC_SITE_URL` — your production domain, e.g. `https://myapp.com`
- `JWT_SECRET` — long random string (offer to generate one with `openssl rand -base64 32`)
- `MONGO_URI` — MongoDB connection string

**Optional but important:**
- `FIRST_ADMIN_LOGIN` / `FIRST_ADMIN_PASSWORD` — the first admin account credentials
- `REDIS_URL` — for rate limiting and queues (skip if not needed)

Ask if they want to configure email (`EMAIL_SEND_MODE`, `EMAIL_API_KEY`, etc.) or skip for now.

If the user is comfortable running shell commands, offer to generate a JWT secret for them via bash and insert it.

After collecting, create or append to `.env.local` (never overwrite existing values without confirmation).

---

## Step 3 — Auth & registration mode

Tell the user: "NSB supports two registration modes."

Explain the options:
- **`REGISTRATION_MODE=email`** — users must verify their email via OTP before they can log in (recommended for production)
- **`REGISTRATION_MODE=`** (empty) — open registration, no email verification needed (great for early dev / internal tools)

Ask which they want and update `.env.local` accordingly.

Also ask: do they want to enable **MFA (TOTP)**? If yes, they need `MFA_ENCRYPTION_KEY` — offer to generate one.

---

## Step 4 — AI features (optional)

Tell the user: "NSB includes LLM-powered features — chat, content suggestions, image generation, article audit. These are off by default."

If they want AI features:
- Ask for their OpenAI-compatible API key (`LLM_API_KEY`)
- Set `NEXT_PUBLIC_LLM_ENABLED=true`
- Explain rate limits (`LLM_CHAT_RATE_LIMIT_POINTS`, `LLM_CHAT_RATE_DURATION_SEC`)

If they skip, confirm `NEXT_PUBLIC_LLM_ENABLED=false` (default).

---

## Step 5 — Push notifications (optional)

Tell the user: "NSB has Web Push support — users can subscribe and you can broadcast notifications from the admin panel."

If they want push:
- They need VAPID keys. Offer to explain how to generate them (`npx web-push generate-vapid-keys`)
- Set `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

If they skip, they can add this later.

---

## Step 6 — Media uploads (optional)

If they need file/image uploads:
- Ask if they have an **Uploadcare** account
- Set `UPLOADCARE_PUBLIC_KEY` and `UPLOADCARE_SECRET_KEY`
- Explain: without this, media blocks in the editor won't work

---

## Step 7 — Quick-start checklist & next steps

Summarize what was configured. Then show the user:

```bash
pnpm install
pnpm dev
```

Point them to:
- `/ui-kit` — live component playground
- `/profile` — to test auth
- `/admin/users` — to manage users (requires ADMIN role)
- `docs/start/getting-started.ru.md` — for full setup guide
- `docs/configure/env-reference.ru.md` (EN: `env-reference.en.md`) — for all env variables
- `docs/configure/feature-flags.ru.md` — feature flags and what they switch

Congratulate them and offer to help with the next thing: customizing the landing page, adding OAuth providers, or setting up CI/CD.

---

## Notes for Claude

- **Always read files before editing** — don't overwrite `config/product.ts` without reading the current content first.
- **Never commit secrets** — remind the user that `.env.local` should be in `.gitignore` (it already is in NSB).
- **Generate secrets safely** — use `openssl rand -base64 32` or `crypto.randomBytes` via Node, not ChatGPT-style "random" strings.
- **Be friendly** — this is for developers AND vibe-coders who may not know what JWT or VAPID means. Explain terms simply.
- If the user asks questions outside setup (e.g. "how do I add Stripe?"), answer them but then redirect back to the wizard.
