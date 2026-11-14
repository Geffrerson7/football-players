import Link from "next/link";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="fp-home-footer">
      <div className="fp-footer-inner">
        <Link href="/" className="fp-footer-brand">
          <span className="fp-footer-logo">FP</span>

          <span className="fp-footer-brand-text">
            <strong>FOOTBALL PLAYERS</strong>
            <span>FOOTBALL DATABASE</span>
          </span>
        </Link>

        <div className="fp-footer-divider" />

        <p className="fp-footer-tagline">
          Cada dorsal cuenta<span>.</span>
        </p>

        <div className="fp-footer-credit">
          <span className="fp-footer-dot" />
          <span>DESIGNED BY</span>
          <strong>GAMERSON COMPANY</strong>
        </div>
      </div>

      <div className="fp-footer-bottom">
        <span>FOOTBALL PLAYER</span>
        <span className="fp-footer-bottom-line" />
        <span>EST. 2026</span>
      </div>
    </footer>
  );
}
