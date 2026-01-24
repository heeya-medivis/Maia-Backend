"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

function SignUpContent() {
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deviceId = searchParams.get("device_id");
  const pollToken = searchParams.get("poll_token");

  // Save device_id and poll_token to sessionStorage so home page can pick it up after Clerk redirect
  useEffect(() => {
    if (deviceId) {
      sessionStorage.setItem("pending_device_id", deviceId);
    }
    if (pollToken) {
      sessionStorage.setItem("pending_poll_token", pollToken);
    }
  }, [deviceId, pollToken]);

  // If already signed in and we have a device_id, redirect to complete
  useEffect(() => {
    if (isSignedIn && deviceId) {
      sessionStorage.removeItem("pending_device_id");
      sessionStorage.removeItem("pending_poll_token");
      const completeUrl = `/auth/complete?device_id=${deviceId}${pollToken ? `&poll_token=${pollToken}` : ''}`;
      router.push(completeUrl);
    }
  }, [isSignedIn, deviceId, pollToken, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">MAIA</h1>
        <p className="text-slate-400">Create your account</p>
      </div>

      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-slate-800 border-slate-700",
            footerAction: "hidden", // Hide Clerk's "Already have an account? Sign in" link
          },
        }}
        forceRedirectUrl={deviceId 
          ? `/auth/complete?device_id=${deviceId}${pollToken ? `&poll_token=${pollToken}` : ''}`
          : "/"
        }
      />

      {/* Custom sign-in link that preserves device_id and poll_token */}
      <p className="mt-6 text-sm text-slate-400">
        Already have an account?{" "}
        <a
          href={deviceId 
            ? `/sign-in?device_id=${deviceId}${pollToken ? `&poll_token=${pollToken}` : ''}`
            : "/sign-in"
          }
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          Sign in
        </a>
      </p>

      {deviceId && (
        <p className="mt-4 text-sm text-slate-500">
          You&apos;ll be redirected back to the app after signing up.
        </p>
      )}
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
