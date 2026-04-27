import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Success Nwodor-Joseph | Software Engineer",
  description:
    "Portfolio of Success Nwodor-Joseph, an IT administrator, software developer, and data analyst in Edmonton.",
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
