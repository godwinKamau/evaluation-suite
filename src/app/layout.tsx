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
      <body className="min-h-screen bg-win95-desktop p-4 font-win95 text-[11px] antialiased">
        {children}
      </body>
    </html>
  );
}
