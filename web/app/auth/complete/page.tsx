"use client";

import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";

function AuthCompleteContent() {
  const { isSignedIn, getToken } = useAuth();
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("device_id");
  const error = searchParams.get("error");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deepLink, setDeepLink] = useState<string>("");
  
  // Prevent double-calls from React Strict Mode
  const hasCalledRef = useRef(false);

  useEffect(() => {
    // Handle error from redirect
    if (error) {
      setStatus("error");
      setErrorMessage(error === "missing_device_id" 
        ? "Missing device ID. Please try again from the app."
        : "Authentication failed. Please try again.");
      return;
    }

    async function completeAuth() {
      // Prevent duplicate calls
      if (hasCalledRef.current) return;
      hasCalledRef.current = true;

      if (!isSignedIn) {
        setStatus("error");
        setErrorMessage("Not signed in. Please sign in first.");
        return;
      }

      if (!deviceId) {
        setStatus("error");
        setErrorMessage("Missing device ID. Please try again from the app.");
        return;
      }

      try {
        // Get the Clerk session token
        const token = await getToken();
        if (!token) {
          throw new Error("Could not get session token");
        }

        // Call the backend to create the handoff code
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/auth/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: deviceId,
            clerkSessionToken: token,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
          setDeepLink(data.deepLink);

          // Try to open the deep link after a short delay
          setTimeout(() => {
            if (data.deepLink) {
              window.location.href = data.deepLink;
            }
          }, 1500);
        } else {
          // Handle different error formats from the backend
          const errorMsg = typeof data.error === "string"
            ? data.error
            : data.error?.message || data.message || "Authentication failed";
          console.error("Backend error:", data);
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error("Auth completion error:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    if (isSignedIn && !error) {
      completeAuth();
    }
  }, [isSignedIn, deviceId, getToken, error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-white text-center mb-8">MAIA</h1>

        {status === "loading" && (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <div className="w-12 h-12 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-300">Completing sign in...</p>
          </div>
        )}

        {status === "success" && (
          <div className="bg-emerald-900/50 border border-emerald-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Success!</h2>
            <p className="text-emerald-200 mb-4">
              You can now close this window and return to SurgicalAR.
            </p>
            <p className="text-sm text-slate-400">
              The app will automatically log you in.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-red-200">{errorMessage}</p>
            <a
              href={`/sign-in${deviceId ? `?device_id=${deviceId}` : ""}`}
              className="mt-4 inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <AuthCompleteContent />
    </Suspense>
  );
}
