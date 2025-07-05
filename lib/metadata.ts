import { Metadata } from 'next';

interface GenerateMetadataProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
  author?: string;
}

export function generateMetadata({
  title,
  description,
  image,
  noIndex = false,
  keywords = [],
  author = 'Shop4Vouchers Team',
}: GenerateMetadataProps): Metadata {
  const baseTitle = 'Shop4Vouchers';
  const baseDescription = 'Discover the best deals and vouchers from trusted brands.';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const metadata: Metadata = {
    title: title ? `${title} | ${baseTitle}` : baseTitle,
    description: description || baseDescription,
    keywords: [
      'deals',
      'vouchers',
      'discounts',
      'savings',
      'online shopping',
      ...keywords,
    ].join(', '),
    authors: [{ name: author }],
    creator: author,
    publisher: baseTitle,
    openGraph: {
      title: title ? `${title} | ${baseTitle}` : baseTitle,
      description: description || baseDescription,
      url: baseUrl,
      siteName: baseTitle,
      images: [
        {
          url: image || `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: title || baseTitle,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title ? `${title} | ${baseTitle}` : baseTitle,
      description: description || baseDescription,
      images: [image || `${baseUrl}/og-image.jpg`],
      creator: '@shop4vouchers',
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
    alternates: {
      canonical: baseUrl,
    },
    // Remove metadataBase from here since it's now set in root layout
    other: { },
  };

  return metadata;
}