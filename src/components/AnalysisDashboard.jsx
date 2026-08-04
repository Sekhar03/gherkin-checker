import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, Lightbulb, Wrench, FileCode, Tag, Play, ShieldCheck } from 'lucide-react';

export function AnalysisDashboard({ results, isTested, onRunTest, onHighlightLine }) {
  const { overallPass, totalErrors, totalWarnings, checkers } = results || {
    overallPass: false,
    totalErrors: 0,
    totalWarnings: 0,
    checkers: [
      { name: 'gherkin-lint', repo: 'https://github.com/gherkin-lint/gherkin-lint', description: 'Gherkin Best Practices & Code Quality Linter', pass: true, errors: [], warnings: [] },
      { name: '@cucumber/gherkin', repo: 'https://github.com/cucumber/gherkin-javascript', description: 'Official Cucumber Gherkin AST Parser & Syntax Validator', pass: true, errors: [], warnings: [] },
      { name: 'Matriz88/gherkin-checker', repo: 'https://github.com/Matriz88/gherkin-checker', description: 'Scenario Consistency & Step Definition Structure Matcher', pass: true, errors: [], warnings: [] },
      { name: 'sistar/gherkin-validator', repo: 'https://github.com/sistar/gherkin-validator', description: 'Strict Gherkin Lexer & Token Structure Validator', pass: true, errors: [], warnings: [] }
    ]
  };

  useEffect(() => {
    if (isTested && overallPass && checkers.length > 0) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [isTested, overallPass]);

  // UN-TESTED / INITIAL STATE
  if (!isTested) {
    return (
      <div className="dashboard-container">
        <div className="hero-banner banner-untested">
          <div className="banner-icon-box">
            <ShieldCheck size={48} className="icon-ready" />
          </div>

          <div className="banner-content">
            <div className="banner-tag">READY FOR VALIDATION</div>
            <h2 className="banner-title">Paste your Gherkin file & click "Test Gherkin"</h2>
            <p className="banner-desc">
              Your feature file will pass through all 4 checkers simultaneously (@cucumber/gherkin AST, gherkin-lint rules, Matriz88 consistency, and sistar lexer tokens).
            </p>
          </div>
        </div>

        {/* Preview of 4 Checkers Ready */}
        <div className="checkers-grid">
          {checkers.map((c) => (
            <div key={c.name} className="checker-card ready-card">
              <div className="checker-card-header">
                <div className="checker-info">
                  <span className="checker-name">{c.name}</span>
                  <a href={c.repo} target="_blank" rel="noreferrer" className="repo-link">
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="checker-badge ready">
                  <span>READY</span>
                </div>
              </div>
              <p className="checker-desc">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // TESTED STATE
  return (
    <div className="dashboard-container">
      {/* Prominent Overall Pass/Fail Status Banner */}
      <div className={`hero-banner ${overallPass ? 'banner-pass' : 'banner-fail'}`}>
        <div className="banner-icon-box">
          {overallPass ? (
            <CheckCircle2 size={48} className="icon-pass" />
          ) : (
            <XCircle size={48} className="icon-fail" />
          )}
        </div>

        <div className="banner-content">
          <div className="banner-tag">
            {overallPass ? 'ALL 4 CHECKERS PASSED' : 'CHECK FAILURES DETECTED'}
          </div>
          <h2 className="banner-title">
            {overallPass ? '✅ Gherkin Passed All 4 Checkers!' : `❌ Gherkin Failed with ${totalErrors} Error${totalErrors === 1 ? '' : 's'}`}
          </h2>
          <p className="banner-desc">
            {overallPass
              ? 'Your Gherkin feature file satisfies @cucumber/gherkin AST specs, gherkin-lint quality standards, Matriz88 step consistency, and sistar lexing structure.'
              : `Detected ${totalErrors} error${totalErrors === 1 ? '' : 's'} and ${totalWarnings} warning${totalWarnings === 1 ? '' : 's'}. Review the detailed failure reasons and suggested fixes below.`}
          </p>
        </div>
      </div>

      {/* Grid of 4 Checker Cards */}
      <div className="checkers-grid">
        {checkers.map((checker) => {
          const isPass = checker.pass && checker.errors.length === 0;

          return (
            <div key={checker.name} className={`checker-card ${isPass ? 'pass-card' : 'fail-card'}`}>
              <div className="checker-card-header">
                <div className="checker-info">
                  <span className="checker-name">{checker.name}</span>
                  <a
                    href={checker.repo}
                    target="_blank"
                    rel="noreferrer"
                    className="repo-link"
                    title="View GitHub Repository"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>

                <div className={`checker-badge ${isPass ? 'pass' : 'fail'}`}>
                  {isPass ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  <span>{isPass ? 'PASS' : 'FAIL'}</span>
                </div>
              </div>

              <p className="checker-desc">{checker.description}</p>

              {/* Stats Summary */}
              <div className="checker-stats">
                <span className={`stat-item ${checker.errors.length > 0 ? 'text-red' : 'text-green'}`}>
                  {checker.errors.length} Error{checker.errors.length === 1 ? '' : 's'}
                </span>
                {checker.warnings.length > 0 && (
                  <span className="stat-item text-amber">
                    {checker.warnings.length} Warning{checker.warnings.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {/* Explicit Detailed Error List */}
              {checker.errors.length > 0 && (
                <div className="error-list">
                  <h4 className="list-heading">Detailed Failures ({checker.errors.length}):</h4>
                  {checker.errors.map((err, idx) => (
                    <div key={idx} className="error-item" onClick={() => onHighlightLine?.(err.line)}>
                      <div className="error-item-top">
                        <span className="line-badge">Line {err.line}</span>
                        {err.category && (
                          <span className="category-badge">
                            <Tag size={10} /> {err.category}
                          </span>
                        )}
                        {err.rule && (
                          <span className="rule-badge">
                            rule: {err.rule}
                          </span>
                        )}
                      </div>

                      {err.text !== undefined && (
                        <div className="failing-text-box">
                          <div className="snippet-label">
                            <FileCode size={11} /> Failing Line Snippet:
                          </div>
                          <code>{err.text || '(empty line)'}</code>
                        </div>
                      )}

                      <div className="error-reason">
                        <span className="reason-label">
                          <Lightbulb size={12} className="icon-reason" /> Clear Failure Reason:
                        </span>
                        <div className="reason-text">{err.reason}</div>
                      </div>

                      {err.fix && (
                        <div className="error-fix-box">
                          <span className="fix-label">
                            <Wrench size={11} /> Suggested Fix:
                          </span>
                          <span className="fix-text">{err.fix}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Warning List */}
              {checker.warnings.length > 0 && (
                <div className="warning-list">
                  <h4 className="list-heading warning">Quality Warnings ({checker.warnings.length}):</h4>
                  {checker.warnings.map((warn, idx) => (
                    <div key={idx} className="warning-item" onClick={() => onHighlightLine?.(warn.line)}>
                      <div className="error-item-top">
                        <span className="line-badge warning">Line {warn.line}</span>
                        {warn.category && <span className="category-badge warning">{warn.category}</span>}
                        {warn.rule && <span className="rule-badge warning">{warn.rule}</span>}
                      </div>

                      {warn.text && (
                        <div className="failing-text-box warning">
                          <code>{warn.text}</code>
                        </div>
                      )}

                      <div className="warning-reason">
                        <strong>Reason:</strong> {warn.reason}
                      </div>

                      {warn.fix && (
                        <div className="error-fix-box warning">
                          <span className="fix-label">Suggested Fix:</span> {warn.fix}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pass Message */}
              {isPass && (
                <div className="pass-message">
                  <CheckCircle2 size={16} />
                  <span>No syntax, structural, or lexical errors reported by {checker.name}.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
