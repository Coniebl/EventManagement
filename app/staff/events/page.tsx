import { Suspense } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { StaffEventsClient } from "@/components/StaffEventsClient";

export default function StaffEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-[#72808e]">
          Loading events...
        </div>
      }
    >
      <StaffAuthGate>
        {(staff) => <StaffEventsClient staff={staff} />}
      </StaffAuthGate>
    </Suspense>
  );
}
