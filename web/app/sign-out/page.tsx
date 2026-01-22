"use client";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const { isSignedIn, signOut } = useAuth();
  const router = useRouter();

  // Auto sign-out when page loads
  useEffect(() => {
    if (isSignedIn) {
      signOut().then(() => {
        router.refresh();
      });
    }
  }, [isSignedIn, signOut, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-8">SurgicalAR</h1>

        {isSignedIn ? (
          <div className="bg-slate-800 rounded-xl p-8">
            <p className="text-slate-300 mb-6">Signing you out...</p>
            <SignOutButton>
              <button className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">
                Click here if not redirected
              </button>
            </SignOutButton>
          </div>
        ) : (
          <div className="bg-emerald-900/50 border border-emerald-700 rounded-xl p-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Signed Out</h2>
            <p className="text-emerald-200 mb-4">You have been signed out successfully.</p>
            <a
              href="/sign-in"
              className="inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Sign In Again
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
