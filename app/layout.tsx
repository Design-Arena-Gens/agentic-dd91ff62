import type { Metadata } from "next";
import "./globals.css";
import { Crimson_Text } from "next/font/google";

const crimson = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Whisperglass",
  description: "A 30-second horror story experience"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={crimson.className}>{children}</body>
    </html>
  );
}
