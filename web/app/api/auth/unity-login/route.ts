import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_URL } from '@/lib/env';

/**
 * Unity Desktop App Login Route
 * 
 * This route handles OAuth login for Unity/desktop apps. Unlike the web login,
 * Unity apps provide their own PKCE values and redirect URI (to /auth/unity-callback).
 * 
 * Flow:
 * 1. Unity opens web /login page with PKCE params (state, code_challenge, etc.)
 * 2. User picks auth method (Google, Microsoft, Apple, SSO)
 * 3. Web login page redirects here with those params
 * 4. We forward to the API's OAuth endpoint with Unity's PKCE values
 * 5. After auth, API redirects to /auth/unity-callback with the auth code
 * 6. unity-callback page sends the code to Unity's loopback server
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Unity-provided PKCE parameters (required)
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? 'S256';
  const redirectUri = searchParams.get('redirect_uri');
  const clientId = searchParams.get('client_id');
  
  // Auth method selection
  const provider = searchParams.get('provider');
  const connectionId = searchParams.get('connection_id');
  const loginHint = searchParams.get('login_hint');
  
  // Device info (optional)
  const deviceId = searchParams.get('device_id');
  const devicePlatform = searchParams.get('device_platform');

  // Validate required params
  if (!state || !codeChallenge || !redirectUri || !clientId) {
    return NextResponse.json(
      { error: 'Missing required PKCE parameters' },
      { status: 400 }
    );
  }

  // Note: We don't validate redirect_uri here - the API's OAuth endpoint 
  // is the single source of truth for allowed redirect URIs.
  // This avoids duplicating validation logic across services.

  // Build the authorize URL with Unity's PKCE values
  const authorizeUrl = new URL(`${API_URL}/v1/oauth/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', codeChallengeMethod);

  // Auth method - either provider or connection_id
  if (connectionId) {
    authorizeUrl.searchParams.set('connection_id', connectionId);
  } else if (provider) {
    authorizeUrl.searchParams.set('provider', provider);
  }

  if (loginHint) {
    authorizeUrl.searchParams.set('login_hint', loginHint);
  }

  // Device info for session tracking
  if (deviceId) {
    authorizeUrl.searchParams.set('device_id', deviceId);
  }
  if (devicePlatform) {
    authorizeUrl.searchParams.set('device_platform', devicePlatform);
  }

  // Redirect to API OAuth endpoint
  // Note: No cookies stored - Unity handles state verification via its loopback server
  return NextResponse.redirect(authorizeUrl.toString());
}
