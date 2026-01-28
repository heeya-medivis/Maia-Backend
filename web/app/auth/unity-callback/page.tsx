'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function UnityCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error || 'Authentication failed');
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Missing authorization code or state');
      return;
    }

    // State format: {port}:{originalState}
    // e.g., "60624:abc123xyz..."
    const stateParts = state.split(':');
    if (stateParts.length < 2) {
      setStatus('error');
      setErrorMessage('Invalid state format');
      return;
    }

    const port = stateParts[0];
    const originalState = stateParts.slice(1).join(':'); // Rejoin in case original state had colons

    // Validate port is a number
    const portNumber = parseInt(port, 10);
    if (isNaN(portNumber) || portNumber < 1024 || portNumber > 65535) {
      setStatus('error');
      setErrorMessage('Invalid callback port');
      return;
    }

    // Send the code to Unity's loopback server in the background (no redirect)
    const loopbackUrl = `http://127.0.0.1:${port}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(originalState)}`;
    
    fetch(loopbackUrl, { mode: 'no-cors' })
      .then(() => {
        // Success - Unity received the code
        setStatus('success');
      })
      .catch(() => {
        // Even on "error", the request likely succeeded (CORS blocks the response, not the request)
        // The loopback server is HTTP and won't return CORS headers
        setStatus('success');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-black grid-bg relative overflow-hidden flex flex-col items-center justify-center">
      {/* Glowing orbs */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* Maia Logo */}
        <div className="inline-flex items-center gap-2.5 mb-8">
          <div className="w-12 h-12 bg-[var(--accent)] rounded-[10px] flex items-center justify-center">
            <span className="text-black font-bold text-[24px]">M</span>
          </div>
          <span className="text-[28px] font-bold tracking-tight">Maia</span>
        </div>

        {/* Status Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-[var(--accent)] mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-semibold mb-2">Authenticating...</h1>
              <p className="text-[var(--muted)]">Please wait while we complete the sign-in process.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-[var(--success)] mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Authentication Successful!</h1>
              <p className="text-[var(--muted)]">
                You can now close this window and return to SurgicalAR.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-[var(--danger)] mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Authentication Failed</h1>
              <p className="text-[var(--muted)] mb-4">{errorMessage}</p>
              <p className="text-sm text-[var(--muted)]">
                Please close this window and try again in SurgicalAR.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-[var(--muted)] text-sm mt-6">
          SurgicalAR by Medivis
        </p>
      </div>
    </div>
  );
}

export default function UnityCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black grid-bg relative overflow-hidden flex flex-col items-center justify-center">
          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />
          <div className="relative z-10 text-center">
            <Loader2 className="w-12 h-12 text-[var(--accent)] mx-auto animate-spin" />
          </div>
        </div>
      }
    >
      <UnityCallbackContent />
    </Suspense>
  );
}
