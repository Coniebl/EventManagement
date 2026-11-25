import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventFlow Cebu — Event Registration & QR Check-in",
  description:
    "Browse upcoming Cebu tech and community events, register for free, get your QR code ticket, and check in smoothly at the door.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f5f8fa] text-[#14222e]">
        {children}
      </body>
    </html>
  );
}
