import type { ReactNode } from "react";

export const metadata = {
  title: "Wire — diagram playground",
  description: "Render and explore @aigentive/wire diagrams in the browser."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
          color: "#0f172a",
          background: "#fafafa"
        }}
      >
        {children}
      </body>
    </html>
  );
}
