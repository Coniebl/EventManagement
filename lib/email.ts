import nodemailer from "nodemailer";
import { formatCebuDate, formatCebuTimeRange } from "./time";
import { generateTicketQrDataUrl } from "./ticket";

interface TicketEmailParams {
  to: string;
  attendeeName: string;
  eventTitle: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  ticketCode: string;
  status: "confirmed" | "waitlisted";
  waitlistPosition?: number | null;
  isPromotion?: boolean;
}

export interface EmailDeliveryResult {
  sent: boolean;
  provider: "resend" | "smtp" | "ethereal" | "console";
  previewUrl?: string;
  error?: string;
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function buildEmailHtml(
  params: TicketEmailParams,
  ticketUrl: string,
  hasQrAttachment: boolean
): string {
  const dateStr = formatCebuDate(params.startsAt);
  const timeStr = formatCebuTimeRange(params.startsAt, params.endsAt);

  const heading = params.isPromotion
    ? "You're off the waitlist — your spot is confirmed!"
    : params.status === "waitlisted"
      ? `You're #${params.waitlistPosition ?? ""} on the waitlist`
      : "Your event ticket is confirmed!";

  const qrBlock =
    params.status === "confirmed" && hasQrAttachment
      ? `
      <div style="text-align:center;margin:24px 0;padding:20px;background:#f5f8fa;border:1px solid #e8edf0;border-radius:14px;">
        <img src="cid:ticket-qr" alt="Ticket QR Code" width="200" height="200" style="display:block;margin:0 auto 12px;border-radius:8px;" />
        <div style="font-family:monospace;font-size:16px;font-weight:700;color:#092d40;letter-spacing:1px;">${params.ticketCode}</div>
        <div style="font-size:12px;color:#72808e;margin-top:4px;">Present this QR code at the venue entrance</div>
      </div>`
      : `
      <div style="margin:20px 0;padding:16px;background:#fff2df;border:1px solid #f5d8aa;border-radius:12px;color:#9a5705;font-size:13px;">
        <strong>Waitlist Reference Code:</strong> <code>${params.ticketCode}</code><br/>
        Waitlisted attendees do not receive a QR entry pass yet. We will email you right away if a spot opens up!
      </div>`;

  return `
  <div style="font-family:Inter,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#14222e;">
    <div style="background:linear-gradient(120deg,#092d40,#0c4560 58%,#106581);color:#fff;padding:24px;border-radius:16px 16px 0 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#42d6df;">EventFlow Cebu</div>
      <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;">${heading}</h1>
    </div>
    <div style="background:#ffffff;border:1px solid #e8edf0;border-top:0;border-radius:0 0 16px 16px;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#14222e;">Hi <strong>${params.attendeeName}</strong>,</p>
      <div style="background:#f8fafb;border:1px solid #e8edf0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;">
        <div style="font-weight:700;font-size:15px;color:#14222e;margin-bottom:4px;">${params.eventTitle}</div>
        <div><strong>Date:</strong> ${dateStr}</div>
        <div><strong>Time:</strong> ${timeStr}</div>
        <div><strong>Venue:</strong> ${params.venue}</div>
      </div>
      ${qrBlock}
      <div style="text-align:center;margin-top:20px;">
        <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#20c9db,#168bd0);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:10px;">View My Ticket Online</a>
      </div>
    </div>
  </div>`;
}

export async function sendTicketEmail(
  params: TicketEmailParams
): Promise<EmailDeliveryResult> {
  const ticketUrl = `${getAppUrl()}/ticket?code=${encodeURIComponent(params.ticketCode)}&contact=${encodeURIComponent(params.to)}`;
  const subject = params.isPromotion
    ? `[Confirmed] You're promoted from the waitlist: ${params.eventTitle}`
    : params.status === "waitlisted"
      ? `[Waitlist #${params.waitlistPosition ?? ""}] ${params.eventTitle}`
      : `[Ticket] ${params.eventTitle} — ${params.ticketCode}`;

  let qrBase64: string | null = null;
  if (params.status === "confirmed") {
    const dataUrl = await generateTicketQrDataUrl(params.ticketCode);
    qrBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  }

  const html = buildEmailHtml(params, ticketUrl, Boolean(qrBase64));
  const from = process.env.EMAIL_FROM || "EventFlow Cebu <noreply@eventflow.local>";

  // Option A: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject,
          html,
          attachments: qrBase64
            ? [
                {
                  filename: `${params.ticketCode}.png`,
                  content: qrBase64,
                  content_id: "ticket-qr",
                },
              ]
            : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { sent: false, provider: "resend", error: text };
      }
      return { sent: true, provider: "resend" };
    } catch (err) {
      return {
        sent: false,
        provider: "resend",
        error: err instanceof Error ? err.message : "Resend error",
      };
    }
  }

  // Option B: Configured SMTP (Mailtrap, etc.)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const info = await transporter.sendMail({
        from,
        to: params.to,
        subject,
        html,
        attachments: qrBase64
          ? [
              {
                filename: `${params.ticketCode}.png`,
                content: Buffer.from(qrBase64, "base64"),
                cid: "ticket-qr",
              },
            ]
          : [],
      });
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      return { sent: true, provider: "smtp", previewUrl };
    } catch (err) {
      return {
        sent: false,
        provider: "smtp",
        error: err instanceof Error ? err.message : "SMTP error",
      };
    }
  }

  // Fallback: log clearly in server console so registration never fails without SMTP keys
  console.info(
    `[Email Preview - Configure RESEND_API_KEY or SMTP_* to deliver] To: ${params.to} | Subject: ${subject} | Ticket URL: ${ticketUrl}`
  );
  return { sent: false, provider: "console" };
}
