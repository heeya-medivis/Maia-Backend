'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  isAdmin?: boolean;
  userName?: string;
  orgName?: string;
}

export function DashboardLayout({
  children,
  isAdmin = false,
  userName = 'User',
  orgName = 'Organization',
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar isAdmin={isAdmin} userName={userName} orgName={orgName} />
      <div className="flex-1 flex flex-col">
        <Header variant="dashboard" isAdmin={isAdmin} userName={userName} orgName={orgName} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
