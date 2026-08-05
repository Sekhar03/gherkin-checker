import React, { useRef } from 'react';
import { Upload, Download, Copy, Trash2, FileText, AlertCircle, AlertTriangle, Play, Zap, Wrench } from 'lucide-react';

export function GherkinEditor({ code, onChange, onRunTest, onAutoFix, errorsByLine = {}, isTested, hasIssues }) {
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
    navigator.clipboard.writeText(code);
    alert('Gherkin content copied to clipboard!');
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="editor-card">
      <div className="editor-toolbar">
        <div className="editor-title">
          <FileText size={16} />
          <span>Gherkin Feature Editor</span>
          <span className="file-tag">.feature</span>
        </div>

        <div className="editor-actions">
          {/* Auto-Fix Button */}
          <button
            onClick={onAutoFix}
            className={`btn-action ${isTested && hasIssues ? 'btn-autofix-active' : ''}`}
            disabled={!code.trim()}
            title="Read errors & warnings and automatically fix Gherkin code"
          >
            <Wrench size={14} /> Auto-Fix
          </button>

          {/* Prominent Test / Analyze Button */}
          <button
            onClick={onRunTest}
            className="btn-action btn-test-primary"
            disabled={!code.trim()}
            title="Click to run analysis through all 4 checkers"
          >
            <Play size={14} fill="currentColor" /> Test Gherkin
          </button>

          <button onClick={() => fileInputRef.current?.click()} className="btn-action">
            <Upload size={14} /> Upload
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".feature,.txt"
            style={{ display: 'none' }}
          />

          <button onClick={handleDownload} className="btn-action" disabled={!code.trim()}>
            <Download size={14} /> Export
          </button>

          <button onClick={handleCopy} className="btn-action" disabled={!code.trim()}>
            <Copy size={14} /> Copy
          </button>

          <button onClick={handleClear} className="btn-action btn-danger" disabled={!code.trim()}>
            <Trash2 size={14} /> Clear
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
          placeholder="Paste your Gherkin feature file here...&#10;&#10;Example:&#10;Feature: User Authentication System&#10;  Scenario: Successful login with valid credentials&#10;    Given the user is on the login page&#10;    When the user enters valid username and password&#10;    Then the user should be redirected to dashboard&#10;&#10;👉 Then click the 'TEST GHERKIN' button to analyze!"
          spellCheck="false"
        />
      </div>

      <div className="editor-footer">
        <span>Lines: {lines.length} | Characters: {code.length}</span>

        {/* Big Test Button at Bottom if code exists */}
        <div className="footer-test-bar">
          <button
            onClick={onRunTest}
            className="btn-run-test-big"
            disabled={!code.trim()}
          >
            <Zap size={14} /> RUN ALL 4 CHECKERS
          </button>
        </div>

        {isTested && Object.keys(errorsByLine).length > 0 && (
          <span className="error-highlight-notice">
            <AlertCircle size={13} /> {Object.keys(errorsByLine).length} lines flagged with issues
          </span>
        )}
      </div>
    </div>
  );
}
