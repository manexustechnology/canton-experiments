/**
 * Root layout — Geist fonts, query/party providers, and a Sonner toaster
 * themed to the design-system surfaces. Dark color-scheme is baked onto
 * <html> so the browser paints chrome dark before our CSS lands.
 */

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Tenzro Auction House — Canton / DAML',
    template: '%s · Tenzro Auction House',
  },
  description:
    'An open ascending-price auction house running on the Canton ledger via DAML, with the Tenzro design system on top.',
  applicationName: 'Tenzro Auction House',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-foreground)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
