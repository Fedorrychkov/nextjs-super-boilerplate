#!/bin/bash

# One-shot project bootstrap for a fresh fork of this boilerplate.
#
# What it does:
#   1. Renames the boilerplate placeholders (project slug, human name, domain, author)
#      across the few files that hardcode them — package.json, config/product.ts,
#      .github/workflows/prod-deploy.yml, lib/oauth/providers/github.provider.ts,
#      Makefile, docker-compose.dev.yml.
#   2. Creates .env.local from .env.example and fills generated secrets:
#      JWT_SECRET, MFA_ENCRYPTION_KEY, SEO_NOTIFY_SECRET (openssl) + VAPID keypair (web-push),
#      plus NEXT_PUBLIC_SITE_URL from your domain.
#   3. Writes a guard/log file (.project-initialized, gitignored) with a run log and a
#      copy of the generated secrets, then runs `pnpm doctor`.
#
# Idempotency: refuses to run twice (guard file). Re-run with FORCE=1 only if you know
# you want to regenerate secrets and re-apply renames (usually you don't).
#
# Portable in-place edits use `perl -i` (BSD/macOS + GNU/Linux behave the same).
#
# Usage:
#   ./scripts/init-project.sh                 # interactive
#   ./scripts/init-project.sh \
#     --slug my-app --name "My App" \
#     --domain my-app.example.com \
#     --author "Jane Doe" --author-url https://github.com/janedoe

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT"

GUARD="$ROOT/.project-initialized"

SLUG=""; NAME=""; DOMAIN=""; AUTHOR=""; AUTHOR_URL=""

while [ $# -gt 0 ]; do
    case "$1" in
        --slug) SLUG="$2"; shift 2 ;;
        --name) NAME="$2"; shift 2 ;;
        --domain) DOMAIN="$2"; shift 2 ;;
        --author) AUTHOR="$2"; shift 2 ;;
        --author-url) AUTHOR_URL="$2"; shift 2 ;;
        -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

if [ -f "$GUARD" ] && [ "${FORCE:-0}" != "1" ]; then
    echo "This project is already initialized (see $(basename "$GUARD"))."
    echo "Re-running would overwrite .env.local secrets. Use FORCE=1 to override."
    exit 1
fi

ask() {
    # ask VAR "Prompt" "default"
    local __var="$1" __prompt="$2" __default="${3:-}" __ans=""
    local __cur="${!__var}"
    [ -n "$__cur" ] && { printf -v "$__var" '%s' "$__cur"; return; }
    if [ -n "$__default" ]; then
        read -r -p "$__prompt [$__default]: " __ans || true
        printf -v "$__var" '%s' "${__ans:-$__default}"
    else
        read -r -p "$__prompt: " __ans || true
        printf -v "$__var" '%s' "$__ans"
    fi
}

echo "== Project bootstrap =="
ask SLUG        "Project slug (package name, kebab-case)"
ask NAME        "Human-readable product name"        "$SLUG"
ask DOMAIN      "Production domain (no scheme)"       "$SLUG.example.com"
ask AUTHOR      "Public author name (empty = SaaS, no byline)" ""
[ -n "$AUTHOR" ] && ask AUTHOR_URL "Author URL" "https://github.com/"

if [ -z "$SLUG" ] || [ -z "$NAME" ] || [ -z "$DOMAIN" ]; then
    echo "slug, name and domain are required."
    exit 1
fi

echo
echo "slug=$SLUG name='$NAME' domain=$DOMAIN author='${AUTHOR:-<none>}'"
if [ "${YES:-0}" != "1" ]; then
    read -r -p "Proceed? [y/N]: " ok || true
    case "${ok:-}" in y|Y|yes) ;; *) echo "Aborted."; exit 1 ;; esac
fi

# --- helpers ---------------------------------------------------------------
# perl -i replace: pin(file, perl-expr). Values are passed via env to avoid quoting hell.
pin() { local f="$1"; shift; perl -0777 -i -pe "$1" "$f"; }

esc() { printf '%s' "$1" | perl -pe 's/([\/@\$\\])/\\$1/g'; }  # escape for perl s///

S_SLUG="$(esc "$SLUG")"; S_NAME="$(esc "$NAME")"; S_DOMAIN="$(esc "$DOMAIN")"
S_AUTHOR="$(esc "$AUTHOR")"; S_AUTHOR_URL="$(esc "$AUTHOR_URL")"

echo "== Renaming placeholders =="

# package.json: "name": "nextjs-super-boilerplate"
pin package.json "s/\"name\":\s*\"nextjs-super-boilerplate\"/\"name\": \"$S_SLUG\"/"

# config/product.ts — name / shortName / defaultTitle / description left to the user to refine,
# but set the obvious identity fields + links + author.
pin config/product.ts "s/name: 'Production Ready Next\.js Boilerplate'/name: '$S_NAME'/"
pin config/product.ts "s/shortName: 'Next\.js Boilerplate'/shortName: '$S_NAME'/"
pin config/product.ts "s/defaultTitle: 'Production Ready Next\.js Boilerplate'/defaultTitle: '$S_NAME'/"
pin config/product.ts "s{github: 'https://github\.com/Fedorrychkov/nextjs-super-boilerplate'}{github: 'https://github.com/$S_SLUG'}"
pin config/product.ts "s{demo: 'https://nextjs-super-boilerplate\.visn-ai\.io'}{demo: 'https://$S_DOMAIN'}"
if [ -n "$AUTHOR" ]; then
    pin config/product.ts "s/name: 'Fedor Rychkov'/name: '$S_AUTHOR'/"
    [ -n "$AUTHOR_URL" ] && pin config/product.ts "s{url: 'https://github\.com/Fedorrychkov'}{url: '$S_AUTHOR_URL'}"
