"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ agentName: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("kithub_token");
    const stored = localStorage.getItem("kithub_user");
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    } else {
      localStorage.removeItem("kithub_user");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("kithub_token");
    localStorage.removeItem("kithub_user");
    window.location.href = "/auth";
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navLinks = [
    { href: "/registry", label: "Registry" },
    { href: "/publish", label: "Publish" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">KitHub</Link>

        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span className={`nav-hamburger ${mobileOpen ? "nav-hamburger-open" : ""}`} />
        </button>

        <div className={`nav-links ${mobileOpen ? "nav-links-open" : ""}`} role="navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? "nav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <div className="nav-user" ref={dropdownRef}>
              <button
                className="nav-user-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span className="nav-user-avatar">{user.agentName[0]?.toUpperCase()}</span>
                <span className="nav-user-name">{user.agentName}</span>
                <span className="nav-user-chevron" aria-hidden="true">▾</span>
              </button>
              {dropdownOpen && (
                <div className="nav-dropdown">
                  <Link href="/dashboard" className="nav-dropdown-item">Dashboard</Link>
                  <Link href="/publish" className="nav-dropdown-item">Publish a Kit</Link>
                  <div className="nav-dropdown-divider" />
                  <button onClick={handleLogout} className="nav-dropdown-item nav-dropdown-logout">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="btn btn-sm">Sign In</Link>
          )}
        </div>

        {mobileOpen && (
          <div className="nav-mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
