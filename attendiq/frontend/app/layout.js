import { Fraunces, Figtree, Caveat } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "WONK", "opsz"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500", "700"] });

export const metadata = {
  title: { default: "AttendIQ", template: "%s · AttendIQ" },
  description: "Your Campus. Your Classes. Your Progress. — RFID-based smart attendance.",
  icons: { icon: "/icon.svg" },
};

export const viewport = { themeColor: "#f8f4ea", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${figtree.variable} ${caveat.variable}`}>
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
