import Link from "next/link";
import { Ticket, QrCode, Sparkles } from "lucide-react";
import { AttendeeHeader } from "@/components/AttendeeHeader";
import { AttendeeFooter } from "@/components/AttendeeFooter";
import { PublicEventsList } from "@/components/PublicEventsList";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8fa]">
      <AttendeeHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero Banner */}
        <section className="hero-ocean relative overflow-hidden rounded-2xl p-6 text-white shadow-md sm:p-9">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#42d6df]">
                <Sparkles className="h-3.5 w-3.5" />
                Free Community Events · No Sign-in Needed
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Register in seconds. Check in with your QR pass.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#c6dce6]">
                Browse upcoming Cebu tech meetups and workshops, reserve your
                free spot without creating an account, and show your QR ticket
                at the door.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/ticket"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-xs transition hover:bg-white/20"
              >
                <Ticket className="h-4 w-4 text-[#42d6df]" />
                Find My Ticket
              </Link>
              <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-xs text-[#b5d7e2] sm:inline-flex">
                <QrCode className="h-4 w-4 text-[#42d6df]" />
                Instant QR Pass
              </div>
            </div>
          </div>
        </section>

        {/* Events Directory */}
        <section className="mt-8">
          <PublicEventsList />
        </section>
      </main>

      <AttendeeFooter />
    </div>
  );
}
