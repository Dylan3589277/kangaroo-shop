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
          {/* Logo emoji */}
          <div
            style={{
              fontSize: '80px',
              marginBottom: '24px',
              lineHeight: 1,
            }}
          >
            🦘
          </div>
          {/* Brand name */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '2px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            Kangaroo Shop
          </div>
          {/* Tagline */}
          <div
            style={{
              fontSize: '28px',
              color: '#a5b4fc',
              fontWeight: 400,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            China Sourcing for Global Markets
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
