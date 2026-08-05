import React from 'react';
import { ShieldCheck, Github, Sparkles, CheckCircle2, AlertTriangle, Play, Sun, Moon, Bot, Settings, Loader2, Code2, AlertCircle } from 'lucide-react';
import { SAMPLES } from '../utils/samples';

export function Header({ theme, onToggleTheme, currentSampleId, onSelectSample, totalErrors, totalWarnings, overallPass, executionTimeMs, isTested, onAutoFix, onOpenAISettings, isFixingWithAI, hasIssues }) {
  const repos = [
    { name: 'gherkin-lint', url: 'https://github.com/gherkin-lint/gherkin-lint', tag: 'Linter Rules' },
    { name: '@cucumber/gherkin', url: 'https://github.com/cucumber/gherkin-javascript', tag: 'Cucumber AST Parser' },
    { name: 'Matriz88/gherkin-checker', url: 'https://github.com/Matriz88/gherkin-checker', tag: 'Consistency & Steps' },
    { name: 'sistar/gherkin-validator', url: 'https://github.com/sistar/gherkin-validator', tag: 'Lexer & Tokens' }
  ];

  // Helper for cleaner sample titles
  const getSampleShortName = (sample) => {
    if (sample.id === 'valid') return 'Valid Feature';
    if (sample.id === 'cucumber_official') return 'Cucumber Official Spec';
    if (sample.id === 'cucumber_docstrings') return 'DocStrings & Tables';
    if (sample.id === 'syntax_error') return 'Syntax Errors';
    if (sample.id === 'linter_issue') return 'Linter Violations';
    if (sample.id === 'inconsistent_step') return 'Inconsistent Steps';
    return sample.name;
  };

  const getSampleIcon = (sampleId) => {
    if (sampleId === 'valid') return <CheckCircle2 size={13} className="text-green" />;
    if (sampleId === 'cucumber_official' || sampleId === 'cucumber_docstrings') return <Sparkles size={13} className="text-emerald" />;
    if (sampleId === 'syntax_error') return <AlertCircle size={13} className="text-red" />;
    if (sampleId === 'linter_issue') return <AlertTriangle size={13} className="text-amber" />;
    return <Code2 size={13} />;
  };

  return (
    <header className="header-container">
      {/* Tier 1: Main Header Bar */}
      <div className="header-main">
        <div className="header-brand">
          <div className="brand-icon">
            <ShieldCheck size={26} className="icon-pulse" />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <h1 className="brand-title">Gherkin Checker & Validator</h1>
              <span className="version-badge">4-in-1 Suite</span>
            </div>
            <p className="brand-subtitle">
              Multi-Engine Gherkin <code className="code-tag">.feature</code> File Analyzer running 4 Checkers Simultaneously
            </p>
          </div>
        </div>

        <div className="header-right-group">
          {/* Status Badge & Metrics */}
          <div className="header-status-pills">
            {isTested ? (
              <>
                <div className={`status-pill ${overallPass ? 'pass' : 'fail'}`}>
                  {overallPass ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{overallPass ? 'PASS' : 'FAIL'}</span>
                </div>
                <div className="metrics-group">
                  <div className="metric-pill" title="Total Errors Found">
                    <span className="label">Errors</span>
                    <span className={`val ${totalErrors > 0 ? 'text-red' : 'text-green'}`}>{totalErrors}</span>
                  </div>
                  <div className="metric-pill" title="Total Warnings">
                    <span className="label">Warnings</span>
                    <span className="val text-amber">{totalWarnings}</span>
                  </div>
                  <div className="metric-pill" title="Execution Time">
                    <span className="label">Speed</span>
                    <span className="val">{executionTimeMs}ms</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="status-pill ready">
                <Play size={14} fill="currentColor" />
                <span>READY TO TEST</span>
              </div>
            )}
          </div>

          <div className="header-actions-group">
            {isTested && hasIssues && (
              <button
                onClick={onAutoFix}
                disabled={isFixingWithAI}
                className="btn-autofix-header btn-claude-ai"
                title="Deterministically repair all errors & warnings across all 4 checkers using internal rule engine (No AI required)"
              >
                {isFixingWithAI ? <Loader2 size={14} className="spin-icon" /> : <Sparkles size={15} />}
                <span>{isFixingWithAI ? 'Fixing...' : 'Auto-Fix (No AI)'}</span>
              </button>
            )}

            <button
              onClick={onOpenAISettings}
              className="theme-toggle-btn btn-ai-settings"
              title="Configure Anthropic Claude API Key / AI Settings"
            >
              <Settings size={14} />
              <span>AI Key</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="theme-toggle-btn"
              title={`Switch to ${theme === 'light' ? 'Dark Mode' : 'Light Theme'}`}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Sub-toolbar for Quick Presets and Integrated Repos */}
      <div className="header-toolbar">
        <div className="samples-bar">
          <span className="samples-label">
            <Sparkles size={14} /> Quick Presets:
          </span>
          <div className="samples-buttons">
            {SAMPLES.map(sample => (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample.id)}
                className={`sample-btn ${currentSampleId === sample.id ? 'active' : ''}`}
                title={sample.description}
              >
                {getSampleIcon(sample.id)}
                <span>{getSampleShortName(sample)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="repos-bar">
          <span className="repos-title">Engines:</span>
          <div className="repos-links">
            {repos.map(r => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="repo-chip"
                title={`Repository: ${r.name} (${r.tag})`}
              >
                <Github size={12} />
                <span className="repo-name">{r.name}</span>
                <span className="repo-tag">{r.tag}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

