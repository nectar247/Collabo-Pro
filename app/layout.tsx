import './globals.css';
import { Inter } from 'next/font/google';
// import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/components/theme/theme-provider';
// import Footer from '@/components/footer';
import Script from 'next/script';
// const Navigation = dynamic(() => import('@/components/navigation'), {
//   ssr: false
// });

const inter = Inter({ subsets: ['latin'], display: 'swap' });

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
        <meta property="og:image" content="/icon-512x512.png" />
        <meta property="og:image:alt" content="Shop4Vouchers Logo" />
        <meta property="og:image:type" content="image/svg+xml" />
        <meta property="og:title" content="Shop4Vouchers" />
        <meta property="og:description" content="Your best voucher shop for amazing deals!" />
        <link rel="icon" href="/icon-512x512.png" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16C47F" />
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