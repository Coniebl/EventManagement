import { Suspense } from "react";
import { AttendeeHeader } from "@/components/AttendeeHeader";
import { AttendeeFooter } from "@/components/AttendeeFooter";
import { TicketLookupClient } from "@/components/TicketLookupClient";

export default function TicketPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8fa]">
      <AttendeeHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Suspense
          fallback={
            <div className="mx-auto max-w-3xl animate-pulse rounded-2xl bg-white p-8 h-52" />
          }
        >
          <TicketLookupClient />
        </Suspense>
      </main>
      <AttendeeFooter />
    </div>
  );
}
