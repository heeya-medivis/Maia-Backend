'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Settings,
  HelpCircle,
  ExternalLink,
  Shield,
  Server,
  Bot,
  KeyRound,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  isAdmin?: boolean;
  userName?: string;
  orgName?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Sidebar({ isAdmin = false, userName = 'User', orgName = 'Organization' }: SidebarProps) {
  const pathname = usePathname();

  const userNavItems: NavItem[] = [
    { href: '/user', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/user/usage', label: 'Usage', icon: <TrendingUp className="w-5 h-5" /> },
    { href: '/user/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const adminNavItems: NavItem[] = [
    { href: '/admin', label: 'Admin Dashboard', icon: <Shield className="w-5 h-5" /> },
    { href: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/sso', label: 'SSO / Enterprise', icon: <KeyRound className="w-5 h-5" /> },
    { href: '/admin/maia-models', label: 'Maia Management', icon: <Bot className="w-5 h-5" /> },
    { href: '/admin/maia-hosts', label: 'Maia Hosts', icon: <Server className="w-5 h-5" /> },
    { href: '/admin/sessions', label: 'Chat Sessions', icon: <MessageSquare className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-black border-r border-[var(--border)] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/MedivisLogomark.png"
            alt="Medivis"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xl font-bold tracking-tight">Maia</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg">
          <Users className="w-5 h-5 text-[var(--accent)]" />
          <div>
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-[var(--muted)]">{orgName}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {/* User Section */}
        <div className="mb-6">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2 px-3">User</p>
          <ul className="space-y-1">
            {userNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'sidebar-link',
                      isActive && 'active'
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Admin Section - only show for admins */}
        {isAdmin && (
          <div className="mb-6">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2 px-3">Admin</p>
            <ul className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'sidebar-link',
                        isActive && 'active'
                      )}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Bottom Links */}
      <div className="p-4 border-t border-[var(--border)] space-y-1">
        <a
          href="https://docs.maia.health/support"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-link"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Help & Support</span>
        </a>
        <a
          href="https://docs.maia.health"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-link"
        >
          <ExternalLink className="w-5 h-5" />
          <span>Documentation</span>
        </a>
      </div>
    </aside>
  );
}
