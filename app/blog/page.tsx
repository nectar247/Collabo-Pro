// app/blog/page.tsx
import { generateMetadata as createMetadata } from '@/lib/metadata';
import BlogPageClient from './BlogPageClient';

// Export metadata for the blog page
export const metadata = createMetadata({
  title: 'Money-Saving Tips & Deal Guides - Latest Articles & Blog Posts',
  description: 'Read our latest articles on money-saving tips, deal guides, and shopping advice. Stay updated with the best ways to save money and find exclusive deals.',
  keywords: ['money saving tips', 'deal guides', 'shopping advice', 'blog', 'articles', 'saving money', 'discount tips', 'voucher guides', 'financial tips'],
});

export default function BlogPage() {
  return <BlogPageClient />;
}