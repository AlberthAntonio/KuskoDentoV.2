import type { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { FocusProvider } from '@/hooks/use-focus';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'CuscoDento - Gestión Odontológica',
  description: 'Sistema de gestión odontológica local para Cusco, Perú',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') || undefined;

  return (
    <html lang="es" className={ptSans.variable}>
      <head>
        <style nonce={nonce}>{`:root { color-scheme: light; }`}</style>
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <Script
          id="csp-nonce-bootstrap"
          nonce={nonce}
          strategy="beforeInteractive"
        >
          {`window.__CSP_NONCE__ = '${nonce || ''}';`}
        </Script>
        <AuthProvider>
          <FocusProvider>
            {children}
            <Toaster />
          </FocusProvider>
        </AuthProvider>
      </body>
    </html>
  );
}