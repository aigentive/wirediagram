import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Wire Diagram — playground",
  description: "Render and explore @aigentive/wire diagrams in the browser."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
