import { Suspense } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { StaffDashboardClient } from "@/components/StaffDashboardClient";

export default function StaffDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-[#72808e]">
          Loading staff dashboard...
        </div>
      }
    >
      <StaffAuthGate>
        {(staff) => <StaffDashboardClient staff={staff} />}
      </StaffAuthGate>
    </Suspense>
  );
}
