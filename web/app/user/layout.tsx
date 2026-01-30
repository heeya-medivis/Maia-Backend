import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAuth } from '@/lib/auth';

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];

  return (
    <DashboardLayout isAdmin={user.isAdmin} userName={displayName} orgName="Personal">
      {children}
    </DashboardLayout>
  );
}
