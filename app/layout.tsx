import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/theme-provider';
import Script from 'next/script';
import { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// Add metadata export for your root layout
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    template: '%s | Shop4Vouchers',
    default: 'Shop4Vouchers',
  },
  description: 'Your best voucher shop for amazing deals!',
  openGraph: {
    title: 'Shop4Vouchers',
    description: 'Your best voucher shop for amazing deals!',
    images: ['/icon-512x512.png'],
    type: 'website',
  },
  icons: {
    icon: '/icon-512x512.png',
    apple: '/icon-512x512.png',
  },
  manifest: '/manifest.json',
};

// Move themeColor to viewport export
export const viewport: Viewport = {
  themeColor: '#16C47F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {  
  return (
    <html 
      lang="en" 
      className={inter.className} 
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main className="flex-grow">
            {children}
          </main>
        </ThemeProvider>
        <Script src="https://www.dwin2.com/pub.1822416.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}