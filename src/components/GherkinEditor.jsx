import React, { useRef } from 'react';
import { Upload, Download, Copy, Trash2, FileText, AlertCircle, AlertTriangle, Play, Loader2, Sparkles } from 'lucide-react';

export function GherkinEditor({ code, onChange, onRunTest, onAutoFix, isFixingWithAI, errorsByLine = {}, isTested, hasIssues }) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const lines = code ? code.split('\n') : [''];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feature_test.feature';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="editor-card">
      <div className="editor-toolbar">
        <div className="editor-title">
          <div className="title-icon">
            <FileText size={16} />
          </div>
          <span className="title-text">Feature Editor</span>
          <span className="file-tag">.feature</span>
        </div>

        <div className="editor-actions">
          {/* Test / Analyze Button */}
          <button
            onClick={onRunTest}
            className="btn-action btn-test-primary"
            disabled={!code.trim()}
            title="Run analysis through all 4 checkers"
          >
            <Play size={13} fill="currentColor" />
            <span>Test Gherkin</span>
          </button>

          {/* Rule-Based Auto-Fix Button */}
          <button
            onClick={onAutoFix}
            className={`btn-action ${isTested && hasIssues ? 'btn-autofix-active btn-claude-editor' : 'btn-ai-ghost'}`}
            disabled={!code.trim() || isFixingWithAI}
            title="Internal rule-based engine repairs syntax, missing examples, quotes & indentations without AI"
          >
            {isFixingWithAI ? <Loader2 size={13} className="spin-icon" /> : <Sparkles size={13} />}
            <span>{isFixingWithAI ? 'Fixing...' : 'Auto-Fix (No AI)'}</span>
          </button>

          <div className="action-divider"></div>

          <button onClick={() => fileInputRef.current?.click()} className="btn-action btn-icon-only" title="Upload .feature file">
            <Upload size={14} />
            <span className="btn-label-desktop">Upload</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".feature,.txt"
            style={{ display: 'none' }}
          />

          <button onClick={handleDownload} className="btn-action btn-icon-only" disabled={!code.trim()} title="Export file">
            <Download size={14} />
            <span className="btn-label-desktop">Export</span>
          </button>

          <button onClick={handleCopy} className="btn-action btn-icon-only" disabled={!code.trim()} title="Copy to Clipboard">
            <Copy size={14} />
            <span className="btn-label-desktop">Copy</span>
          </button>

          <button onClick={handleClear} className="btn-action btn-danger btn-icon-only" disabled={!code.trim()} title="Clear Editor">
            <Trash2 size={14} />
            <span className="btn-label-desktop">Clear</span>
          </button>
        </div>
      </div>

      <div className="editor-workspace">
        {/* Line Numbers with Error Markers */}
        <div className="line-numbers">
          {lines.map((_, index) => {
            const lineNum = index + 1;
            const lineErrors = isTested ? (errorsByLine[lineNum] || []) : [];
            const hasError = lineErrors.some(e => e.reason);
            const hasWarning = lineErrors.some(e => e.rule);

            return (
              <div
                key={lineNum}
                className={`line-num-item ${hasError ? 'has-error' : hasWarning ? 'has-warning' : ''}`}
                title={hasError ? `Line ${lineNum}: ${lineErrors.map(e => e.reason).join('; ')}` : `Line ${lineNum}`}
              >
                <span>{lineNum}</span>
                {hasError && <AlertCircle size={10} className="marker-icon error" />}
                {!hasError && hasWarning && <AlertTriangle size={10} className="marker-icon warning" />}
              </div>
            );
          })}
        </div>

        {/* Gherkin Code Textarea */}
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Feature: User Authentication System\n\n  Scenario: Successful login with valid credentials\n    Given the user is on the login page\n    When the user enters valid username and password\n    Then the user should be redirected to dashboard\n\n# Paste or type Gherkin feature file above, then click 'Test Gherkin'`}
          spellCheck="false"
        />
      </div>

      <div className="editor-footer">
        <div className="footer-meta">
          <span>Lines: <strong>{lines.length}</strong></span>
          <span className="dot-divider">•</span>
          <span>Chars: <strong>{code.length}</strong></span>
        </div>

        {isTested && Object.keys(errorsByLine).length > 0 ? (
          <span className="error-highlight-notice">
            <AlertCircle size={13} /> {Object.keys(errorsByLine).length} line{Object.keys(errorsByLine).length === 1 ? '' : 's'} flagged with issues
          </span>
        ) : (
          <span className="footer-status-text">
            {isTested ? '✓ Syntax structure validated' : 'Ready for input'}
          </span>
        )}
      </div>
    </div>
  );
}

