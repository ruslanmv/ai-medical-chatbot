# MedOS - Enterprise Medical AI Chatbot

A production-ready, enterprise-grade medical AI assistant built with Next.js 14, featuring multi-provider support, real-time streaming, and a beautiful patient-centric UI.

## 🌟 Features

### Enterprise-Grade Architecture
- **Multi-Provider AI Support**: OpenAI (GPT-4), Google (Gemini 1.5), Anthropic (Claude 3.5), IBM watsonx, Ollama
- **Real-Time Streaming**: ChatGPT-style token-by-token responses
- **BYOK (Bring Your Own Key)**: Users supply their own API keys - no server-side storage
- **End-to-End Encryption**: All data stored locally in browser
- **Production-Ready**: Optimized for Vercel deployment with security headers

### Patient-Centric UI
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Accessibility**: WCAG 2.1 compliant with semantic HTML
- **Real-Time Vitals**: Mock health monitoring dashboard
- **Schedule Management**: Medication reminders and appointments
- **Health Records**: Secure document management interface

### Security & Compliance
- **No Server-Side Key Storage**: API keys never leave the browser
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Medical Disclaimers**: Prominent warnings about AI limitations
- **Emergency Protocols**: Quick access to emergency services

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17.0 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ruslanmv/ai-medical-chatbot.git
cd ai-medical-chatbot/web

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ruslanmv/ai-medical-chatbot/tree/main/web)

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd web
   vercel
   ```

4. **Set Root Directory**
   - In Vercel dashboard, go to Project Settings
   - Set "Root Directory" to `web`
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Environment Variables

**No environment variables are required!** Users bring their own API keys through the Settings UI.

## 🏗️ Architecture

### Project Structure

```
web/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # Streaming chat endpoint
│   │   └── verify/route.ts     # API key verification
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
├── components/
│   ├── chat/
│   │   ├── NavItem.tsx         # Navigation item component
│   │   ├── MessageBubble.tsx   # Chat message component
│   │   ├── Toggle.tsx          # Toggle switch component
│   │   ├── Sidebar.tsx         # Left sidebar navigation
│   │   └── RightPanel.tsx      # Right vitals panel
│   ├── views/
│   │   ├── ChatView.tsx        # Main chat interface
│   │   ├── SettingsView.tsx    # Settings & provider config
│   │   ├── RecordsView.tsx     # Health records
│   │   ├── ScheduleView.tsx    # Calendar & tasks
│   │   └── HistoryView.tsx     # Consultation history
│   └── MedOSApp.tsx            # Main app component
├── lib/
│   ├── providers/
│   │   ├── openai.ts           # OpenAI integration
│   │   ├── gemini.ts           # Google Gemini integration
│   │   ├── anthropic.ts        # Claude integration
│   │   └── index.ts            # Provider abstraction
│   ├── hooks/
│   │   ├── useSettings.ts      # Settings management
│   │   └── useChat.ts          # Chat state management
│   ├── types.ts                # TypeScript definitions
│   └── utils.ts                # Utility functions
└── public/                     # Static assets
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI SDKs**: OpenAI, Google Generative AI, Anthropic
- **Validation**: Zod
- **Deployment**: Vercel

## 🔌 AI Provider Integration

### Supported Providers

1. **OpenAI (GPT-4)**
   - Model: `gpt-4o-mini`
   - Get API key: [platform.openai.com](https://platform.openai.com)

2. **Google (Gemini)**
   - Model: `gemini-1.5-flash`
   - Get API key: [aistudio.google.com](https://aistudio.google.com)

3. **Anthropic (Claude)**
   - Model: `claude-3-5-haiku-latest`
   - Get API key: [console.anthropic.com](https://console.anthropic.com)

4. **IBM watsonx** (Coming Soon)
5. **Ollama** (Local - Coming Soon)

### Adding Your API Key

1. Navigate to **Settings** in the app
2. Select your preferred **LLM Backend**
3. Enter your **API Secret Key**
4. Click **Verify Connection** to test
5. Start chatting!

## 🎨 Customization

### Theme Colors

Edit `tailwind.config.ts` to customize the color palette:

```typescript
theme: {
  extend: {
    colors: {
      // Your custom colors
    }
  }
}
```

### System Prompt

Modify the medical AI behavior in each provider file:

- `lib/providers/openai.ts`
- `lib/providers/gemini.ts`
- `lib/providers/anthropic.ts`

Look for the `SYSTEM_PROMPT` constant.

## 📊 Performance

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Streaming Latency**: Real-time token delivery

## 🔐 Security

### Headers
All security headers are configured in `next.config.js`:
- HSTS (Strict-Transport-Security)
- X-Content-Type-Options
- X-Frame-Options
- CSP (Content Security Policy)

### Data Privacy
- API keys stored in browser `localStorage` only
- No server-side logging of keys
- No external analytics by default
- GDPR/HIPAA-ready architecture

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build
```

## 📝 API Routes

### POST /api/chat
Streams AI responses token-by-token.

**Request:**
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

**Response:**
```
data: {"content":"Hello"}
data: {"content":" there"}
data: [DONE]
```

### POST /api/verify
Verifies API key validity.

**Request:**
```json
{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection verified successfully"
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Medical Disclaimer

This is a demonstration application. **DO NOT use for actual medical diagnosis or treatment.** Always consult qualified healthcare professionals for medical advice.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Google for Gemini
- Anthropic for Claude
- Vercel for hosting platform
- Tailwind CSS team
- Next.js team

## 📧 Support

- GitHub Issues: [github.com/ruslanmv/ai-medical-chatbot/issues](https://github.com/ruslanmv/ai-medical-chatbot/issues)
- Documentation: [github.com/ruslanmv/ai-medical-chatbot](https://github.com/ruslanmv/ai-medical-chatbot)

---

**Built with ❤️ for healthcare innovation**
