import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ventality — Shilajit",
  description:
    "An immersive scroll-driven 3D product viewer for Ventality Shilajit, built with React Three Fiber.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
