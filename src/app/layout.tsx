import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AFA",
  description: "A bilingual English and Vietnamese edition of the United Nations website.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
