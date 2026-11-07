import { ImageResponse } from 'next/og';

export const alt = 'WhatsApp Web Vercel - Real-Time WhatsApp Web Clone';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0b141a 0%, #111b21 50%, #202c33 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          position: 'relative',
          padding: '40px',
        }}
      >
        {/* WhatsApp Logo Bubble */}
        <div
          style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            backgroundColor: '#00a884',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            boxShadow: '0 12px 32px rgba(0, 168, 132, 0.4)',
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="white">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2zm.01 16.68c-1.49 0-2.95-.4-4.22-1.15l-.3-.18-3.13.82.83-3.05-.2-.32a8.16 8.16 0 0 1-1.26-4.38c0-4.51 3.67-8.18 8.18-8.18 2.19 0 4.24.85 5.79 2.4 1.55 1.55 2.4 3.6 2.4 5.78 0 4.52-3.67 8.19-8.19 8.19z"/>
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '56px',
            fontWeight: 'bold',
            color: '#e9edef',
            marginBottom: '16px',
            textAlign: 'center',
            display: 'flex',
            letterSpacing: '-1px',
          }}
        >
          WhatsApp Web Vercel
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '26px',
            color: '#8696a0',
            maxWidth: '850px',
            textAlign: 'center',
            lineHeight: 1.4,
            marginBottom: '32px',
            display: 'flex',
          }}
        >
          Real-Time WhatsApp Clone with Instant Chat, Agora Calls & Stories
        </div>

        {/* Badges */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          <div
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 168, 132, 0.2)',
              border: '1px solid #00a884',
              color: '#00a884',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Vercel Deployed
          </div>
          <div
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              backgroundColor: '#202c33',
              border: '1px solid #374248',
              color: '#e9edef',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Voice & Video Calls
          </div>
          <div
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              backgroundColor: '#202c33',
              border: '1px solid #374248',
              color: '#e9edef',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Meta AI Assistant
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
