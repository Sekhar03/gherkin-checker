import React from 'react';
import { ShieldCheck, Github, Sparkles, CheckCircle2, AlertTriangle, Play, Sun, Moon, Bot, Settings, Loader2 } from 'lucide-react';
import { SAMPLES } from '../utils/samples';

export function Header({ theme, onToggleTheme, currentSampleId, onSelectSample, totalErrors, totalWarnings, overallPass, executionTimeMs, isTested, onAutoFix, onOpenAISettings, isFixingWithAI, hasIssues }) {
  const repos = [
    { name: 'gherkin-lint', url: 'https://github.com/gherkin-lint/gherkin-lint', tag: 'Linter Rules' },
    { name: '@cucumber/gherkin', url: 'https://github.com/cucumber/gherkin-javascript', tag: 'Cucumber AST Parser' },
    { name: 'Matriz88/gherkin-checker', url: 'https://github.com/Matriz88/gherkin-checker', tag: 'Consistency & Steps' },
    { name: 'sistar/gherkin-validator', url: 'https://github.com/sistar/gherkin-validator', tag: 'Lexer & Tokens' }
  ];

  return (
    <header className="header-container">
      <div className="header-main">
        <div className="header-brand">
          <div className="brand-icon">
            <ShieldCheck size={28} className="icon-pulse" />
          </div>
          <div>
            <h1 className="brand-title">Gherkin Checker & Validator Suite</h1>
            <p className="brand-subtitle">
              Multi-Engine Gherkin `.feature` File Analyzer running 4 Checkers Simultaneously
            </p>
          </div>
        </div>

        <div className="header-right-group">
          {isTested && hasIssues && (
            <button
              onClick={onAutoFix}
              disabled={isFixingWithAI}
              className="btn-autofix-header btn-claude-ai"
              title="Use Claude AI to analyze all 4 checker errors and automatically rewrite Gherkin"
            >
              {isFixingWithAI ? <Loader2 size={15} className="spin-icon" /> : <Bot size={16} />}
              <span>{isFixingWithAI ? 'Claude AI Repairing...' : 'Fix with Claude AI'}</span>
            </button>
          )}

          <button
            onClick={onOpenAISettings}
            className="theme-toggle-btn btn-ai-settings"
            title="Configure Anthropic Claude API Key / AI Settings"
          >
            <Settings size={15} />
            <span>AI Key</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'light' ? 'Dark Mode' : 'Light Aesthetic White Mode'}`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Aesthetic White'}</span>
          </button>

          <div className="header-status-pills">
            {isTested ? (
              <>
                <div className={`status-pill ${overallPass ? 'pass' : 'fail'}`}>
                  {overallPass ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{overallPass ? 'PASS' : 'FAIL'}</span>
                </div>
                <div className="metric-pill">
                  <span className="label">Errors:</span>
                  <span className={`val ${totalErrors > 0 ? 'text-red' : 'text-green'}`}>{totalErrors}</span>
                </div>
                <div className="metric-pill">
                  <span className="label">Warnings:</span>
                  <span className="val text-amber">{totalWarnings}</span>
                </div>
                <div className="metric-pill">
                  <span className="label">Analysis:</span>
                  <span className="val">{executionTimeMs} ms</span>
                </div>
              </>
            ) : (
              <div className="status-pill ready">
                <Play size={15} />
                <span>READY TO TEST</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="header-toolbar">
        <div className="samples-bar">
          <span className="samples-label">
            <Sparkles size={14} /> Quick Test Presets:
          </span>
          <div className="samples-buttons">
            {SAMPLES.map(sample => (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample.id)}
                className={`sample-btn ${currentSampleId === sample.id ? 'active' : ''}`}
                title={sample.description}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="repos-bar">
        <span className="repos-title">Integrated Repositories:</span>
        <div className="repos-links">
          {repos.map(r => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="repo-chip"
            >
              <Github size={13} />
              <span className="repo-name">{r.name}</span>
              <span className="repo-tag">{r.tag}</span>
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
