// app/deals/page.tsx
export const revalidate = 600; // ← Enables ISR: rebuilds page every 60 seconds

import dynamic from "next/dynamic";

const DealsPageClient = dynamic(() => import('./DealsPageClient'), { ssr: false });

export default function DealsPage() {
  return <DealsPageClient />;
}