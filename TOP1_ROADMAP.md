# 🏥 Road to #1 Medical Chatbot on HuggingFace — MedOS/MediBot

> Strategy document and execution log for turning the MediBot HF Space into
> the most-liked medical chatbot on HuggingFace, worldwide.

---

## 0. Current state (April 2026)

| Metric | Value |
|---|---|
| MediBot likes | 0 (brand new Space) |
| HF #1 medical chatbot | `ruslanmv/AI-Medical-Chatbot` — **15 likes**, runtime error |
| HF #2 | `ruslanmv/AI-Medical-Llama3-Chatbot` — **14 likes**, Running on Zero |
| HF #3 | `AventIQ-AI/T5-Medical-Chatbot` — 4 likes |
| HF medical-chatbot Spaces total | 399 |
| Hardware | `cpu-basic`, 1 replica |
| Bar to beat | **~16–20 likes** |

**Bar is low. Field is winnable.** Two of the top three slots are owned by the
same author's older broken spaces. A single good Twitter thread or Product
Hunt launch can clear the bar.

---

## 1. What's live after this commit (P0 — shipped)

1. **LLM upgrade** — HF direct provider now uses **Llama 3.3 70B via Groq**
   through the HF Inference Providers OpenAI-compatible router, with
   automatic fallback. Biggest perceived-quality jump possible without
   changing hardware.
2. **Structured medical knowledge scaffold** (`lib/medical-knowledge.ts`)
   injected as the system prompt in `/api/chat`, grounding every answer
   in WHO · CDC · NHS · NIH · ICD-11 · BNF · EMA guidance and localizing
   to the user's country, language, and measurement system.
3. **IP-based geo detection** (`/api/geo`) — platform headers first,
   ipapi.co fallback, zero PII storage.
4. **Dynamic Open Graph image** (`/api/og`) — every share on Twitter,
   WhatsApp, Telegram, LinkedIn, iMessage renders a premium 1200×630
   brand card with the user's question as the title. Built with Next's
   native `ImageResponse` (no new dependency).
5. **Shareable deep links** — every AI answer has a Share button; mobile
   uses the Web Share API, desktop copies a `/?q=<question>` URL.
6. **URL query prefill** — visiting `/?q=headache+for+3+days` auto-fills
   and sends the question on mount, then strips the param so refresh
   doesn't re-send.
7. **Follow-up suggestion chips** after every AI answer (*Tell me more*,
   *What causes this?*, *Should I see a doctor?*, *How can I prevent it?*)
   — deepens session length for free.
8. **Rotating empathetic placeholders** in the input ("I have chest pain
   since this morning…", "My child has a fever of 39 °C…", "I've had a
   headache for three days…", "Is this medication safe with pregnancy?",
   "I feel anxious and can't sleep…").
9. **PWA manifest polish** — shortcuts (Ask / Emergency / Topics),
   screenshots, maskable icons, `id`, `display_override`.
10. **JSON-LD structured data** (MedicalWebPage + SoftwareApplication +
    Organization) on the root layout for Google rich results.
11. **HF Space README metadata rewrite** — tighter, higher-converting
    tagline, 25 targeted tags, richer `models:` + `datasets:` cross-links,
    license, bolder colors.

---

## 2. P1 — next commit (green-light and I'll ship)

### Product
1. **Full viral UI port** from `web/` into `9-HuggingFace-Global/`:
   - Hero input with glow + auto-grow textarea
   - Trust bar ("Aligned with WHO · CDC · NHS")
   - Message bubbles as structured cards with source chip + section rails
   - Brand-gradient header and sticky pulsing emergency CTA
   - Dark-mode compatibility layer
2. **Per-message "Listen" button** (TTS) — huge in global-south /
   low-literacy markets.
3. **Confidence indicator** on AI answers (low / medium / high from
   response heuristics: presence of "might", "possible", hedge words).
4. **Inline citation chips** linking to WHO/CDC/NHS pages for the
   mentioned topic.
