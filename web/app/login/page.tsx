'use client';

import React, { useState, useEffect, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type Phase = 'email' | 'org-sso' | 'org-options' | 'sso-required' | 'invite' | 'welcome-back' | 'magic-link-sent' | 'loading';
type Provider = 'google' | 'microsoft' | 'apple';
type AuthMethod = Provider | 'sso' | 'magic_link';

interface SSOConnection {
  id: string;
  name: string;
  type: string;
}

interface SavedLoginPreference {
  email: string;
  method: AuthMethod;
  methodLabel: string; // "Google", "Microsoft", "Apple", or SSO connection name
  ssoConnectionId?: string;
  timestamp: number;
}

const STORAGE_KEY = 'maia_last_login';
const PREFERENCE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function saveLoginPreference(pref: Omit<SavedLoginPreference, 'timestamp'>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pref, timestamp: Date.now() }));
  } catch {
    // localStorage not available
  }
}

function loadLoginPreference(): SavedLoginPreference | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const pref: SavedLoginPreference = JSON.parse(stored);

    // Check if expired
    if (Date.now() - pref.timestamp > PREFERENCE_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return pref;
  } catch {
    return null;
  }
}

function clearLoginPreference() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
}

interface DiscoveredOrg {
  tenant_id: string;
  name: string;
  type: string;
  domain: string;
  require_sso: boolean;
  allow_social_login: boolean;
  auth_methods: string[];
  sso_connections: SSOConnection[];
}

