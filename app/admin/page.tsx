// app/admin/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default function AdminPage() {
  const token = cookies().get('authToken')?.value;
  
  if (!token) {
    redirect('/sign-in');
  }

  return <AdminDashboardClient />;
}
// "use client"; // This makes this file a full Client Component

// import AdminDashboardClient from './AdminDashboardClient';

// export default function AdminPage() {
//   return <AdminDashboardClient />;
// }
