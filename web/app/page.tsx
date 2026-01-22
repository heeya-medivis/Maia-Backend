"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function HomeContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for pending device auth (from Unity sign-up flow)
  useEffect(() => {
    if (isSignedIn && isLoaded) {
      // Check if there's a device_id in sessionStorage (saved during sign-up)
      const pendingDeviceId = sessionStorage.getItem("pending_device_id");
      if (pendingDeviceId) {
        sessionStorage.removeItem("pending_device_id");
        router.push(`/auth/complete?device_id=${pendingDeviceId}`);
        return;
      }

      // Also check URL params (in case redirect preserved it)
      const deviceId = searchParams.get("device_id");
      if (deviceId) {
        router.push(`/auth/complete?device_id=${deviceId}`);
        return;
      }
    }
  }, [isSignedIn, isLoaded, router, searchParams]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <h1 className="text-4xl font-bold text-white mb-4">MAIA</h1>
        <p className="text-slate-400 mb-8">Medical imaging AI platform</p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/sign-in")}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/sign-up")}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <h1 className="text-4xl font-bold text-white mb-4">MAIA</h1>
      <p className="text-slate-400 mb-8">You are signed in!</p>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
