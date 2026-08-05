import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, Lightbulb, Wrench, FileCode, Tag, ShieldCheck, Bot, Loader2, Sparkles, ChevronRight } from 'lucide-react';

export function AnalysisDashboard({ results, isTested, onRunTest, onHighlightLine, onAutoFix, onFixLine, isFixingWithAI }) {
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
    if (isTested && overallPass && Array.isArray(checkers) && checkers.length > 0) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [isTested, overallPass, checkers]);

  // UN-TESTED / INITIAL STATE
  if (!isTested) {
    return (
      <div className="dashboard-container">
        <div className="hero-banner banner-untested">
          <div className="banner-icon-box">
            <ShieldCheck size={38} className="icon-ready" />
          </div>

          <div className="banner-content">
            <div className="banner-tag">READY FOR VALIDATION</div>
            <h2 className="banner-title">Paste Gherkin file & click "Test Gherkin"</h2>
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
                  <a href={c.repo} target="_blank" rel="noreferrer" className="repo-link" title="View Repository">
                    <ExternalLink size={12} />
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
            <CheckCircle2 size={40} className="icon-pass" />
          ) : (
            <XCircle size={40} className="icon-fail" />
          )}
        </div>

        <div className="banner-content">
          <div className="banner-tag">
            {overallPass ? 'ALL 4 CHECKERS PASSED' : 'VALIDATION ISSUES DETECTED'}
          </div>
          <h2 className="banner-title">
            {overallPass ? '✅ All 4 Checkers Passed Cleanly!' : `❌ ${totalErrors} Error${totalErrors === 1 ? '' : 's'} & ${totalWarnings} Warning${totalWarnings === 1 ? '' : 's'}`}
          </h2>
          <p className="banner-desc">
            {overallPass
              ? 'Your Gherkin feature file satisfies @cucumber/gherkin AST specs, gherkin-lint quality standards, Matriz88 step consistency, and sistar lexing structure.'
              : 'Review detailed breakdown below or click "Auto-Fix (No AI)" to automatically resolve syntax, keywords, and indentation using our internal rule engine.'}
          </p>

          {!overallPass && onAutoFix && (
            <div className="banner-action-row">
              <button onClick={onAutoFix} disabled={isFixingWithAI} className="btn-banner-autofix btn-claude-banner">
                {isFixingWithAI ? <Loader2 size={15} className="spin-icon" /> : <Sparkles size={16} />}
                <span>{isFixingWithAI ? 'Repairing...' : 'Auto-Fix (No AI)'}</span>
              </button>
            </div>
          )}
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
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className={`checker-badge ${isPass ? 'pass' : 'fail'}`}>
                  {isPass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
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

              {/* Detailed Error List */}
              {checker.errors.length > 0 && (
                <div className="error-list">
                  <h4 className="list-heading">Failures ({checker.errors.length})</h4>
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

                        {onFixLine && (
                          <button
                            className="btn-fix-single-line"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFixLine(err.line, err);
                            }}
                            title={`Fix issue on Line ${err.line}`}
                          >
                            <Wrench size={11} /> Quick Fix
                          </button>
                        )}
                      </div>

                      {err.text !== undefined && (
                        <div className="failing-text-box">
                          <div className="snippet-label">
                            <FileCode size={11} /> Snippet:
                          </div>
                          <code>{err.text || '(empty line)'}</code>
                        </div>
                      )}

                      <div className="error-reason">
                        <span className="reason-label">
                          <Lightbulb size={12} className="icon-reason" /> Failure Reason:
                        </span>
                        <div className="reason-text">{err.reason}</div>
                      </div>

                      {err.fix && (
                        <div className="error-fix-box">
                          <span className="fix-label">
                            <Sparkles size={11} /> Suggested Fix:
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
                  <h4 className="list-heading warning">Quality Warnings ({checker.warnings.length})</h4>
                  {checker.warnings.map((warn, idx) => (
                    <div key={idx} className="warning-item" onClick={() => onHighlightLine?.(warn.line)}>
                      <div className="error-item-top">
                        <span className="line-badge warning">Line {warn.line}</span>
                        {warn.category && <span className="category-badge warning">{warn.category}</span>}
                        {warn.rule && <span className="rule-badge warning">{warn.rule}</span>}

                        {onFixLine && (
                          <button
                            className="btn-fix-single-line warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFixLine(warn.line, warn);
                            }}
                            title={`Fix warning on Line ${warn.line}`}
                          >
                            <Wrench size={11} /> Quick Fix
                          </button>
                        )}
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
                  <CheckCircle2 size={15} />
                  <span>Passes all syntax & lexical checks for {checker.name}.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

