# Deployment Guide - MedOS on Vercel

This guide will walk you through deploying MedOS to Vercel in under 5 minutes.

## Prerequisites

- GitHub account
- Vercel account (free tier is sufficient)
- Git installed locally

## Method 1: Deploy via GitHub (Recommended)

### Step 1: Push to GitHub

```bash
# From the root of ai-medical-chatbot
git add .
git commit -m "Add MedOS web application"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `ai-medical-chatbot` repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
5. Click "Deploy"

### Step 3: Wait for Build

Vercel will automatically:
- Install dependencies
- Build your Next.js app
- Deploy to a production URL
- Enable automatic deployments for future commits

**Done!** Your app is live at `https://your-project.vercel.app`

## Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
cd web
vercel
```

Follow the prompts:
- **Set up and deploy "~/ai-medical-chatbot/web"?** Yes
- **Which scope?** Select your account
- **Link to existing project?** No
- **What's your project's name?** medos (or your choice)
- **In which directory is your code located?** ./

### Step 4: Production Deployment

```bash
vercel --prod
```

## Method 3: One-Click Deploy

Click this button to deploy directly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ruslanmv/ai-medical-chatbot/tree/main/web)

## Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Enable automatic HTTPS

### Performance Optimization

Your app is already optimized with:
- ✅ Automatic image optimization
- ✅ Edge caching
- ✅ Brotli compression
- ✅ HTTP/2 push
- ✅ Smart CDN routing

### Analytics (Optional)

Enable Vercel Analytics:

1. Go to "Analytics" tab in Vercel Dashboard
2. Click "Enable Analytics"
3. Free for up to 100k data points/month

## Monitoring & Logs

### View Logs

1. Go to your project in Vercel
2. Click "Deployments"
3. Select a deployment
4. View "Function Logs" tab

### Error Monitoring

Vercel automatically captures:
- Runtime errors
- Build errors
- Function timeouts
- 404s and 500s

## Environment Variables (Future Use)

If you need to add environment variables:

1. Go to "Settings" → "Environment Variables"
2. Add key-value pairs
3. Redeploy to apply changes

**Note**: Currently, MedOS requires no environment variables!

## Troubleshooting

### Build Fails

**Error**: `Cannot find module`
- **Solution**: Ensure all dependencies are in `package.json`
- Run `npm install` locally to test

**Error**: `Type error`
- **Solution**: Run `npm run type-check` locally
- Fix TypeScript errors before pushing

### Function Timeout

**Error**: `Function execution timed out`
- **Solution**: Increase timeout in `vercel.json`:
  ```json
  {
    "functions": {
      "app/api/**/*.ts": {
        "maxDuration": 60
      }
    }
  }
  ```

### Streaming Not Working

**Error**: Responses not streaming
- **Solution**: Ensure you're using Server-Sent Events (SSE)
- Check network tab for `text/event-stream` content type

## Performance Best Practices

### 1. Enable ISR (Incremental Static Regeneration)

For static pages, add in page component:

```typescript
export const revalidate = 3600; // Revalidate every hour
```

### 2. Optimize Images

Use Next.js `<Image>` component:

```typescript
import Image from 'next/image';

<Image src="/hero.jpg" alt="Hero" width={800} height={600} />
```

### 3. Enable Compression

Already enabled by default in `next.config.js`:

```javascript
compress: true
```

## Security Checklist

- ✅ Security headers configured (`next.config.js`)
- ✅ No secrets in client-side code
- ✅ API routes use proper validation (Zod)
- ✅ HTTPS enforced
- ✅ CORS properly configured

## Scaling

### Free Tier Limits
- 100 GB bandwidth/month
- Unlimited requests
- 100 hours serverless function execution
- 6,000 build minutes

### Pro Tier ($20/month)
- 1 TB bandwidth
- Unlimited everything else
- Advanced analytics
- DDoS protection

## Rolling Back

If something goes wrong:

1. Go to "Deployments" in Vercel Dashboard
2. Find a previous working deployment
3. Click "..." → "Promote to Production"

## CI/CD Pipeline

Vercel automatically sets up CI/CD:

- **Push to `main`** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull requests** → Automatic preview URLs

## Custom Build Configuration

### Build Caching

Vercel caches `node_modules` by default. To clear:

```bash
vercel --force
```

### Custom Build Script

Edit `vercel.json`:

```json
{
  "buildCommand": "npm run build && npm run post-build"
}
```

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

## Success Metrics

After deployment, check:

- ✅ All pages load correctly
- ✅ Chat streaming works
- ✅ Settings save/load from localStorage
- ✅ API key verification works
- ✅ Mobile responsive
- ✅ Lighthouse score > 90

---

**Congratulations! Your MedOS application is now live on Vercel.** 🎉

Share your deployment URL with users and start collecting feedback!
