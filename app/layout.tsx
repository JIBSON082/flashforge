import type { Metadata } from "next";
import { Space_Grotesk, Caveat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlashForge — Turn slides into flashcards",
  description:
    "Upload your slides, pick MCQ, SAQ, or Theory mode, and get a full deck of flashcards that covers every point. No sign up needed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${caveat.variable} ${jetbrains.variable}`}>
      <body className="font-display bg-bg text-text min-h-screen antialiased">
        <div className="fixed inset-0 pointer-events-none bg-noise mix-blend-overlay" />
        {children}
      </body>
    </html>
  );
}

