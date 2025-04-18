import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';

const ClientProviders = dynamic(() => import('@/components/ClientProviders'), {
  ssr: true,
});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '$ deFi Terminal',
  description: 'Terminal-style DeFi interface',
  icons: {
    icon: [
      {
        url: '/terminal.ico',
        href: '/terminal.ico',
      }
    ]
  },
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '$ deFi Terminal'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
} 