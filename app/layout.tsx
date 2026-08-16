import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Black Berry Options — Live Options Tools + Paper Trading",
  description:
    "Options opportunity scanner, entry/exit timing, strategy selector, and paper trading. Decision support only — not financial advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className={`${montserrat.className} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
