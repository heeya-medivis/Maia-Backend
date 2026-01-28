'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  User,
  Shield,
  LogOut,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface HeaderProps {
  variant?: 'landing' | 'dashboard';
  isAdmin?: boolean;
  userName?: string;
  orgName?: string;
}

export function Header({
  variant = 'landing',
  isAdmin = false,
  userName = 'User',
  orgName = 'Organization',
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (variant === 'landing') {
    return (
      <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">M</span>
              </div>
              <span className="text-xl font-bold tracking-tight">Maia</span>
            </Link>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/user">
                <Button variant="secondary" size="sm">Sign In</Button>
              </Link>
              <Link href="/user">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-[var(--muted)] hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--card)] border-t border-[var(--border)]">
            <nav className="flex flex-col p-4 gap-4">
              <div className="flex flex-col gap-2">
                <Link href="/user">
                  <Button variant="secondary" className="w-full">Sign In</Button>
                </Link>
                <Link href="/user">
                  <Button variant="primary" className="w-full">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    );
  }

  // Dashboard header
  return (
    <header className="h-16 bg-black border-b border-[var(--border)] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Admin indicator */}
        {isAdmin && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Admin</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors"
          >
            <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-[var(--muted)]">{orgName}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 dropdown z-50">
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-[var(--border)] mb-2">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-[var(--muted)]">{orgName}</p>
                  </div>
                  <Link
                    href="/user/settings"
                    className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--card-hover)] rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <div className="border-t border-[var(--border)] mt-2 pt-2">
                    <a
                      href="/api/auth/logout"
                      className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
