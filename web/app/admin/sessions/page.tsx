import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAdmin } from '@/lib/auth';
import { SessionsContent } from './SessionsContent';

export default async function AdminSessionsPage() {
  const session = await requireAdmin();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];

  return (
    <DashboardLayout isAdmin={true} userName={displayName} orgName="Maia Admin">
      <SessionsContent />
    </DashboardLayout>
  );
}
