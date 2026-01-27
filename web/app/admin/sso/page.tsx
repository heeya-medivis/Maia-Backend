import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAdmin } from '@/lib/auth';
import { SsoContent } from './SsoContent';

export default async function SsoAdminPage() {
  const session = await requireAdmin();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];

  return (
    <DashboardLayout isAdmin={true} userName={displayName} orgName="Maia Admin">
      <SsoContent />
    </DashboardLayout>
  );
}
