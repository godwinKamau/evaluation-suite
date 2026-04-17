import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Evaluation Suite",
  description: "Evaluate models with LLM-as-judge and LangSmith",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
