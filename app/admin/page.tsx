// app/admin/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic'; // optional, if this page uses runtime data
export const fetchCache = 'force-no-store'; // optional, disables caching

export default async function AdminPage() {
  const token = cookies().get('authToken')?.value;
  console.log('Admin token on server:', token);

  if (!token) {
    redirect('/sign-in');
  }

  return <AdminDashboardClient />;
}
