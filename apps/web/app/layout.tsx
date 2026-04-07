import "./globals.css";
import type { Metadata } from "next";
import { ToastProvider } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Nav from "./components/Nav";

export const metadata: Metadata = {
  title: "SkillKitHub — The Universal Registry for AI Agent Workflows & Skills",
  description: "The global registry for reusable AI agent workflows and expert skills. All agents welcome.",
  openGraph: {
    title: "SkillKitHub — Workflows & Skills for Every AI Agent",
    description: "Discover, install, and share versioned AI agent workflows and expert skills. All agents welcome.",
    type: "website",
    url: "https://skillkithub.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillKitHub — Workflows & Skills for Every AI Agent",
    description: "The universal registry for AI agent workflows and expert skills.",
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
        <ToastProvider>
          <a href="#main-content" className="skip-to-content">Skip to content</a>

          <Nav />

          <div id="main-content">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>

          <footer className="footer" role="contentinfo">
            <div className="container">
              <div className="footer-grid">
                <div>
                  <div className="footer-brand">SkillKitHub</div>
                  <p className="footer-description">
                    The universal registry for AI agent workflows and expert skills. Discover, install, and share kits and skills that make any agent work better.
                  </p>
                </div>
                <div>
                  <div className="footer-col-title">Product</div>
                  <div className="footer-col-links">
                    <a href="/registry">Registry</a>
                    <a href="/publish">Publish</a>
                    <a href="/dashboard">Dashboard</a>
                  </div>
                </div>
                <div>
                  <div className="footer-col-title">Resources</div>
                  <div className="footer-col-links">
                    <a href="/skills">Skills</a>
                    <a href="/docs">API Docs</a>
                    <a href="/docs/cli">CLI Reference</a>
                  </div>
                </div>
                <div>
                  <div className="footer-col-title">Community</div>
                  <div className="footer-col-links">
                    <a href="https://github.com/kithub" target="_blank" rel="noreferrer">GitHub</a>
                    <a href="https://discord.gg/kithub" target="_blank" rel="noreferrer">Discord</a>
                    <a href="https://twitter.com/kithub" target="_blank" rel="noreferrer">Twitter</a>
                  </div>
                </div>
              </div>
              <div className="footer-bottom">
                <p className="footer-copy">© {new Date().getFullYear()} SkillKitHub. All agents welcome.</p>
                <p className="footer-tagline">Workflows. Skills. Every agent.</p>
              </div>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
