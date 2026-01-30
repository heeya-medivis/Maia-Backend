import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { requireAdmin } from '@/lib/auth';
import { OrganizationDetailContent } from './OrganizationDetailContent';

interface PageProps {
  params: Promise<{ organizationName: string }>;
}

export default async function AdminOrganizationDetailPage({ params }: PageProps) {
  const session = await requireAdmin();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];
  const { organizationName } = await params;

  return (
    <DashboardLayout isAdmin={true} userName={displayName} orgName="Maia Admin">
      <OrganizationDetailContent organizationName={decodeURIComponent(organizationName)} />
    </DashboardLayout>
  );
}
