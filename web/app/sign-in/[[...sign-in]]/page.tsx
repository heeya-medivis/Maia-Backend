"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function SignInContent() {
  const { isSignedIn, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deviceId = searchParams.get("device_id");
  const fresh = searchParams.get("fresh"); // If "true", sign out first to allow different user

  // Track if we're signing out to prevent race condition
  const [isSigningOut, setIsSigningOut] = useState(false);

  // If fresh=true and user is signed in, sign them out first
  useEffect(() => {
    if (fresh === "true" && isSignedIn && !isSigningOut) {
      setIsSigningOut(true);
      signOut().then(() => {
        // Don't set isSigningOut to false here - wait until isSignedIn becomes false
        // Remove the fresh param and reload
        const newUrl = deviceId
          ? `/sign-in?device_id=${deviceId}`
          : "/sign-in";
        router.replace(newUrl);
      });
    }
  }, [fresh, isSignedIn, signOut, deviceId, router, isSigningOut]);

  // Reset isSigningOut once Clerk confirms sign-out is complete
  useEffect(() => {
    if (isSigningOut && !isSignedIn) {
      setIsSigningOut(false);
    }
  }, [isSigningOut, isSignedIn]);

  // Save device_id to sessionStorage so home page can pick it up after Clerk redirect
  useEffect(() => {
    if (deviceId) {
      sessionStorage.setItem("pending_device_id", deviceId);
    }
  }, [deviceId]);

  // If already signed in and NO device_id, redirect to home (normal web login)
  // When device_id is present (Unity login), user must always complete sign-in explicitly
  // to prevent auto-login from cached browser sessions
  useEffect(() => {
    if (isSignedIn && !deviceId && !isSigningOut) {
      router.push("/");
    }
  }, [isSignedIn, deviceId, router, isSigningOut]);

  // Don't render SignIn component while signing out or if we need to sign out first
  // This prevents Clerk from auto-detecting an existing session
  const needsSignOut = fresh === "true" && isSignedIn;
  const showSignIn = !isSigningOut && !needsSignOut;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">MAIA</h1>
        <p className="text-slate-400">Sign in to continue</p>
      </div>

      {!showSignIn ? (
        <div className="text-white">Preparing sign in...</div>
      ) : (
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-slate-800 border-slate-700",
              footerAction: "hidden", // Hide Clerk's "Don't have an account? Sign up" link
            },
          }}
          forceRedirectUrl={deviceId ? `/auth/complete?device_id=${deviceId}` : "/"}
        />
      )}

      {/* Custom sign-up link that preserves device_id */}
      <p className="mt-6 text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <a
          href={deviceId ? `/sign-up?device_id=${deviceId}` : "/sign-up"}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          Sign up
        </a>
      </p>

      {deviceId && (
        <p className="mt-4 text-sm text-slate-500">
          You&apos;ll be redirected back to the app after signing in.
        </p>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
