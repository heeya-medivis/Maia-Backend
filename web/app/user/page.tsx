import { requireAuth } from '@/lib/auth';
import { UserDashboardContent } from './UserDashboardContent';

export default async function UserDashboard() {
  const session = await requireAuth();
  const { user } = session;
  const displayName = user.displayName ?? user.email.split('@')[0];
  const firstName = displayName.split(' ')[0];

  return <UserDashboardContent firstName={firstName} />;
}
