'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--wa-bg-deep, #0b141a)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--wa-accent, #00a884)',
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#00a884',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 8px 24px rgba(0, 168, 132, 0.4)',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2zm.01 16.68c-1.49 0-2.95-.4-4.22-1.15l-.3-.18-3.13.82.83-3.05-.2-.32a8.16 8.16 0 0 1-1.26-4.38c0-4.51 3.67-8.18 8.18-8.18 2.19 0 4.24.85 5.79 2.4 1.55 1.55 2.4 3.6 2.4 5.78 0 4.52-3.67 8.19-8.19 8.19z"/>
        </svg>
      </div>
      <h1 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#e9edef' }}>
        WhatsApp Web Vercel
      </h1>
      <p style={{ fontSize: '14px', margin: 0, color: '#8696a0', fontWeight: 'normal' }}>
        Loading WhatsApp Web on Vercel...
      </p>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
