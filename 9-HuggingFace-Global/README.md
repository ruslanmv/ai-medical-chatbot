---
title: "MediBot: Free AI Medical Assistant · 20 languages"
emoji: "\U0001F3E5"
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: true
license: apache-2.0
short_description: "Free AI medical chatbot. 20 languages. No sign-up."
tags:
  - medical
  - healthcare
  - chatbot
  - medical-ai
  - health-assistant
  - symptom-checker
  - telemedicine
  - who-guidelines
  - cdc
  - multilingual
  - i18n
  - rag
  - llama-3.3
  - llama-3.3-70b
  - mixtral
  - groq
  - huggingface-inference
  - pwa
  - offline-first
  - free
  - no-signup
  - privacy-first
  - worldwide
  - nextjs
  - docker
models:
  - meta-llama/Llama-3.3-70B-Instruct
  - meta-llama/Meta-Llama-3-8B-Instruct
  - mistralai/Mixtral-8x7B-Instruct-v0.1
  - Qwen/Qwen2.5-72B-Instruct
  - deepseek-ai/DeepSeek-V3
  - ruslanmv/Medical-Llama3-8B
  - google/gemma-2-9b-it
datasets:
  - ruslanmv/ai-medical-chatbot
---

# MediBot — free AI medical assistant, worldwide

> **Tell MediBot what's bothering you. In your language. Instantly. For free.**
> No sign-up. No paywall. No data retention. Aligned with WHO · CDC · NHS guidelines.

[![Try MediBot](https://img.shields.io/badge/Try_MediBot-Free_on_HuggingFace-blue?style=for-the-badge&logo=huggingface)](https://huggingface.co/spaces/ruslanmv/MediBot)
[![Languages](https://img.shields.io/badge/languages-20-14B8A6?style=for-the-badge)](#)
[![Free](https://img.shields.io/badge/price-free_forever-22C55E?style=for-the-badge)](#)
[![No sign-up](https://img.shields.io/badge/account-not_required-3B82F6?style=for-the-badge)](#)

## Why MediBot

- **Free forever.** No API key, no sign-up, no paywall, no ads.
- **20 languages, auto-detected.** English, Español, Français, Português, Deutsch, Italiano, العربية, हिन्दी, Kiswahili, 中文, 日本語, 한국어, Русский, Türkçe, Tiếng Việt, ไทย, বাংলা, اردو, Polski, Nederlands.
- **Worldwide.** IP-based country detection picks your local emergency number (190+ countries) and adapts the answer to your region (°C/°F, metric/imperial, local guidance).
- **Best free LLM on HuggingFace.** Powered by **Llama 3.3 70B via HF Inference Providers (Groq)** — fastest high-quality free tier available — with an automatic fallback chain across Cerebras, SambaNova, Together, and Mixtral.
- **Grounded on WHO, CDC, NHS, NIH, ICD-11, BNF, EMA.** A structured system prompt aligns every answer with authoritative guidance.
- **Red-flag triage.** Built-in symptom patterns detect cardiac, neurological, respiratory, obstetric, pediatric, and mental-health emergencies in every supported language — and immediately escalate to the local emergency number.
- **Installable PWA.** Add to your phone's home screen and use it like a native app. Offline-capable with a cached FAQ fallback.
- **Shareable.** Every AI answer gets a Share button that generates a clean deep link with a branded OG card preview — perfect for WhatsApp, Twitter, and Telegram.
- **Private & anonymous.** Zero accounts. Zero server-side conversation storage. No IPs logged. Anonymous session counter only.
- **Open source.** Fully transparent. [github.com/ruslanmv/ai-medical-chatbot](https://github.com/ruslanmv/ai-medical-chatbot)

## How it works

1. You type (or speak) a health question
2. MedOS checks for emergency red flags first
3. It searches a medical knowledge base for relevant context
4. Your question + context go to **Llama 3.3 70B** (via Groq, free)
5. You get a structured answer: Summary, Possible causes, Self-care, When to see a doctor

If the main model is busy, MedOS automatically tries other free models until one responds.

## Built with

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS |
| AI Model | Llama 3.3 70B Instruct (via HuggingFace Inference + Groq) |
| Fallbacks | Mixtral 8x7B, OllaBridge, cached FAQ |
| Knowledge | Medical RAG from [ruslanmv/ai-medical-chatbot](https://github.com/ruslanmv/ai-medical-chatbot) dataset |
| Gateway | [OllaBridge-Cloud](https://github.com/ruslanmv/ollabridge) |
| Hosting | HuggingFace Spaces (Docker) |

## License

Apache 2.0 — free to use, modify, and distribute.

## MedOS Family family mode

This branch adds an additive first version of the MedOS Family family layer:

- `lib/family-health.ts` — local-first family tree, MedOS modes, invites, monthly records
- `lib/hooks/useFamilyHealth.ts` — React hook for family state
- `components/views/FamilyHealthView.tsx` — Family Admin / MedOS Family dashboard
- Sidebar integration through the new **MedOS Family** navigation item

The MVP keeps data local-first and prepares for the contracts documented in `../13-MedOS-Family/02-contracts/`.
