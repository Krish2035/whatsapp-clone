import '../index.css';
import '../App.css';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://whatsapp-clone-nu-lyart.vercel.app';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'WhatsApp Web Vercel - Real-Time WhatsApp Web Clone on Vercel',
    template: '%s | WhatsApp Web Vercel',
  },
  description:
    'Experience the real-time WhatsApp Web clone hosted on Vercel. Enjoy instant 1-on-1 and group messaging, Agora voice and video calling, status stories, voice notes, and dark mode.',
  keywords: [
    'whatsapp web vercel',
    'whatsapp web clone vercel',
    'whatsapp vercel',
    'whatsapp clone vercel',
    'whatsapp web online vercel',
    'whatsapp web',
    'whatsapp web clone',
    'nextjs whatsapp clone',
    'whatsapp web app vercel',
    'real-time whatsapp clone',
    'whatsapp web dark mode',
    'whatsapp web agora call',
    'vercel chat application',
    'whatsapp web chat app',
    'krish whatsapp clone',
  ],
  authors: [{ name: 'Krish', url: 'https://github.com/Krish2035' }],
  creator: 'Krish',
  publisher: 'WhatsApp Web Vercel',
  applicationName: 'WhatsApp Web Vercel',
  generator: 'Next.js',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'WhatsApp Web Vercel',
    title: 'WhatsApp Web Vercel - Real-Time WhatsApp Web Clone on Vercel',
    description:
      'Real-time WhatsApp Web clone hosted on Vercel with instant messaging, Agora voice/video calls, status stories, voice notes, and AI chatbot.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WhatsApp Web Vercel - Real-Time WhatsApp Web Clone',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WhatsApp Web Vercel - Real-Time WhatsApp Web Clone on Vercel',
    description:
      'Official-grade WhatsApp Web clone hosted on Vercel with instant chat, Agora voice & video calls, and status updates.',
    images: ['/og-image.png'],
    creator: '@Krish2035',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '-D3mET-DLurlI_3N4ftkZ7PyFG9AZ-JcgvmOsZUT_v0',
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || '',
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION || '',
    },
  },
  category: 'technology',
};

export const viewport = {
  themeColor: '#111b21',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#webapp`,
      name: 'WhatsApp Web Vercel',
      alternateName: [
        'WhatsApp Web Clone on Vercel',
        'WhatsApp Web Vercel App',
        'WhatsApp Web Clone Next.js',
      ],
      url: SITE_URL,
      applicationCategory: 'CommunicationApplication',
      operatingSystem: 'All (Web Browser, Chrome, Safari, Edge, Firefox, iOS, Android)',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      description:
        'A high-performance WhatsApp Web clone hosted on Vercel featuring real-time chat, Agora voice & video calls, status updates, voice notes, and dark mode.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Person',
        name: 'Krish',
        url: 'https://github.com/Krish2035',
      },
      softwareVersion: '1.0.0',
      featureList: [
        'Real-time 1-on-1 and group messaging via Socket.IO',
        'High-definition Agora audio & video calling',
        'Voice message recording & playback',
        'WhatsApp status stories & media sharing',
        'Meta AI chatbot integration with Groq',
        'Dark theme WhatsApp Web user interface',
        'Deployed on Vercel with high availability',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'WhatsApp Web Vercel',
      description: 'Real-time WhatsApp Web clone hosted on Vercel',
      publisher: {
        '@type': 'Person',
        name: 'Krish',
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="-D3mET-DLurlI_3N4ftkZ7PyFG9AZ-JcgvmOsZUT_v0"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        <header className="sr-only">
          <h1>WhatsApp Web Vercel - Real-Time WhatsApp Web Clone</h1>
          <p>
            Welcome to WhatsApp Web Vercel. A production-ready WhatsApp Web clone deployed on Vercel featuring instant messaging, Agora voice and video calls, status stories, audio notes, and group chats.
          </p>
        </header>
        <noscript>
          <div
            style={{
              padding: '24px',
              backgroundColor: '#111b21',
              color: '#e9edef',
              fontFamily: 'sans-serif',
            }}
          >
            <h1>WhatsApp Web Vercel - Real-Time WhatsApp Web Clone</h1>
            <p>
              Welcome to <strong>WhatsApp Web Vercel</strong>, the full-stack WhatsApp Web clone deployed on Vercel. Connect with friends and family using real-time chat, Agora voice &amp; video calls, status updates, voice notes, and group conversations directly in your browser on Vercel.
            </p>
            <h2>Key Features of WhatsApp Web on Vercel:</h2>
            <ul>
              <li>Real-Time 1-on-1 and Group Messaging</li>
              <li>Agora Voice and Video Calls</li>
              <li>Audio Notes &amp; Media Attachments</li>
              <li>Status Stories &amp; Updates</li>
              <li>Meta AI Chat Assistant</li>
            </ul>
            <p>Please enable JavaScript to run WhatsApp Web on Vercel.</p>
          </div>
        </noscript>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
