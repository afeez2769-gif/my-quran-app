import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
export const metadata: Metadata = {
  title: "30 Juzuk — Al-Quran Digital",
  description: "Al-Quran Digital dengan Tajwid Berwarna, Terjemahan Bahasa Melayu, Mode Hafazan, dan Mode Mushaf mengikut susun-atur 604 muka surat sebenar.",
  openGraph: {
    title: "30 Juzuk — Al-Quran Digital",
    description: "Tajwid Berwarna • Terjemahan Melayu • Mode Hafazan • Mode Mushaf",
    locale: "ms_MY",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
