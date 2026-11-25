import { Suspense } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { StaffAuditClient } from "@/components/StaffAuditClient";

export default function StaffAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-[#72808e]">
          Loading audit log...
        </div>
      }
    >
      <StaffAuthGate>{() => <StaffAuditClient />}</StaffAuthGate>
    </Suspense>
  );
}
