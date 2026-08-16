'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--wa-bg-deep, #0b141a)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--wa-accent, #00a884)',
      fontSize: '18px',
      fontWeight: 'bold'
    }}>
      Loading WhatsApp...
    </div>
  ),
});

export default function Page() {
  return <App />;
}
