import React from 'react';
import { Linkedin, Sparkles, ExternalLink, Code2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="developer-credit-wrapper">
          <a
            href="https://www.linkedin.com/in/sekhar-parida/"
            target="_blank"
            rel="noopener noreferrer"
            className="developer-linkedin-link-hero"
            title="Connect with Sekhar Parida on LinkedIn"
          >
            <Sparkles size={15} className="sparkle-glow-icon" />
            <span className="dev-hero-label">Developed by</span>
            <div className="dev-hero-pill">
              <Linkedin size={15} className="linkedin-brand-icon" />
              <span className="developer-hero-name">Sekhar Parida</span>
            </div>
            <ExternalLink size={13} className="external-link-arrow" />
          </a>
        </div>

        <div className="footer-right-info">
          <span className="suite-tag">
            <Code2 size={13} /> 4-in-1 Gherkin Suite
          </span>
        </div>
      </div>
    </footer>
  );
}
