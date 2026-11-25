import { Suspense } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { StaffCheckInClient } from "@/components/StaffCheckInClient";

export default function StaffCheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-[#72808e]">
          Loading QR check-in console...
        </div>
      }
    >
      <StaffAuthGate>{() => <StaffCheckInClient />}</StaffAuthGate>
    </Suspense>
  );
}
