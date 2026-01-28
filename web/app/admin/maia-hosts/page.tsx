import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAdmin } from '@/lib/auth';
import { MaiaHostsContent } from './MaiaHostsContent';

export default async function AdminMaiaHostsPage() {
  const session = await requireAdmin();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];

  return (
    <DashboardLayout isAdmin={true} userName={displayName} orgName="Maia Admin">
      <MaiaHostsContent />
    </DashboardLayout>
  );
}
