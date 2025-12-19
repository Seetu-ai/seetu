import { redirect } from 'next/navigation';

// Dashboard root redirects to /dashboard
export default async function DashboardRootPage() {
  redirect('/dashboard');
}
