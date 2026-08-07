import React from 'react';
import { Linkedin, Heart, ExternalLink, Code2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="developer-credit-wrapper">
          <span className="developed-by-label">
            Developed by
          </span>
          <a
            href="https://www.linkedin.com/in/sekhar-parida/"
            target="_blank"
            rel="noopener noreferrer"
            className="developer-linkedin-link"
            title="Connect with Sekhar Parida on LinkedIn"
          >
            <Linkedin size={15} className="linkedin-icon" />
            <span className="developer-name">Sekhar Parida</span>
            <ExternalLink size={12} className="external-icon" />
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
