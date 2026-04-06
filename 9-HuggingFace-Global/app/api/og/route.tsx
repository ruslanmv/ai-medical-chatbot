import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Dynamic Open Graph image endpoint.
 *
 * Every share on Twitter / WhatsApp / LinkedIn / Telegram / iMessage
 * renders a branded 1200x630 card. The query becomes the card title so
 * a link like `https://ruslanmv-medibot.hf.space/?q=chest+pain` previews
 * as a premium, unique image instead of the default favicon blob.
 *
 * Usage from the client: `/api/og?q=<question>&lang=<code>`
 * The endpoint also handles missing parameters gracefully (returns a
 * default brand card).
 */
export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get('q') || '').trim();
    const lang = (searchParams.get('lang') || 'en').slice(0, 5);

    // Hard-limit title length so long queries don't overflow.
    const title =
      rawQuery.length > 120 ? rawQuery.slice(0, 117) + '…' : rawQuery;

    const subtitle = title
      ? 'Ask MedOS — free, private, in your language'
      : 'Free AI medical assistant — 20 languages, no sign-up';

    const headline = title || 'Tell me what\'s bothering you.';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '72px',
            background:
              'radial-gradient(1200px 800px at 10% -10%, rgba(59,130,246,0.35), transparent 60%),' +
              'radial-gradient(1000px 600px at 110% 10%, rgba(20,184,166,0.30), transparent 60%),' +
              'linear-gradient(180deg, #0B1220 0%, #0E1627 100%)',
            color: '#F8FAFC',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          {/* Top bar: brand mark + language chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '48px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '22px',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '44px',
                  boxShadow: '0 20px 60px -10px rgba(59,130,246,0.65)',
                }}
              >
                ♥
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: '40px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  MedOS
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    color: '#14B8A6',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    marginTop: '6px',
                  }}
                >
                  Worldwide medical AI
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 18px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                fontSize: '18px',
                color: '#CBD5E1',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '9999px',
                  background: '#22C55E',
                }}
              />
              {lang.toUpperCase()} · FREE · NO SIGN-UP
            </div>
          </div>

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {title && (
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#14B8A6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  marginBottom: '22px',
                }}
              >
                Ask MedOS
              </div>
            )}
            <div
              style={{
                fontSize: title ? '68px' : '84px',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: '#F8FAFC',
                maxWidth: '1000px',
              }}
            >
              {title ? `"${headline}"` : headline}
            </div>
            <div
              style={{
                fontSize: '26px',
                color: '#94A3B8',
                marginTop: '28px',
                fontWeight: 500,
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Footer: trust strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
              fontSize: '18px',
              color: '#94A3B8',
              fontWeight: 600,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '28px',
            }}
          >
            <span style={{ color: '#14B8A6', fontWeight: 700 }}>
              ✓ Aligned with WHO · CDC · NHS
            </span>
            <span>·</span>
            <span>Private &amp; anonymous</span>
            <span>·</span>
            <span>24/7</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch {
    // Never 500 an OG endpoint — social crawlers will blacklist the domain.
    return new Response('OG image generation failed', { status: 500 });
  }
}
