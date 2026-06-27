import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoMailer Pro | Personalized Bulk Email Campaigns",
  description: "Configure SMTP, upload CSV lists, insert dynamic variables, and send scheduled email campaigns with real-time analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