5. **Install-PWA prompt** — custom banner after 2nd session.
6. **Welcome screen** on first visit with explicit consent for geo
   detection + language confirmation.

### Discoverability & SEO
7. **Static symptom landing pages** (`/symptoms/[slug]`) pre-rendered
   with `FAQPage` JSON-LD. ~50 common symptoms → 50 SEO entry points.
   Biggest long-tail organic channel.
8. **`sitemap.xml` + `robots.txt`** route handlers.
9. **Multilingual alternates** (`hreflang`) on the 20 supported languages.
10. **Social proof counter** — "Helped N people in M languages today"
    driven by the existing `anonymous-tracker.ts`.

### Analytics
11. **Privacy-friendly analytics beacon** (Plausible or self-hosted) so
    we can see what's working without collecting PII.
12. **Funnel tracking**: share-click → return-visit → install.

---

## 3. P2 — future

- **Real FAISS RAG** on HF Zero-GPU with a medical embedding model
  (BGE-medical, MedCPT); upgrade `lib/rag/` from keyword to vector.
- **Multimodal input** — photo of a rash, medication box, or lab result.
- **WhatsApp bot bridge** via the Cloud API. Single biggest distribution
  channel in Global South. One deep link → instant conversation.
- **Telegram bot bridge** (same infra).
- **Native mobile wrappers** via Capacitor (single codebase → iOS + Android).
- **Clinician review mode** — a second pane that shows the medical
  reasoning with citations for healthcare professionals.
- **A/B testing harness** on hero copy and share CTAs.
- **Partnership pilots** with NGOs (WHO, UNICEF, MSF) for trust
  amplification.

---

## 4. Launch collateral (ready to post)

### 4.1 HuggingFace Community post (to be posted in the Space's
"Community" tab, which emails all the author's followers)

> **Title:** MediBot is now powered by Llama 3.3 70B (Groq) — free, 20 languages, WHO-aligned
>
> Hey everyone 👋
>
> Big update for MediBot today:
>
> - 🚀 Upgraded the default model to **Llama 3.3 70B Instruct via HF
>   Inference Providers + Groq**. Sub-second TTFT, higher quality than
>   the Mixtral 8x7B we were serving before.
> - 🌍 **Auto-detects your country and language** from your IP (platform
>   headers, no external call in most cases) and adapts the answer: local
>   emergency number, °C vs °F, metric vs imperial.
> - 🏥 **Structured medical knowledge scaffold** aligned with WHO, CDC,
>   NHS, NIH, ICD-11, BNF, EMA. Every answer follows a Summary → Possible
>   causes → Self-care → When to seek care → Red flags → Disclaimer
>   structure.
> - 🔗 **Shareable answer links.** Hit Share on any answer and you get a
>   clean URL with a branded OG preview that looks premium on Twitter,
>   WhatsApp, and Telegram.
> - 🛡️ Still 100% free, no sign-up, no paywall, no data retention.
>
> Try it: https://huggingface.co/spaces/ruslanmv/MediBot
>
> Would love your feedback, and a ❤️ on the Space if you find it useful —
> it really does help with HF discoverability. 🙏

### 4.2 Twitter / X launch thread

```
1/ I just shipped the biggest update to MediBot —
   a free AI medical assistant on HuggingFace
   that speaks 20 languages, works worldwide,
   and needs zero sign-up.

   https://huggingface.co/spaces/ruslanmv/MediBot

   Here's what's new 🧵

2/ Powered by Llama 3.3 70B via @GroqInc through the
   @huggingface Inference Providers router.
   Sub-second first token. Free tier. No key needed.

3/ Auto-detects your country from IP. Picks your
   local emergency number (190+ countries), switches
   units to metric or imperial, and replies in
   YOUR language — 20 of them.

4/ Every answer is grounded in WHO, CDC, NHS, NIH,
   ICD-11, and EMA guidance. Structured output:
   Summary → Possible causes → Self-care →
   When to seek care → Red flags → Disclaimer.

5/ Red-flag triage in every language. Chest pain,
   stroke symptoms, suicidal ideation — the bot
   interrupts and routes you straight to the local
   emergency number. Patient safety first.

6/ Privacy: zero accounts, zero conversation
   storage, no IP logging. Anonymous session
   counter only. Open source: github.com/ruslanmv/ai-medical-chatbot

7/ Every AI answer has a Share button. Post it to
   Twitter / WhatsApp / Telegram and it previews
   as a premium branded card.

8/ Free forever. No paywall. No ads. Built for
   everyone, everywhere.

   Try it → https://huggingface.co/spaces/ruslanmv/MediBot

   ❤️ a like on the Space would mean the world.
```

