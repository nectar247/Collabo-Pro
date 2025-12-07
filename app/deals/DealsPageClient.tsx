'use client';

import dynamic from 'next/dynamic';

const SearchPage = dynamic(() => import('../search/SearchPage'), { ssr: false });

export default function DealsPageClient() {
  return <SearchPage />;
}
