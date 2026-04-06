import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KitHub | The Universal Agent Interface",
  description: "The global registry for autonomous AI agent workflows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <a href="/" className="nav-brand">KitHub</a>
            <div className="nav-links">
              <a href="/registry">Registry</a>
              <a href="/dashboard">Dashboard</a>
              <a href="https://github.com/kithub" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
