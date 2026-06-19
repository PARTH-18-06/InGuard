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
      var lastFired = 0;
      function fireTabEvent() {
        var now = Date.now();
        if (now - lastFired < 2000) return;
        lastFired = now;
        try { window.dispatchEvent(new CustomEvent("inguard-tab-hidden")); } catch(e) {}
      }
      document.addEventListener("visibilitychange", function() {
        console.log("[InGuard-layout] visibilitychange hidden=" + document.hidden);
        if (document.hidden) fireTabEvent();
      });
      window.addEventListener("blur", function() {
        console.log("[InGuard-layout] window blur");
        fireTabEvent();
      });
      var wasHidden = false;
      setInterval(function() {
        var h = document.hidden;
        if (h && !wasHidden) {
          console.log("[InGuard-layout] poll detected hidden");
          fireTabEvent();
        }
        wasHidden = h;
      }, 500);
    })();
  `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
