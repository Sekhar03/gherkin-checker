import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, XCircle, AlertTriangle, ExternalLink, Lightbulb, Wrench, FileCode, Tag, 
  ShieldCheck, Loader2, Sparkles, BarChart3, ListChecks, 
  Activity, Layers, Repeat, ShieldAlert, Award
} from 'lucide-react';

export function AnalysisDashboard({ results, isTested, _onRunTest, onHighlightLine, onAutoFix, onFixLine, isFixingWithAI }) {
  const [activeTab, setActiveTab] = useState('checkers'); // 'checkers' | 'metrics' | 'checklist'

  const { overallPass, totalErrors, totalWarnings, checkers, metrics } = results || {
    overallPass: false,
    totalErrors: 0,
    totalWarnings: 0,
    checkers: [
      { name: 'gherkin-lint', repo: 'https://github.com/gherkin-lint/gherkin-lint', description: 'Gherkin Best Practices & Code Quality Linter', pass: true, errors: [], warnings: [] },
      { name: '@cucumber/gherkin', repo: 'https://github.com/cucumber/gherkin-javascript', description: 'Official Cucumber Gherkin AST Parser & Syntax Validator', pass: true, errors: [], warnings: [] },
      { name: 'Matriz88/gherkin-checker', repo: 'https://github.com/Matriz88/gherkin-checker', description: 'Scenario Consistency & Step Definition Structure Matcher', pass: true, errors: [], warnings: [] },
      { name: 'sistar/gherkin-validator', repo: 'https://github.com/sistar/gherkin-validator', description: 'Strict Gherkin Lexer & Token Structure Validator', pass: true, errors: [], warnings: [] }
    ],
    metrics: {
      featureCount: 0,
      scenarioCount: 0,
      totalStepCount: 0,
      avgStepsPerScenario: '0.0',
      uniqueStepsCount: 0,
      stepReuseRatio: '0%',
      antiPatternCount: 0,
      qualityScore: 0,
      checklist: []
    }
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

  // Quality score status
  const qualityScore = metrics?.qualityScore || 0;
  let scoreBadgeClass = 'score-low';
  if (qualityScore >= 80) scoreBadgeClass = 'score-high';
  else if (qualityScore >= 60) scoreBadgeClass = 'score-med';

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

      {/* Gherkin Quality & BDD Metrics Overview Bar */}
      {metrics && (
        <div className="metrics-overview-bar">
          <div className="quality-score-card">
            <div className="score-header">
              <Award size={18} className="score-icon" />
              <span>Quality Scorecard</span>
            </div>
            <div className={`score-value ${scoreBadgeClass}`}>
              {qualityScore} <span className="score-max">/ 100</span>
            </div>
            <div className="score-progress-bg">
              <div 
                className={`score-progress-fill ${scoreBadgeClass}`} 
                style={{ width: `${qualityScore}%` }}
              />
            </div>
          </div>

          <div className="quick-metrics-grid">
            <div className="metric-pill">
              <div className="metric-icon"><Layers size={14} /></div>
              <div className="metric-info">
                <span className="metric-val">{metrics.scenarioCount}</span>
                <span className="metric-lbl">Scenarios</span>
              </div>
            </div>

            <div className="metric-pill">
              <div className="metric-icon"><Activity size={14} /></div>
              <div className="metric-info">
                <span className="metric-val">{metrics.avgStepsPerScenario}</span>
                <span className="metric-lbl">Steps / Scenario</span>
              </div>
            </div>

            <div className="metric-pill">
              <div className="metric-icon"><Repeat size={14} /></div>
              <div className="metric-info">
                <span className="metric-val">{metrics.stepReuseRatio}</span>
                <span className="metric-lbl">Step Reuse</span>
              </div>
            </div>

            <div className="metric-pill">
              <div className="metric-icon"><ShieldAlert size={14} /></div>
              <div className="metric-info">
                <span className="metric-val">{metrics.antiPatternCount}</span>
                <span className="metric-lbl">Anti-Patterns</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs: Checkers | Quality Metrics | BDD Checklist */}
      <div className="dashboard-tabs">
        <button
          className={`dash-tab-btn ${activeTab === 'checkers' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkers')}
        >
          <ShieldCheck size={16} /> 4 Checkers Results ({totalErrors + totalWarnings})
        </button>

        <button
          className={`dash-tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <ListChecks size={16} /> BDD Review Checklist
        </button>

        <button
          className={`dash-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <BarChart3 size={16} /> Quantitative Metrics
        </button>
      </div>

      {/* TAB 1: 4 CHECKERS RESULTS */}
      {activeTab === 'checkers' && (
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
      )}

      {/* TAB 2: BDD REVIEW CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="checklist-container">
          <div className="checklist-header">
            <ListChecks size={20} />
            <div>
              <h3>BDD Feature File Review Checklist</h3>
              <p>Evaluates feature files against official Cucumber & community BDD review standards.</p>
            </div>
          </div>

          <div className="checklist-grid">
            {metrics?.checklist?.map((item, idx) => (
              <div key={idx} className={`checklist-card ${item.pass ? 'pass' : 'fail'}`}>
                <div className="checklist-card-top">
                  <div className="item-title">
                    {item.pass ? (
                      <CheckCircle2 size={18} className="icon-pass" />
                    ) : (
                      <AlertTriangle size={18} className="icon-warn" />
                    )}
                    <span>{item.title}</span>
                  </div>
                  <span className={`badge-check ${item.pass ? 'pass' : 'warn'}`}>
                    {item.pass ? 'VERIFIED' : 'NEEDS REFACTOR'}
                  </span>
                </div>
                <p className="item-desc">{item.description}</p>
                <div className="item-details">{item.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: QUANTITATIVE METRICS */}
      {activeTab === 'metrics' && (
        <div className="metrics-detailed-container">
          <div className="metrics-header">
            <BarChart3 size={20} />
            <div>
              <h3>Quantitative Quality Metrics</h3>
              <p>Automated metrics for gauging feature file health, step reuse, and complexity.</p>
            </div>
          </div>

          <div className="metrics-table-card">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Metric Name</th>
                  <th>Current Value</th>
                  <th>Recommended Benchmark</th>
                  <th>Status / Recommendation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Features per File</strong></td>
                  <td>{metrics.featureCount}</td>
                  <td>Exactly 1 Feature per file</td>
                  <td>
                    {metrics.featureCount === 1 ? (
                      <span className="text-green">✅ Compliant</span>
                    ) : (
                      <span className="text-red">❌ One feature per file recommended</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td><strong>Total Scenarios</strong></td>
                  <td>{metrics.scenarioCount}</td>
                  <td>1 – 12 scenarios per feature file</td>
                  <td>
                    {metrics.scenarioCount <= 12 ? (
                      <span className="text-green">✅ Optimal scenario count</span>
                    ) : (
                      <span className="text-amber">⚠️ Split feature file (~10-12 max)</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td><strong>Avg Steps per Scenario</strong></td>
                  <td>{metrics.avgStepsPerScenario}</td>
                  <td>≤ 10 steps per scenario</td>
                  <td>
                    {parseFloat(metrics.avgStepsPerScenario) <= 10 ? (
                      <span className="text-green">✅ Single-digit steps (concise)</span>
                    ) : (
                      <span className="text-amber">⚠️ Scenarios are too long (&gt;10 steps)</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td><strong>Step Reuse Ratio</strong></td>
                  <td>{metrics.stepReuseRatio}</td>
                  <td>&gt; 20% (higher is better)</td>
                  <td>
                    {parseInt(metrics.stepReuseRatio) >= 20 ? (
                      <span className="text-green">✅ High step reuse</span>
                    ) : (
                      <span className="text-muted">ℹ️ Standard step uniqueness</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td><strong>Anti-Pattern Count</strong></td>
                  <td>{metrics.antiPatternCount}</td>
                  <td>0 Anti-Patterns</td>
                  <td>
                    {metrics.antiPatternCount === 0 ? (
                      <span className="text-green">✅ Clean (no anti-patterns detected)</span>
                    ) : (
                      <span className="text-red">❌ {metrics.antiPatternCount} anti-patterns detected</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
