import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSupabaseServerClient } from "./supabase";
import type { StaffUser } from "./types";

export const SESSION_COOKIE_NAME = "staff_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

interface SessionPayload {
  userId: string;
  exp: number;
}

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    "cebu-event-mgmt-session-secret-2026-change-in-prod-9f8e7d6c5b4a"
  );
}

function signPayload(encoded: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(encoded)
    .digest("base64url");
}

export function createSignedToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

function verifySignedToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = signPayload(encoded);
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!parsed.userId || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createStaffSession(userId: string): Promise<void> {
  const token = createSignedToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearStaffSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentStaff(): Promise<StaffUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySignedToken(token);
  if (!payload) return null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_staff_by_id", {
    p_id: payload.userId,
  });

  if (error || !data) return null;
  return data as StaffUser;
}

export async function requireStaffPage(): Promise<StaffUser> {
  await connection();
  const staff = await getCurrentStaff();
  if (!staff) {
    redirect("/staff/login");
  }
  return staff;
}
