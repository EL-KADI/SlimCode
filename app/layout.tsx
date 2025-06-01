import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlimCode",
  description:
    "SlimCode is a front-end code minification tool built with Next.js, React, and Tailwind CSS. It enables users to minify HTML, CSS, JSON, JavaScript, and JSX files instantly through file upload or manual code input. The platform features real-time validation, file type detection, size statistics, and client-side processing for security. Users can copy minified code to clipboard or download optimized files with proper naming conventions, all without server uploads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
