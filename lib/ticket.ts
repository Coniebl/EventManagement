import crypto from "crypto";
import QRCode from "qrcode";

const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Unambiguous characters (no 0/O, 1/I)

function getQrSecret(): string {
  return (
    process.env.QR_HMAC_SECRET ||
    "cebu-event-mgmt-qr-hmac-secret-2026-change-in-prod-1a2b3c4d5e6f"
  );
}

function derivePrefix(eventTitle?: string): string {
  if (!eventTitle) return "EVT";
  const words = eventTitle
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  }
  return (words[0]?.slice(0, 3) || "EVT").toUpperCase();
}

function computeSignatureTag(payload: string): string {
  return crypto
    .createHmac("sha256", getQrSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();
}

/**
 * Generates a cryptographically random, HMAC-signed ticket code.
 * Format: <PREFIX>-<8_RANDOM_CHARS>-<4_HMAC_HEX>
 * Example: CDM-7K3P9Q4M-C188
 * Sequential or guessed codes (e.g. CDM-000001) fail HMAC verification immediately.
 */
export function generateSignedTicketCode(eventTitle?: string): string {
  const prefix = derivePrefix(eventTitle);
  const bytes = crypto.randomBytes(8);
  let randomPart = "";
  for (let i = 0; i < 8; i++) {
    randomPart += CHARSET[bytes[i] % CHARSET.length];
  }
  const base = `${prefix}-${randomPart}`;
  const sig = computeSignatureTag(base);
  return `${base}-${sig}`;
}

/**
 * Verifies the HMAC signature embedded in a ticket code using timing-safe comparison.
 */
export function verifyTicketCodeSignature(rawCode: string): boolean {
  const code = rawCode.trim().toUpperCase();
  const parts = code.split("-");
  if (parts.length !== 3) return false;

  const [prefix, randomPart, providedSig] = parts;
  if (!prefix || randomPart.length !== 8 || providedSig.length !== 4) {
    return false;
  }

  const expectedSig = computeSignatureTag(`${prefix}-${randomPart}`);
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generates a crisp QR code Data URL containing the signed ticket code.
 */
export async function generateTicketQrDataUrl(
  ticketCode: string
): Promise<string> {
  return QRCode.toDataURL(ticketCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: {
      dark: "#092d40",
      light: "#ffffff",
    },
  });
}
