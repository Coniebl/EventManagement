import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book&Go",
  description:
    "Browse upcoming Cebu tech and community events on Book&Go, register for free, get your QR code ticket, and check in smoothly at the door.",
  icons: {
    icon: "/cubepass-logo.png",
    apple: "/cubepass-logo.png",
  },
};

const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('cubepass_theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        {children}
      </body>
    </html>
  );
}
