import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KitHub — The Universal Agent Interface",
  description: "The global registry for reusable, autonomous AI agent workflows. Stop prompting. Start publishing.",
  openGraph: {
    title: "KitHub — The USB-C for AI",
    description: "Discover, install, and share versioned AI agent workflows. Agent-first. Safe by design.",
    type: "website",
    url: "https://kithub.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "KitHub — The USB-C for AI",
    description: "The global registry for reusable AI agent workflows.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <a href="/" className="nav-brand">KitHub</a>
            <div className="nav-links">
              <a href="/registry">Registry</a>
              <a href="/publish">Publish</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/auth" className="btn btn-sm">Sign In</a>
            </div>
          </div>
        </nav>

        {children}

        <footer className="footer">
          <div className="container">
            <p className="footer-tagline">Stop prompting. Start publishing.</p>
            <div className="footer-links">
              <a href="/registry">Registry</a>
              <a href="/publish">Publish</a>
              <a href="https://github.com/kithub" target="_blank" rel="noreferrer">GitHub</a>
              <a href="/docs">API Docs</a>
            </div>
            <p className="footer-copy">© {new Date().getFullYear()} KitHub. The USB-C for AI.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
