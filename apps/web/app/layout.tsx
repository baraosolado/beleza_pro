import type { Metadata, Viewport } from 'next';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beleza Pro',
  description: 'Sua agenda, seus clientes e suas cobranças — tudo em um lugar.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
