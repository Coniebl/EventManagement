import { requireStaffPage } from "@/lib/session";
import { StaffShell } from "./StaffShell";
import type { StaffUser } from "@/lib/types";

interface StaffAuthGateProps {
  children: (staff: StaffUser) => React.ReactNode;
}

export async function StaffAuthGate({ children }: StaffAuthGateProps) {
  const staff = await requireStaffPage();
  return <StaffShell staff={staff}>{children(staff)}</StaffShell>;
}
