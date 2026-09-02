import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { MainLayout } from "@/components/MainLayout";
import "katex/dist/katex.min.css";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adaptive RAG Tutor",
  description: "Personalized AI tutoring grounded in course materials",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="flex h-full flex-col overflow-hidden bg-background text-foreground antialiased">
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
