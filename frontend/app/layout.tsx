import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",
  },
  title: "InGuard1",
  description: "AI-powered interview platform for recruiters and candidates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
    (function() {
      function fireTabEvent() {
        try { window.dispatchEvent(new CustomEvent("inguard-tab-hidden")); } catch(e) {
          try { var ev = document.createEvent("Event"); ev.initEvent("inguard-tab-hidden",true,true); window.dispatchEvent(ev); } catch(e2) {}
        }
      }
      document.addEventListener("visibilitychange", function() { if (document.hidden) fireTabEvent(); });
      window.addEventListener("blur", function() { fireTabEvent(); });
      window.addEventListener("pagehide", function() { fireTabEvent(); });
    })();
  `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
