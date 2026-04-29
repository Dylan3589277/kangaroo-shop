import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

const BASE_URL = 'https://kangaroo-shop-orpin.vercel.app';

async function getProduct(id: string) {
  try {
    // Try to fetch product via the internal API
    const res = await fetch(`${BASE_URL}/api/products/${id}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const product = await getProduct(params.id);

  const title = product?.title || 'Kangaroo Shop';
  const price = product?.price ? `¥${(product.price as number).toLocaleString()}` : '';
  const imageUrl = product?.images?.[0] || null;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6366f1 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(167, 139, 250, 0.08)',
          }}
        />

        {/* Left: Product Image */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '500px',
            height: '630px',
            padding: '60px',
            flexShrink: 0,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '380px',
                height: '380px',
                objectFit: 'contain',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            />
          ) : (
            <div
              style={{
                fontSize: '100px',
                lineHeight: 1,
              }}
            >
              🦘
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 60px 60px 20px',
            flex: 1,
          }}
        >
          {/* Brand */}
          <div
            style={{
              fontSize: '18px',
              color: '#a5b4fc',
              fontWeight: 500,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            🦘 Kangaroo Shop
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.3,
              marginBottom: '16px',
              display: '-webkit-box',
              overflow: 'hidden',
            }}
          >
            {title.length > 80 ? title.slice(0, 80) + '...' : title}
          </div>

          {/* Price */}
          {price && (
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: '#fbbf24',
                marginBottom: '20px',
              }}
            >
              {price}
            </div>
          )}

          {/* Tagline */}
          <div
            style={{
              fontSize: '16px',
              color: '#c7d2fe',
              fontWeight: 400,
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