interface InviteInfo {
  email: string;
  tenant_name: string;
  role: string;
  expires_at: string;
  inviter_name: string | null;
  message: string | null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-black grid-bg relative overflow-hidden flex items-center justify-center">
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="relative z-10 w-full max-w-[420px] px-5">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-11 h-11 bg-[var(--accent)] rounded-[10px] flex items-center justify-center">
              <span className="text-black font-bold text-[22px]">M</span>
            </div>
            <span className="text-[28px] font-bold tracking-tight">Maia</span>
          </div>
        </div>
        <div className="card-glow bg-[var(--card)] rounded-2xl p-8 border border-[var(--border)]">
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginContent() {
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [discoveredOrg, setDiscoveredOrg] = useState<DiscoveredOrg | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [savedPreference, setSavedPreference] = useState<SavedLoginPreference | null>(null);

  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/user';
  const errorFromParams = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const inviteTokenParam = searchParams.get('invite');
  const [error, setError] = useState<string | null>(
    errorFromParams === 'sso_required' ? null : errorFromParams
  );

  // Handle SSO required error - show interstitial instead of error banner
  const [ssoRequiredOrg, setSsoRequiredOrg] = useState<string | null>(
    errorFromParams === 'sso_required' ? (errorDescription ?? 'Your organization') : null
  );

  // Clear saved preference on auth errors that indicate the saved method is blocked
  useEffect(() => {
    const blockedErrors = ['sso_required', 'social_login_disabled'];
    if (errorFromParams && blockedErrors.includes(errorFromParams)) {
      clearLoginPreference();
    }
  }, [errorFromParams]);

  // Load saved login preference on mount
  useEffect(() => {
    // Don't show welcome back if there's an error or invite
    if (errorFromParams || inviteTokenParam) return;

    const pref = loadLoginPreference();
    if (pref) {
      setSavedPreference(pref);
      setEmail(pref.email);
      setPhase('welcome-back');
    }
  }, [errorFromParams, inviteTokenParam]);

  // Load invite info on mount if invite token is present
  useEffect(() => {
    if (inviteTokenParam) {
      setInviteToken(inviteTokenParam);
      loadInviteInfo(inviteTokenParam);
    }
  }, [inviteTokenParam]);

  const loadInviteInfo = async (token: string) => {
    try {
      const response = await fetch(`/api/bff/auth/invite/${token}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setInviteInfo(data.data);
        setEmail(data.data.email);
        setPhase('invite');
      } else {
        setError(data.error?.message || 'Invalid or expired invite');
      }
    } catch {
      setError('Failed to load invite information');
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bff/auth/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Discovery failed');
      }

      // Check discovery results
      if (data.data?.candidates && data.data.candidates.length > 0) {
        const org = data.data.candidates[0] as DiscoveredOrg;
        setDiscoveredOrg(org);

        if (org.require_sso) {
          setPhase('org-sso');
        } else {
          setPhase('org-options');
        }
      } else {
        // No org found - stay on email phase, user can pick Google/Microsoft/Apple
        // The social buttons are already visible below the email form
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: Provider) => {
    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
    setPhase('loading');
    setLoadingText(`Redirecting to ${providerLabel}...`);

    // Save preference for next time
    if (email) {
      saveLoginPreference({ email, method: provider, methodLabel: providerLabel });
    }

    const params = new URLSearchParams({
      provider,
      redirect,
    });

    if (email) {
      params.set('login_hint', email);
    }

    // Pass invite token if present so callback can handle acceptance
    if (inviteToken) {
      params.set('invite', inviteToken);
    }

    window.location.href = `/api/auth/login?${params.toString()}`;
  };

  const handleSSOLogin = (connectionId?: string, connectionName?: string) => {
    setPhase('loading');
    setLoadingText('Redirecting to your identity provider...');

    // Only save SSO preference if we have a connectionId
    // Without connectionId, the login route would default to Google which is wrong
    if (email && connectionId) {
      saveLoginPreference({
        email,
        method: 'sso',
        methodLabel: connectionName || 'SSO',
        ssoConnectionId: connectionId,
      });
    }

    const params = new URLSearchParams({ redirect });

    if (connectionId) {
      params.set('connection_id', connectionId);
    }

    if (email) {
      params.set('login_hint', email);
    }

    window.location.href = `/api/auth/login?${params.toString()}`;
  };

  const handleWelcomeBackContinue = () => {
    if (!savedPreference) return;

    if (savedPreference.method === 'sso') {
      // SSO requires connectionId - if missing, clear preference and show normal login
      if (!savedPreference.ssoConnectionId) {
        clearLoginPreference();
        setSavedPreference(null);
        setPhase('email');
        return;
      }
      handleSSOLogin(savedPreference.ssoConnectionId, savedPreference.methodLabel);
    } else if (savedPreference.method === 'magic_link') {
      // Magic link - trigger the magic link flow
      handleMagicLink();
    } else {
      handleSocialLogin(savedPreference.method);
    }
  };

  const handleUseDifferentAccount = () => {
    clearLoginPreference();
    setSavedPreference(null);
    setEmail('');
    setPhase('email');
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bff/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect_uri: redirect, // Pass the path (e.g., /user, /org) - BFF handles the callback URL
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 'sso_required') {
          setSsoRequiredOrg(data.error?.message || 'Your organization');
          setPhase('sso-required');
          return;
        }
        throw new Error(data.error?.message || 'Failed to send magic link');
      }

      // Save preference for next time
      saveLoginPreference({ email, method: 'magic_link', methodLabel: 'Magic Link' });

      setPhase('magic-link-sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setPhase('email');
    setDiscoveredOrg(null);
    setSsoRequiredOrg(null);
    setError(null);
  };

  // Handle SSO required interstitial - discover the org to get SSO connections
  const handleSsoRequiredContinue = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bff/auth/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.data?.candidates?.length > 0) {
        const org = data.data.candidates[0] as DiscoveredOrg;
        setDiscoveredOrg(org);
        setSsoRequiredOrg(null);
        setPhase('org-sso');
      } else {
        setError('Could not find your organization. Please contact your administrator.');
      }
    } catch {
      setError('Discovery failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const domain = email.includes('@') ? email.split('@')[1] : '';

  return (
    <div className="min-h-screen bg-black grid-bg relative overflow-hidden flex items-center justify-center">
      {/* Glowing orbs */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      <div className="relative z-10 w-full max-w-[420px] px-5">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-11 h-11 bg-[var(--accent)] rounded-[10px] flex items-center justify-center">
              <span className="text-black font-bold text-[22px]">M</span>
            </div>
            <span className="text-[28px] font-bold tracking-tight">Maia</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="card-glow bg-[var(--card)] rounded-2xl p-8 border border-[var(--border)]">

          {/* Phase 1: Email Discovery */}
          {phase === 'email' && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-center mb-2">Sign in to Maia</h1>
              <p className="text-[var(--muted)] text-center mb-7 text-[15px]">
                Enter your email to get started
              </p>

              {error && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px] p-3 mb-5">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Work email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : null}
                  Continue
                </button>
              </form>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[var(--muted)] text-[13px] uppercase tracking-wide">or continue with</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <div className="space-y-3">
                <SocialButton provider="google" onClick={() => handleSocialLogin('google')} />
                <SocialButton provider="microsoft" onClick={() => handleSocialLogin('microsoft')} />
                <SocialButton provider="apple" onClick={() => handleSocialLogin('apple')} />
              </div>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[var(--muted)] text-[13px] uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <button
                onClick={handleMagicLink}
                disabled={isLoading || !email.trim()}
                className="w-full btn-secondary flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MagicLinkIcon />
                Email me a sign-in link
              </button>
            </div>
          )}

          {/* Magic Link Sent Phase */}
          {phase === 'magic-link-sent' && (
            <div className="animate-fadeIn">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[var(--accent-muted)] border border-[var(--accent)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MailIcon />
                </div>
                <h1 className="text-2xl font-bold mb-2">Check your email</h1>
                <p className="text-[var(--muted)] text-[15px]">
                  We&apos;ve sent a sign-in link to<br />
                  <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              <div className="bg-[var(--card-hover)] border border-[var(--border)] rounded-[10px] p-4 mb-6">
                <p className="text-sm text-[var(--muted)]">
                  Click the link in your email to sign in. The link will expire in 10 minutes.
                </p>
              </div>

              <button
                onClick={() => setPhase('email')}
                className="w-full btn-secondary"
              >
                Use a different email
              </button>

              <button
                onClick={handleMagicLink}
                disabled={isLoading}
                className="w-full text-[var(--muted)] text-sm mt-4 hover:text-[var(--accent)] transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Resend email'}
              </button>
            </div>
          )}

          {/* Welcome Back Phase */}
          {phase === 'welcome-back' && savedPreference && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
              <p className="text-[var(--muted)] text-center mb-7 text-[15px]">
                Continue as <span className="text-white font-medium">{savedPreference.email}</span>
              </p>

              {error && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px] p-3 mb-5">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleWelcomeBackContinue}
                  className="w-full btn-primary flex items-center justify-center gap-3"
                >
                  {savedPreference.method === 'google' && <GoogleIcon />}
                  {savedPreference.method === 'microsoft' && <MicrosoftIcon />}
                  {savedPreference.method === 'apple' && <AppleIcon />}
                  {savedPreference.method === 'sso' && <SSOIcon />}
                  {savedPreference.method === 'magic_link' && <MagicLinkIcon />}
                  Continue with {savedPreference.methodLabel}
                </button>
              </div>

              <button
                onClick={handleUseDifferentAccount}
                className="w-full text-[var(--muted)] text-sm mt-6 hover:text-[var(--accent)] transition-colors"
              >
                Use a different account
              </button>
            </div>
          )}

          {/* SSO Required Interstitial (after social login attempt) */}
          {(ssoRequiredOrg || phase === 'sso-required') && (
            <div className="animate-fadeIn">
              <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-[10px] p-4 mb-5">
                <h2 className="font-semibold text-[var(--warning)] mb-1">SSO Required</h2>
                <p className="text-sm text-[var(--muted)]">
                  {ssoRequiredOrg || 'Your organization'} requires single sign-on authentication.
                  Social login is not available for your account.
                </p>
              </div>

              <p className="text-[var(--muted)] text-center mb-6 text-[15px]">
                Please sign in using your organization&apos;s SSO to continue.
              </p>

              {error && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px] p-3 mb-5">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleSsoRequiredContinue}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <SSOIcon />
                  )}
                  Continue with SSO
                </button>
                <button
                  onClick={goBack}
                  className="w-full btn-secondary"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {/* Invite Acceptance Phase */}
          {phase === 'invite' && inviteInfo && (
            <div className="animate-fadeIn">
              <div className="bg-[var(--accent-muted)] border border-[var(--accent)]/30 rounded-[10px] p-4 mb-5">
                <h2 className="font-semibold mb-1">You&apos;ve been invited!</h2>
                <p className="text-sm text-[var(--muted)]">
                  {inviteInfo.inviter_name ? `${inviteInfo.inviter_name} has invited you to join ` : 'You have been invited to join '}
                  <span className="font-medium text-white">{inviteInfo.tenant_name}</span>
                  {inviteInfo.role !== 'viewer' && ` as ${inviteInfo.role}`}.
                </p>
                {inviteInfo.message && (
                  <p className="text-sm text-[var(--muted)] mt-2 italic">&quot;{inviteInfo.message}&quot;</p>
                )}
              </div>

              <p className="text-[var(--muted)] text-center mb-6 text-[15px]">
                Sign in to accept the invitation
              </p>

              {error && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px] p-3 mb-5">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <SocialButton provider="google" onClick={() => handleSocialLogin('google')} />
                <SocialButton provider="microsoft" onClick={() => handleSocialLogin('microsoft')} />
                <SocialButton provider="apple" onClick={() => handleSocialLogin('apple')} />
              </div>

              <p className="text-xs text-[var(--muted)] text-center mt-4">
                Accepting for: <span className="font-medium">{inviteInfo.email}</span>
              </p>
            </div>
          )}

          {/* Phase 2: Organization SSO Required */}
          {phase === 'org-sso' && discoveredOrg && (
            <div className="animate-fadeIn">
              <button onClick={goBack} className="flex items-center gap-1.5 text-[var(--muted)] text-sm mb-5 hover:text-[var(--accent)] transition-colors">
                <ArrowLeft size={16} />
                Back
              </button>

              <OrgBadge name={discoveredOrg.name} domain={domain} />

              <h1 className="text-2xl font-bold text-center mb-2">Sign in with SSO</h1>
              <p className="text-[var(--muted)] text-center mb-6 text-[15px]">
                Your organization requires single sign-on
              </p>

              {error && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px] p-3 mb-5">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {discoveredOrg.sso_connections && discoveredOrg.sso_connections.length > 0 ? (
                  discoveredOrg.sso_connections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => handleSSOLogin(conn.id, conn.name || 'SSO')}
                      className="w-full flex items-center gap-3 p-4 bg-[var(--card-hover)] border border-[var(--border)] rounded-[10px] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
                    >
                      <SSOIcon />
                      <span className="font-medium">{conn.name || 'Single Sign-On'}</span>
                      <span className="text-[var(--muted)] text-xs ml-auto">{conn.type || 'SAML'}</span>
                    </button>
                  ))
                ) : (
                  <button
                    onClick={() => handleSSOLogin(undefined, 'SSO')}
                    className="w-full btn-sso flex items-center justify-center gap-2.5"
                  >
                    <SSOIcon />
                    Continue with SSO
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Phase 3: Organization Options */}
          {phase === 'org-options' && discoveredOrg && (
            <div className="animate-fadeIn">
              <button onClick={goBack} className="flex items-center gap-1.5 text-[var(--muted)] text-sm mb-5 hover:text-[var(--accent)] transition-colors">
                <ArrowLeft size={16} />
                Back
              </button>

              <OrgBadge name={discoveredOrg.name} domain={domain} />

              <h1 className="text-2xl font-bold text-center mb-2">Choose how to sign in</h1>
              <p className="text-[var(--muted)] text-center mb-6 text-[15px]">
                Select your preferred authentication method
              </p>

              {error && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px] p-3 mb-5">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {/* SSO options first */}
                {discoveredOrg.sso_connections?.map((conn) => (
                  <button
                    key={conn.id}
                    onClick={() => handleSSOLogin(conn.id, conn.name || 'SSO')}
                    className="w-full btn-sso flex items-center justify-center gap-2.5"
                  >
                    <SSOIcon />
                    Continue with {conn.name || 'SSO'}
                  </button>
                ))}

                {/* Social options */}
                {discoveredOrg.auth_methods?.includes('google') && (
                  <SocialButton provider="google" onClick={() => handleSocialLogin('google')} />
                )}
                {discoveredOrg.auth_methods?.includes('microsoft') && (
                  <SocialButton provider="microsoft" onClick={() => handleSocialLogin('microsoft')} />
                )}
                {discoveredOrg.auth_methods?.includes('apple') && (
                  <SocialButton provider="apple" onClick={() => handleSocialLogin('apple')} />
                )}

                {/* Magic link option */}
                {discoveredOrg.auth_methods?.includes('magic_link') && (
                  <button
                    onClick={handleMagicLink}
                    disabled={isLoading}
                    className="w-full btn-secondary flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <MagicLinkIcon />
                    Email me a sign-in link
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Phase 4: Loading */}
          {phase === 'loading' && (
            <div className="animate-fadeIn text-center py-10">
              <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--muted)] text-[15px]">{loadingText}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--muted)] text-center mt-6">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

// Organization Badge Component
function OrgBadge({ name, domain }: { name: string; domain: string }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--accent-muted)] border border-[var(--accent)]/30 rounded-lg p-3 mb-5">
      <div className="w-8 h-8 bg-[var(--accent)] rounded-md flex items-center justify-center text-black font-bold text-sm">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{name}</div>
        <div className="text-[var(--muted)] text-xs truncate">{domain}</div>
      </div>
    </div>
  );
}

// Social Login Button Component
function SocialButton({ provider, onClick }: { provider: Provider; onClick: () => void }) {
  const config: Record<Provider, { label: string; icon: React.ReactNode }> = {
    google: {
      label: 'Continue with Google',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ),
    },
    microsoft: {
      label: 'Continue with Microsoft',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#F25022" d="M1 1h10v10H1z" />
          <path fill="#00A4EF" d="M1 13h10v10H1z" />
          <path fill="#7FBA00" d="M13 1h10v10H13z" />
          <path fill="#FFB900" d="M13 13h10v10H13z" />
        </svg>
      ),
    },
    apple: {
      label: 'Continue with Apple',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      ),
    },
  };

  const { label, icon } = config[provider];

  return (
    <button
      onClick={onClick}
      className="w-full btn-secondary flex items-center justify-center gap-3"
    >
      {icon}
      {label}
    </button>
  );
}

// SSO Icon Component
function SSOIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

// Individual provider icons for welcome back button
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

// Magic Link Icon Component
function MagicLinkIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Mail Icon Component
function MailIcon() {
  return (
    <svg className="w-8 h-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
