import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAuth } from '@/lib/auth';
import { UserDashboardContent } from './UserDashboardContent';

export default async function UserDashboard() {
  const session = await requireAuth();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];
  const firstName = displayName.split(' ')[0];

  return (
    <DashboardLayout isAdmin={user.isAdmin} userName={displayName} orgName="Personal">
      <UserDashboardContent firstName={firstName} />
    </DashboardLayout>
  );
}