else
    echo "  (author empty — review config/product.ts: set author: null for a SaaS without byline)"
fi

# prod-deploy.yml: domain / registry_subname / tag
pin .github/workflows/prod-deploy.yml "s/domain: nextjs-super-boilerplate\.visn-ai\.io/domain: $S_DOMAIN/"
pin .github/workflows/prod-deploy.yml "s/registry_subname: 'nextjs-super-boilerplate'/registry_subname: '$S_SLUG'/"
pin .github/workflows/prod-deploy.yml "s/tag: 'nextjs-super-boilerplate'/tag: '$S_SLUG'/"

# github oauth provider User-Agent (x2)
pin lib/oauth/providers/github.provider.ts "s/'User-Agent': 'nextjs-super-boilerplate'/'User-Agent': '$S_SLUG'/g"

# Makefile local dev domains — use the slug (not the prod domain) for a clean `<slug>.local`
pin Makefile "s/tg-mini-app\.local,www\.tg-mini-app\.local/$S_SLUG.local,www.$S_SLUG.local/g"
pin Makefile "s/FIRST_DOMAIN=tg-mini-app\.local/FIRST_DOMAIN=$S_SLUG.local/g"

echo "== Creating .env.local =="
if [ -f .env.local ] && [ "${FORCE:-0}" != "1" ]; then
    echo "  .env.local already exists — leaving it, only reporting generated secrets below."
    ENV_TOUCHED=0
else
    cp .env.example .env.local
    ENV_TOUCHED=1
fi

# --- generate secrets ------------------------------------------------------
gen_hex() { openssl rand -hex "${1:-32}"; }

JWT_SECRET="$(gen_hex 32)"
MFA_ENCRYPTION_KEY="$(gen_hex 32)"
SEO_NOTIFY_SECRET="$(gen_hex 24)"

echo "== Generating VAPID keypair =="
VAPID_PUBLIC=""; VAPID_PRIVATE=""
if VAPID_OUT="$(npx --yes web-push generate-vapid-keys --json 2>/dev/null)"; then
    VAPID_PUBLIC="$(printf '%s' "$VAPID_OUT" | perl -ne 'print $1 if /"publicKey"\s*:\s*"([^"]+)"/')"
    VAPID_PRIVATE="$(printf '%s' "$VAPID_OUT" | perl -ne 'print $1 if /"privateKey"\s*:\s*"([^"]+)"/')"
fi
[ -z "$VAPID_PUBLIC" ] && echo "  (web-push unavailable — VAPID left empty, generate later at https://vapidkeys.com/)"

setenv() {
    # setenv KEY VALUE — replace `KEY=...` line (value may be empty in template)
    local k="$1" v="$2"
    local sv; sv="$(esc "$v")"
    perl -i -pe "s/^$k=.*/$k=$sv/ if /^$k=/" .env.local
}

if [ "$ENV_TOUCHED" = "1" ]; then
    setenv JWT_SECRET "$JWT_SECRET"
    setenv MFA_ENCRYPTION_KEY "$MFA_ENCRYPTION_KEY"
    setenv SEO_NOTIFY_SECRET "$SEO_NOTIFY_SECRET"
    setenv NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
    [ -n "$VAPID_PUBLIC" ] && setenv NEXT_PUBLIC_VAPID_PUBLIC_KEY "$VAPID_PUBLIC"
    [ -n "$VAPID_PRIVATE" ] && setenv VAPID_PRIVATE_KEY "$VAPID_PRIVATE"
fi

# --- guard / log file ------------------------------------------------------
{
    echo "# Project initialized: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "# This file is gitignored. It records the bootstrap run and the GENERATED secrets"
    echo "# below (also written to .env.local). Copy the prod-relevant ones into your CI"
    echo "# secret store (e.g. GitHub Actions secret WEB_ENV_PROD)."
    echo
    echo "slug=$SLUG"
    echo "name=$NAME"
    echo "domain=$DOMAIN"
    echo "author=${AUTHOR:-<none>}"
    echo
    echo "## Generated secrets (also in .env.local for local dev):"
    echo "JWT_SECRET=$JWT_SECRET"
    echo "MFA_ENCRYPTION_KEY=$MFA_ENCRYPTION_KEY"
    echo "SEO_NOTIFY_SECRET=$SEO_NOTIFY_SECRET"
    echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC"
    echo "VAPID_PRIVATE_KEY=$VAPID_PRIVATE"
} > "$GUARD"

echo
echo "== Generated secrets (saved to $(basename "$GUARD") and .env.local) =="
echo "  JWT_SECRET, MFA_ENCRYPTION_KEY, SEO_NOTIFY_SECRET, VAPID keypair"
echo
echo "Next, set these MANUALLY (not auto-generated):"
echo "  .env.local  → MONGO_* (or MONGO_URI), REDIS_URL, FIRST_ADMIN_LOGIN/PASSWORD,"
echo "                UPLOADCARE_*, email/LLM/OAuth provider keys as needed"
echo "  CI secrets  → put the prod env (incl. the generated secrets above) into WEB_ENV_PROD"
echo "  Review      → config/product.ts (description, author:null for SaaS, pwa colors, icons)"
echo

echo "== Running doctor =="
if command -v pnpm >/dev/null 2>&1; then
    pnpm doctor || echo "(doctor reported findings — see above; fill the missing env and re-run 'pnpm doctor')"
else
    echo "(pnpm not found — run 'pnpm doctor' after installing deps)"
fi

echo
echo "Done. Review the diff (git diff), fill the manual values, then: pnpm install && pnpm run dev:local"
