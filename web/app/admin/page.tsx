import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAdmin } from '@/lib/auth';
import { AdminDashboardContent } from './AdminDashboardContent';

export default async function AdminDashboard() {
  const session = await requireAdmin();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];

  return (
    <DashboardLayout isAdmin={true} userName={displayName} orgName="Maia Admin">
      <AdminDashboardContent />
    </DashboardLayout>
  );
}
