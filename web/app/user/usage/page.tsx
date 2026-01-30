import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAuth } from '@/lib/auth';
import { UsageContent } from './UsageContent';

export default async function UsagePage() {
  const session = await requireAuth();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];

  return (
    <DashboardLayout isAdmin={user.isAdmin} userName={displayName} orgName="Personal">
      <UsageContent />
    </DashboardLayout>
  );
}
