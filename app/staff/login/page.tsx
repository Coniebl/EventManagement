"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, AlertCircle, Lock } from "lucide-react";

function StaffLoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/staff";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid username or password.");
        return;
      }
      const target =
        nextPath.startsWith("/staff") && nextPath !== "/staff/login"
          ? nextPath
          : "/staff";
      window.location.assign(target);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#e8edf0] bg-white p-8 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#20c9db] to-[#168bd0] text-white shadow-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight text-[#14222e]">
            EventFlow Admin
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#72808e]">
            Staff & Organizer Portal
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1392b4]">
          Authorized Personnel Only
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#14222e]">
          Staff Sign In
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-[#72808e]">
          Sign in to manage events, inspect attendee registrations, and scan QR
          tickets at the door. Attendees do not need an account.
        </p>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#f5c2c2] bg-[#ffeded] px-3.5 py-2.5 text-xs font-semibold text-[#b34a4a]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-bold text-[#14222e]"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. organizer or doorstaff"
            className="mt-1.5 h-11 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 text-sm text-[#14222e] outline-none transition focus:border-[#168bd0] focus:bg-white focus:ring-2 focus:ring-[#168bd0]/15"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-bold text-[#14222e]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="mt-1.5 h-11 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 text-sm text-[#14222e] outline-none transition focus:border-[#168bd0] focus:bg-white focus:ring-2 focus:ring-[#168bd0]/15"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold"
        >
          <Lock className="h-4 w-4" />
          {loading ? "Signing in..." : "Sign In to Staff Portal"}
        </button>
      </form>

      <div className="mt-6 border-t border-[#e8edf0] pt-4 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#168bd0] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Public Attendee Events
        </Link>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f8fa] px-4 py-10">
      <Suspense
        fallback={
          <div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-white" />
        }
      >
        <StaffLoginForm />
      </Suspense>
    </div>
  );
}
