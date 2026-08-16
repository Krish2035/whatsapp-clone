import '../index.css';
import '../App.css';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';

export const metadata = {
  title: 'WhatsApp Web',
  description: 'WhatsApp Web Clone Built with Next.js',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  themeColor: '#111b21',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
