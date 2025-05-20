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
        <meta
          httpEquiv="Content-Security-Policy"
            content="default-src 'self'; 
                  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.dwin2.com https://cdn.trendii.com https://assets.trendii.com https://beeswax.trendii.com https://ingress.trendii.com; 
                  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tm.trendii.com;
                  img-src 'self' https://ui.awin.com https://awin1.com https://a1.awin1.com https://awin.com https://images.unsplash.com https://firebasestorage.googleapis.com data: https://tm.trendii.com;
                  font-src 'self' https://fonts.gstatic.com https://tm.trendii.com;
                  connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://beeswax.trendii.com https://ingress.trendii.com https://tm.trendii.com;"
        />
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