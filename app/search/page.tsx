import React, { Suspense } from 'react';
import SearchPage from './SearchPage';

export default function SearchBoundary() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchPage />
    </Suspense>
  );
}
