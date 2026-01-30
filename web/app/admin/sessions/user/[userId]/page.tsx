import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAdmin } from '@/lib/auth';
import { UserDetailContent } from './UserDetailContent';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const session = await requireAdmin();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];
  const { userId } = await params;

  return (
    <DashboardLayout isAdmin={true} userName={displayName} orgName="Maia Admin">
      <UserDetailContent userId={userId} />
    </DashboardLayout>
  );
}
