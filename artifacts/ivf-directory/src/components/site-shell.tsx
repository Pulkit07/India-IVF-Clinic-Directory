import type { ReactNode } from "react";
import { Link } from "wouter";

const navItems = [
  { href: "/clinics", label: "Find a clinic" },
  { href: "/locations", label: "Locations" },
  { href: "/glossary", label: "Behind the Rates" },
];

function Logo() {
  return (
    <Link href="/" className="brand" data-testid="link-home">
      <span>
        Open<span className="openivf-name">IVF</span>
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="shell-inner header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                data-testid={`link-nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link
              href="/about"
              className="header-about"
              data-testid="link-about"
            >
              About this directory
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell-inner footer-grid">
        <div>
          <Logo />
          <p className="footer-note">
            A public reference for understanding IVF clinic information in
            India.
          </p>
        </div>
        <div>
          <p className="footer-heading">Explore</p>
          {navItems.slice(0, 2).map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="footer-link"
              data-testid={`footer-link-${i.label.toLowerCase().replaceAll(" ", "-")}`}
            >
              {i.label}
            </Link>
          ))}
        </div>
        <div>
          <p className="footer-heading">Read first</p>
          <Link
            href="/glossary"
            className="footer-link"
            data-testid="footer-link-glossary"
          >
            Behind the Rates
          </Link>
        </div>
        <div>
          <p className="footer-heading">Project</p>
          <Link
            href="/about"
            className="footer-link"
            data-testid="footer-link-about"
          >
            About
          </Link>
          <Link
            href="/corrections"
            className="footer-link"
            data-testid="footer-link-corrections"
          >
            Suggest a correction
          </Link>
          <Link
            href="/privacy"
            className="footer-link"
            data-testid="footer-link-privacy"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="footer-link"
            data-testid="footer-link-terms"
          >
            Terms
          </Link>
        </div>
      </div>
      <div className="shell-inner footer-bottom">
        <span>Demonstration directory · India</span>
        <span>Information, not medical advice.</span>
      </div>
    </footer>
  );
}
