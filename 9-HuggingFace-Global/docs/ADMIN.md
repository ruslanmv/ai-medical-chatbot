# MedOS Admin Guide

Complete guide for deploying, configuring, and managing the MedOS platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Guide](#deployment-guide)
3. [Admin Panel](#admin-panel)
4. [LLM Provider Setup](#llm-provider-setup)
5. [Email (SMTP) Configuration](#email-smtp-configuration)
6. [Medicine Scanner Setup](#medicine-scanner-setup)
7. [Nearby Finder Setup](#nearby-finder-setup)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

MedOS runs as **3 independent HuggingFace Spaces** + an optional **Vercel frontend**:

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
│                                                             │
│  Vercel (optional)              OR    HuggingFace Space     │
│  ai-medical-chabot.com               huggingface.co/spaces/ │
│  Frontend only                        ruslanmv/MediBot      │
│  /api/proxy/* → MediBot              Full app (FE + BE)     │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│  MediBot Space (ruslanmv/MediBot)                           │
│  Next.js 14 + SQLite                                        │
│                                                             │
│  /api/chat     → LLM providers (Llama, Qwen, Gemma, etc.)  │
│  /api/auth/*   → User auth (register, login, verify)        │
│  /api/nearby   → Proxy to MetaEngine-Nearby                 │
│  /api/scan     → Proxy to Medicine-Scanner                  │
│  /api/admin/*  → Admin panel APIs                           │
│  /api/health   → Health check                               │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────────┐  ┌──────────────────────┐
│  Medicine-Scanner     │  │  MetaEngine-Nearby   │
│  (Gradio SDK)         │  │  (Gradio SDK)        │
│                       │  │                      │
│  Qwen2.5-VL-72B      │  │  OpenStreetMap       │
│  Image → JSON         │  │  Overpass API        │
│                       │  │  Nominatim geocoder  │
└───────────────────────┘  └──────────────────────┘
```

---

## Deployment Guide

### Prerequisites

- HuggingFace account with write token
- (Optional) Vercel account for custom domain
- (Optional) SMTP credentials for email verification

### Required Tokens

| Token | Purpose | How to Create |
|-------|---------|---------------|
| **HF_TOKEN** (write) | Deploy Spaces, manage secrets | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → Fine-grained → Repo write |
| **HF_TOKEN_INFERENCE** | Medicine Scanner AI inference | [Create here](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) → Check "Make calls to Inference Providers" |

---

### Deploy MediBot (Main App)

This is the core application — chat, health tracker, auth, admin panel.

```bash
# 1. Set your HuggingFace token
export HF_TOKEN=hf_your_write_token_here

# 2. Deploy (assembles web/ + backend, rewrites API paths, pushes)
bash 9-HuggingFace-Global/scripts/deploy-hf.sh

# 3. Verify
curl https://ruslanmv-medibot.hf.space/api/health
# → {"status":"ok"}
```

**What it does:**
- Copies `9-HuggingFace-Global/` (backend) as the base
- Overlays `web/` (frontend components, hooks, styles)
- Rewrites `/api/proxy/` → `/api/` in all frontend files
- Force-pushes to `ruslanmv/MediBot` HF Space

**After deployment**, set these secrets in the Space settings:

| Secret | Value | Required? |
|--------|-------|-----------|
| `HF_TOKEN` | Your HF token (for LLM inference) | Yes |
| `HF_TOKEN_INFERENCE` | Token with inference permissions | For scanner proxy |
| `NEARBY_URL` | `https://ruslanmv-metaengine-nearby.hf.space` | Default works |
| `SCANNER_URL` | `https://ruslanmv-medicine-scanner.hf.space` | Default works |
| `DB_PATH` | `/data/medos.db` | Default works |

---

### Deploy Medicine Scanner

AI-powered medicine label reader using Qwen2.5-VL-72B.

```bash
export HF_TOKEN=hf_your_write_token_here
bash 11-Medicine-Scanner/deploy-scanner.sh

# Verify
curl https://ruslanmv-medicine-scanner.hf.space/api/health
# → {"status":"ok","service":"medicine-scanner"}
```

**After deployment**, set this secret in Space settings:

| Secret | Value | Required? |
|--------|-------|-----------|
| `HF_TOKEN` | Token with "Make calls to Inference Providers" permission | Yes |

**Test the scanner:**
```bash
curl -X POST https://ruslanmv-medicine-scanner.hf.space/api/scan \
  -F "image=@photo_of_medicine.jpg"
```

---

### Deploy MetaEngine Nearby Finder

Finds pharmacies and doctors using OpenStreetMap.

```bash
export HF_TOKEN=hf_your_write_token_here
bash 12-MetaEngine-Nearby/deploy-nearby.sh

# Verify
curl https://ruslanmv-metaengine-nearby.hf.space/api/health
# → {"status":"ok","service":"nearby-finder"}
```

No secrets needed — uses free OpenStreetMap APIs.

**Test the finder:**
```bash
curl -X POST https://ruslanmv-metaengine-nearby.hf.space/api/search \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.7128, "lon": -74.006, "entity_type": "pharmacy", "limit": 5}'
```

---

### Deploy Vercel Frontend (Optional)

For custom domains (e.g., `ai-medical-chabot.com`):

1. Go to [vercel.com](https://vercel.com) → Import Git Repository
2. **Root Directory:** `web`
3. **Framework:** Next.js
4. **Environment Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://ruslanmv-medibot.hf.space` |

5. Click **Deploy**
6. Add custom domain in Vercel → Settings → Domains

The Vercel frontend is a thin proxy — all API calls go to the MediBot Space.

---

## Admin Panel

### How to Access

1. Go to your MedOS instance (HF Space or Vercel URL)
2. Log in with the default admin account:
   - **Email:** `admin@medos.health`
   - **Password:** `admin123456`
3. **Change the password immediately** after first login
4. The **Admin** section appears in the desktop sidebar (bottom, under Tools)

### Admin Panel Tabs

#### Overview

Platform statistics at a glance:
- Total users, verified users, admin count
- Health records count, chat sessions count
- Active sessions (logged-in users)
- Health data breakdown by type (medications, vitals, etc.)
- Registration trend chart (last 30 days)

#### Users

User management:
- Search by email or display name
- Paginated list (20 users per page)
- Per-user info: email, verification status, health records count, chat count
- **Reset Password**: Set a temporary password for a user (invalidates all sessions)
- **Delete User**: Admin-only, requires email confirmation, CASCADE deletes all data

#### LLM

Test all AI model providers:
- Click **"Test All Providers"** to test 12 models in parallel
- Shows status (green/red), latency (ms), response preview
- Summary: total/online/offline counts
- Explains the routing fallback chain

**Current model cascade (tested and verified):**

| Model | Size | Provider |
|-------|------|----------|
| Llama 3.3 70B :sambanova | 70B | SambaNova |
| Llama 3.3 70B :together | 70B | Together |
| Llama 3.3 70B (auto) | 70B | Auto-routed |
| Qwen 2.5 72B | 72B | Auto-routed |
| Qwen3 235B (MoE) | 235B | Auto-routed |
| Gemma 3 27B | 27B | Auto-routed |
| Llama 3.1 70B | 70B | Auto-routed |
| Qwen3 32B | 32B | Auto-routed |
| DeepSeek V3 | 671B | Auto-routed |

If all models fail, the system falls back to **15 pre-cached medical FAQ responses** (always works, even offline).

#### Email

SMTP configuration for email verification and password reset:

| Field | Description | Example |
|-------|-------------|---------|
| SMTP Host | Mail server hostname | `smtp.gmail.com` |
| SMTP Port | Usually 587 (TLS) or 465 (SSL) | `587` |
| SMTP Username | Your email account | `medos@yourdomain.com` |
| SMTP Password | App password (not your login password) | `xxxx xxxx xxxx xxxx` |
| From Email | Sender display name + email | `MedOS <noreply@medos.health>` |
| Recovery Email | Support contact for users | `support@medos.health` |

**Gmail setup:**
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Generate an app password
3. Use your Gmail as SMTP username, app password as SMTP password
4. Host: `smtp.gmail.com`, Port: `587`

**If SMTP is not configured:** Verification codes are logged to the console (visible in Space logs). This is fine for development but not production.

#### Server

Server-side configuration:

| Setting | Description | Default |
|---------|-------------|---------|
| Default Preset | Default AI model for new users | `free-best` |
| Ollama Base URL | Local Ollama server (if running) | `http://localhost:11434` |
| HF Default Model | Default model for HF Inference | `meta-llama/Llama-3.3-70B-Instruct` |
| Application URL | Public URL (used in emails) | `https://ruslanmv-medibot.hf.space` |
| Allowed Origins | CORS origins (comma-separated) | Your Vercel URL |

Changes are saved to `/data/medos-config.json` and persist across restarts.

---

## LLM Provider Setup

### How the AI Chat Works

When a user sends a message:

```
1. Emergency triage (19 patterns, instant) — bypasses LLM entirely
2. RAG context (medical knowledge base, 23 topics)
3. System prompt (WHO/CDC/NHS guidelines, user's language + country)
4. LLM provider chain:
   a. OllaBridge (if configured) — custom gateway
   b. HuggingFace Inference — 9-model cascade
   c. Cached FAQ (always works) — 15 pre-built answers
```

### HuggingFace Token Requirements

The `HF_TOKEN` secret on the MediBot Space needs **"Make calls to Inference Providers"** permission:

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained)
2. Create a **Fine-grained** token
3. Check **"Make calls to Inference Providers"**
4. Copy the token
5. Set it as `HF_TOKEN` in MediBot Space settings

### Testing LLM Health

**From the Admin Panel:**
Admin → LLM tab → "Test All Providers"

**From the command line:**
```bash
HF_TOKEN=hf_xxx python scripts/check-llm-health.py
```

**Output:**
```
  OK   Llama-3.3-70B-Instruct                640ms  OK
  OK   Qwen2.5-72B-Instruct                 1366ms  OK
  OK   Qwen3-235B-A22B                      1785ms  OK
  OK   gemma-3-27b-it                        951ms  OK
  FAIL Llama-3.3-70B-Instruct:sambanova     2549ms  402 Payment Required

Summary: 12/13 models online (1 degraded)
```

### Adding a Custom OllaBridge Gateway

If you run your own LLM server:

```bash
# Set in HF Space settings
OLLABRIDGE_URL=https://your-server.com
OLLABRIDGE_API_KEY=sk-your-key
```

OllaBridge is tried FIRST in the fallback chain, before HuggingFace.

---

## Email (SMTP) Configuration

### Quick Setup (Gmail)

1. Enable 2FA on your Google account
2. Generate an app password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. In MedOS Admin → Email tab:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `your.email@gmail.com`
   - Password: (the app password from step 2)
   - From: `MedOS <your.email@gmail.com>`
4. Click **Save Configuration**

### Other Providers

| Provider | Host | Port |
|----------|------|------|
| Gmail | `smtp.gmail.com` | 587 |
| Outlook | `smtp.office365.com` | 587 |
| SendGrid | `smtp.sendgrid.net` | 587 |
| AWS SES | `email-smtp.us-east-1.amazonaws.com` | 587 |
| Mailgun | `smtp.mailgun.org` | 587 |

### What Emails Are Sent

| Email | When | Expiry |
|-------|------|--------|
| Verification code | User registers | 15 minutes |
| Password reset code | User clicks "Forgot password" | 1 hour |
| Welcome email | After email verification | N/A |

### Dev Mode (No SMTP)

If SMTP is not configured, all verification codes are **logged to the console**. Check Space logs:

```
[EMAIL] To: user@example.com
[EMAIL] Subject: MedOS — verify your email
[EMAIL] Body: Your verification code is: 847291
```

---

## Medicine Scanner Setup

### How the Scanner Works on Each Platform

| Platform | Behavior |
|----------|----------|
| **Desktop (Chrome/Firefox/Edge)** | Live webcam preview inside modal with viewfinder overlay. User positions medicine, clicks "Capture". Falls back to file upload if webcam not available. |
| **Android** | Opens native camera app directly. Photo is sent to AI immediately. |
| **iPhone/iPad** | Opens native camera app directly. Same as Android. |

### Webcam Permissions

For the desktop webcam to work:
- The site must be served over **HTTPS** (required by browsers for `getUserMedia`)
- User must **allow camera access** when prompted
- `Permissions-Policy: camera=(self)` header is already set

### Token Requirements

The Medicine Scanner Space needs a HuggingFace token with **"Make calls to Inference Providers"** permission (same as LLM chat).

Set it as `HF_TOKEN` in the Medicine-Scanner Space settings.

### Models Used

| Model | Purpose | Fallback |
|-------|---------|----------|
| Qwen/Qwen2.5-VL-72B-Instruct | Primary (best quality) | → |
| google/gemma-3-27b-it | Fallback | N/A |

### How It Works

```
User takes photo → MedOS frontend
    → POST /api/scan (MediBot proxy)
    → POST /api/scan (Scanner Space)
    → Encode image as base64
    → Send to Qwen2.5-VL-72B with extraction prompt
    → Parse JSON response
    → Return: name, dose, form, category, expiry, instructions
```

---

## Nearby Finder Setup

### No Configuration Needed

MetaEngine-Nearby uses free APIs — no tokens or secrets required:
- **OpenStreetMap Overpass API** — pharmacy/doctor location data
- **Nominatim** — geocoding (city name → coordinates) and reverse geocoding

### How It Works

```
User enters location → MedOS frontend
    → POST /api/nearby (MediBot proxy)
    → POST /gradio_api/call/search_ui (MetaEngine Space)
    → Query Overpass API for pharmacies/doctors within radius
    → Calculate distance, ETA (walk/drive)
    → Generate Google Maps directions URLs
    → Return sorted results
```

### Overpass API Limits

- Free, no API key
- Rate limit: ~10,000 requests/day (shared)
- Timeout: 25 seconds per query
- If Overpass is slow, results may be empty — retry helps

---

## Environment Variables Reference

### MediBot Space

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HF_TOKEN` | Yes | — | HuggingFace token (inference + write) |
| `DB_PATH` | No | `/data/medos.db` | SQLite database path |
| `ADMIN_EMAIL` | No | `admin@medos.health` | Default admin email |
| `ADMIN_PASSWORD` | No | `admin123456` | Default admin password |
| `SMTP_HOST` | No | — | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `FROM_EMAIL` | No | `MedOS <noreply@medos.health>` | Sender email |
| `APP_URL` | No | `https://ruslanmv-medibot.hf.space` | Public URL |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins |
| `NEARBY_URL` | No | `https://ruslanmv-metaengine-nearby.hf.space` | Nearby finder URL |
| `SCANNER_URL` | No | `https://ruslanmv-medicine-scanner.hf.space` | Scanner URL |
| `HF_TOKEN_INFERENCE` | No | — | Inference token for scanner proxy |
| `OLLABRIDGE_URL` | No | — | Custom OllaBridge gateway URL |
| `OLLABRIDGE_API_KEY` | No | — | OllaBridge API key |
| `DEFAULT_PRESET` | No | `free-best` | Default AI model preset |

### Medicine Scanner Space

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HF_TOKEN` | Yes | — | Token with inference permissions |

### MetaEngine Nearby Space

No environment variables needed. Uses free OpenStreetMap APIs.

### Vercel Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | `https://ruslanmv-medibot.hf.space` | MediBot Space URL |

---

## Troubleshooting

### "All models failed" in chat

1. Go to Admin → LLM tab → Test All Providers
2. If all models show red: your `HF_TOKEN` doesn't have inference permissions
3. Fix: Create a new token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained)
4. Update the `HF_TOKEN` secret in MediBot Space settings

### Medicine Scanner shows "Scan failed"

1. Check the Scanner Space is running: visit [huggingface.co/spaces/ruslanmv/Medicine-Scanner](https://huggingface.co/spaces/ruslanmv/Medicine-Scanner)
2. If sleeping, any request will wake it (takes ~30 seconds)
3. Check `HF_TOKEN` secret is set with inference permissions

### Nearby search returns no results

1. Check MetaEngine Space is running: visit [huggingface.co/spaces/ruslanmv/MetaEngine-Nearby](https://huggingface.co/spaces/ruslanmv/MetaEngine-Nearby)
2. Overpass API may be slow — retry after a few seconds
3. Try a different location (some areas have fewer OSM entries)

### Chat returns 504 on Vercel (ai-medical-chabot.com)

This happens when the MediBot Space is sleeping and the Vercel proxy times out waiting for it to wake.

**Fixes:**
1. `vercel.json` sets `maxDuration: 60` (increased from 30s)
2. If still timing out, wake MediBot first: visit [huggingface.co/spaces/ruslanmv/MediBot](https://huggingface.co/spaces/ruslanmv/MediBot) and wait ~30s
3. For always-on, upgrade the MediBot HF Space to a paid plan

**Why it happens:**
- Vercel proxy → MediBot (sleeping, 30s cold start) → LLM (5-10s) = 40s total
- Vercel free tier allows max 60s per function call

### Desktop webcam not working in scanner

1. Ensure the site is served over **HTTPS** (browsers block `getUserMedia` on HTTP)
2. User must click "Allow" on the camera permission prompt
3. If webcam is blocked, the scanner shows "Upload photo" as fallback
4. Check browser settings: Settings → Privacy → Camera → allow your domain

### Email verification codes not received

1. Check Admin → Email tab — is SMTP configured?
2. If not configured, codes appear in Space logs (Container tab)
3. For Gmail: use an app password, not your login password
4. Check spam folder

### Space shows "Building" or "Error"

1. Check Space logs at `huggingface.co/spaces/ruslanmv/SpaceName` → Logs tab
2. Common issues:
   - Missing `HF_TOKEN` secret → auth errors
   - Dependency conflict → check requirements.txt
   - Port mismatch → ensure app runs on port 7860

### Admin panel not visible

1. You must be logged in as an admin user
2. Default admin: `admin@medos.health` / `admin123456`
3. The Admin section only appears in the **desktop sidebar** (not mobile drawer for security)
4. If the admin account doesn't exist, restart the Space (it auto-seeds on startup)

### HF Space goes to sleep

Free-tier HF Spaces sleep after ~15 minutes of inactivity.
- Any request wakes them automatically (~30-60 seconds)
- The MedOS frontend shows "waking up" status during this time
- For always-on, upgrade to a paid HF Space plan

### Database reset

If you need to reset the database:
1. Delete the persistent storage in Space settings
2. Restart the Space
3. The database will be recreated with a fresh admin account

---

## GitHub Actions (CI/CD)

Automated deployment is configured via GitHub workflows:

| Workflow | Trigger | Space |
|----------|---------|-------|
| `deploy-medibot.yml` | Push to `main` (changes in `9-HuggingFace-Global/` or `web/`) | MediBot |
| `deploy-medicine-scanner.yml` | Push to `main` (changes in `11-Medicine-Scanner/`) | Medicine-Scanner |
| `deploy-metaengine-nearby.yml` | Push to `main` (changes in `12-MetaEngine-Nearby/`) | MetaEngine-Nearby |
| `ci-medos-global.yml` | Push to any branch | Runs 88 tests + build |

### GitHub Secrets Required

Set these in **GitHub → Settings → Secrets → Actions**:

| Secret | Value |
|--------|-------|
| `HF_TOKEN` | HuggingFace write token |
| `HF_USERNAME` | `ruslanmv` (your HF username) |
| `HF_TOKEN_INFERENCE` | Token with inference permissions (for scanner) |

### Manual Deployment

All Spaces can also be deployed manually:

```bash
# MediBot
HF_TOKEN=hf_xxx bash 9-HuggingFace-Global/scripts/deploy-hf.sh

# Medicine Scanner
HF_TOKEN=hf_xxx bash 11-Medicine-Scanner/deploy-scanner.sh

# MetaEngine Nearby
HF_TOKEN=hf_xxx bash 12-MetaEngine-Nearby/deploy-nearby.sh
```

---

## Security Notes

- Default admin password MUST be changed after first login
- `HF_TOKEN` should have minimal required permissions
- Rate limiting is active on login (10/min) and register (5/min)
- Account deletion is admin-only (prevents data destruction attacks)
- Health data is stored in SQLite with CASCADE deletes
- CSP headers restrict script/connect sources
- All auth cookies are httpOnly with SameSite=Lax

---

*Last updated: April 2026*
*MedOS v1.0 — Free & Open Source*
