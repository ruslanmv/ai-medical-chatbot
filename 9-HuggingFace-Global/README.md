---
title: MediBot - Free AI Medical Assistant
emoji: "\U0001F3E5"
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: true
tags:
  - medical
  - healthcare
  - chatbot
  - nextjs
  - multilingual
  - pwa
  - text-generation
  - rag
  - ollabridge
short_description: "Free AI medical chatbot. 20 languages. No sign-up."
models:
  - mistralai/Mixtral-8x7B-Instruct-v0.1
  - meta-llama/Meta-Llama-3-8B-Instruct
  - ruslanmv/Medical-Llama3-8B
  - google/gemma-2-9b-it
datasets:
  - ruslanmv/ai-medical-chatbot
---

# MediBot - Free AI Medical Assistant

A premium, mobile-first AI medical chatbot available to everyone worldwide — completely free, no sign-up required.

## Features

- **Zero Friction**: No API keys, no sign-up, no paywall
- **20 Languages**: Auto-detects your language (covers 95%+ of world population)
- **Mobile PWA**: Install on your phone like a native app
- **Voice I/O**: Speak your question, hear the answer
- **Offline Mode**: Top 500 medical Q&As cached for offline use
- **Emergency Triage**: Detects emergencies and shows your local emergency number (190+ countries)
- **Region-Aware**: Prioritizes health topics relevant to your region
- **Shareable**: WhatsApp, Telegram, QR codes, embeddable iframe
- **Open Source**: Fully transparent, community-driven

## Architecture

```
User (Browser/Mobile PWA)
  |
  v
MedOS UI (Next.js 14 on HF Spaces)
  |
  |--> Safety Filter (emergency detection)
  |--> RAG Search (medical knowledge base)
  |
  v
OllaBridge-Cloud (Smart LLM Gateway)
  |
  |--> Google Gemini (free)
  |--> Groq (free, fastest)
  |--> OpenRouter (free models)
  |--> HuggingFace Inference (free)
  |--> Local Ollama (fallback)
```

## Powered By

- [OllaBridge-Cloud](https://github.com/ruslanmv/ollabridge) — Multi-provider LLM gateway
- [AI Medical Chatbot](https://github.com/ruslanmv/ai-medical-chatbot) — Medical RAG knowledge base

## License

Apache 2.0
