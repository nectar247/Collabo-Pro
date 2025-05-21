import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './components/AdminDashboardClient'


export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function AdminPageWrapper() {
  return <AdminPage />;
}

async function AdminPage() {
  const token = cookies().get('authToken')?.value;

  if (!token) {
    redirect('/sign-in');
  }

  return <AdminDashboardClient />;
}
