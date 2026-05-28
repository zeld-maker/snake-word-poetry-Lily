import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🐍 诗意贪吃蛇 - Snake Word Poetry",
  description: "吃掉单词，收集灵感，创作诗歌！一个融合贪吃蛇游戏与AI诗歌创作的趣味应用。",
  keywords: ["贪吃蛇", "诗歌", "AI", "诗词创作", "文字游戏", "Snake Game", "Poetry", "Word Game"],
  authors: [{ name: "Lily" }],
  openGraph: {
    title: "🐍 诗意贪吃蛇 - Snake Word Poetry",
    description: "吃掉单词，收集灵感，创作诗歌！一个融合贪吃蛇游戏与AI诗歌创作的趣味应用。",
    siteName: "诗意贪吃蛇",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "🐍 诗意贪吃蛇 - Snake Word Poetry",
    description: "吃掉单词，收集灵感，创作诗歌！",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