### 4.3 Product Hunt launch

- **Tagline:** *Free AI medical assistant. 20 languages. No sign-up.*
- **First comment:** "Hi PH 👋 Ruslan here. I built MediBot because I
  wanted a medical chatbot my parents could actually use — in their
  own language, without creating an account, without paying, without
  giving up their data. It's powered by Llama 3.3 70B via HuggingFace
  Inference Providers (Groq), grounded in WHO/CDC/NHS guidance, and
  auto-detects your country to pick the right emergency number. 100%
  open source. Would love your feedback. 🙏"
- **Assets needed:** gallery screenshots (desktop dark, mobile, share
  card example), a 60-second Loom demo.
- **Best day to launch:** Tuesday 00:01 PST.

### 4.4 Reddit outreach (follow each sub's rules strictly)

- **r/huggingface** — "I built a free multilingual medical chatbot on
  HF Spaces, would love feedback" (self-promo allowed in a weekly
  thread). Link + brief description.
- **r/LocalLLaMA** — "Free medical assistant using Llama 3.3 70B via
  HF Inference Providers + Groq — full stack writeup". Include
  architecture and latency numbers.
- **r/medicine, r/AskDocs** — *Only* if moderators pre-approve; medical
  subs are strict. Position as "a free triage tool for patients" and
  emphasize that it never diagnoses.
- **r/artificial** — standard share thread.

### 4.5 HuggingFace discussion seeds

Post polite technical questions in related Space discussions (not
spammy) — builds backlinks and drives curious users to MediBot.

### 4.6 Target influencer DMs

- @_akhaliq (HF papers)
- @osanseviero (HF)
- @Thom_Wolf (HF)
- @andrewyng (DeepLearning.AI) — medical AI angle
- @EricTopol — medical AI thought leader

Short, specific DM: "Built a free WHO-aligned medical chatbot on HF
Spaces in 20 languages. Would love your take. [link]"

---

## 5. Success metrics

| Week | Likes | Sessions | MAU-equivalent |
|---|---|---|---|
| Launch | 20 | 500 | — |
| W1 | 50 | 3,000 | 1,500 |
| W4 | 200 | 25,000 | 10,000 |
| W12 | 1,000 | 200,000 | 60,000 |

If we hit 20 likes we are **#1 on HF for medical chatbots**. Everything
beyond is bonus and drives toward viral.

---

## 6. Checklist (tracking)

- [x] LLM upgraded to Llama 3.3 70B / Groq
- [x] Medical knowledge scaffold injected
- [x] IP geo detection
- [x] Dynamic OG image
- [x] Shareable deep links
- [x] URL `?q=` prefill
- [x] Follow-up chips
- [x] Rotating placeholders
- [x] PWA manifest polish
- [x] JSON-LD structured data
- [x] HF Space README metadata rewrite
- [ ] Full viral UI port into `9-HuggingFace-Global/` (P1)
- [ ] Per-message Listen / TTS (P1)
- [ ] Confidence + citation chips (P1)
- [ ] SEO symptom landing pages (P1)
- [ ] Sitemap + robots.txt + hreflang (P1)
- [ ] Social-proof counter (P1)
- [ ] Analytics beacon (P1)
- [ ] HF Community post (launch day)
- [ ] Twitter thread (launch day)
- [ ] Product Hunt (launch day)
- [ ] Reddit threads (launch day)
