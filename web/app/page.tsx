import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();

  // If user is signed in, redirect to appropriate dashboard
  if (session) {
    // Handle token expiration
    if (session.accessTokenExpired) {
      redirect("/api/auth/refresh");
    }
    redirect("/user");
  }

  // Not signed in - show landing page
  return (
    <div className="min-h-screen bg-black grid-bg relative overflow-hidden flex flex-col items-center justify-center">
      {/* Glowing orbs */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      
      <div className="relative z-10 text-center">
        <div className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-14 h-14 bg-[var(--accent)] rounded-[12px] flex items-center justify-center">
            <span className="text-black font-bold text-[28px]">M</span>
          </div>
          <span className="text-[36px] font-bold tracking-tight">Maia</span>
        </div>
        <p className="text-[var(--muted)] mb-8 text-lg">Medical imaging AI platform</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="btn-secondary"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
