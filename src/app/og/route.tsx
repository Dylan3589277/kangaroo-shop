import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'rgba(167, 139, 250, 0.1)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '112px',
              height: '112px',
              borderRadius: '28px',
              background: '#BFE8EF',
              color: '#ffffff',
              fontSize: '72px',
              fontWeight: 800,
              marginBottom: '24px',
              lineHeight: 1,
              boxShadow: '0 16px 32px rgba(47, 127, 142, 0.24)',
            }}
          >
            c
          </div>
          {/* Brand name */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '0',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            classe
          </div>
          {/* Tagline */}
          <div
            style={{
              fontSize: '28px',
              color: '#F4A261',
              fontWeight: 700,
              letterSpacing: '0',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            全球好物，一站直达
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
