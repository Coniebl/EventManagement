import { Suspense } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { StaffAttendeesClient } from "@/components/StaffAttendeesClient";

export default function StaffAttendeesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-[#72808e]">
          Loading attendees...
        </div>
      }
    >
      <StaffAuthGate>
        {(staff) => (
          <Suspense
            fallback={
              <div className="p-6 text-sm text-[#72808e]">
                Loading attendee list...
              </div>
            }
          >
            <StaffAttendeesClient staff={staff} />
          </Suspense>
        )}
      </StaffAuthGate>
    </Suspense>
  );
}
