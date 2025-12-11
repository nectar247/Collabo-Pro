// app/admin/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './components/AdminDashboardClient'

export const dynamic = 'force-dynamic'; // optional, if this page uses runtime data
export const fetchCache = 'force-no-store'; // optional, disables caching

export default async function AdminPage() {
  // TEMPORARY: Auth check disabled for testing
  // const cookieStore = await cookies();
  // const token = cookieStore.get('authToken')?.value;

  // if (!token) {
  //   redirect('/sign-in');
  // }

  return <AdminDashboardClient />;
}