import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAdmin } from '@/lib/auth';
import { UsersContent } from './UsersContent';

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];

  return (
    <DashboardLayout isAdmin={true} userName={displayName} orgName="Maia Admin">
      <UsersContent />
    </DashboardLayout>
  );
}
