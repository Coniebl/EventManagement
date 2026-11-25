import { Suspense } from "react";
import { AttendeeHeader } from "@/components/AttendeeHeader";
import { AttendeeFooter } from "@/components/AttendeeFooter";
import { EventRegistrationClient } from "@/components/EventRegistrationClient";

async function EventPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventRegistrationClient eventId={id} />;
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8fa]">
      <AttendeeHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Suspense
          fallback={
            <div className="mx-auto max-w-4xl animate-pulse space-y-4">
              <div className="h-6 w-32 rounded bg-[#e8edf0]" />
              <div className="h-64 rounded-2xl bg-white" />
            </div>
          }
        >
          <EventPageContent params={params} />
        </Suspense>
      </main>
      <AttendeeFooter />
    </div>
  );
}
