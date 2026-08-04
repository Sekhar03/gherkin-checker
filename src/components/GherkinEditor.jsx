import React, { useRef } from 'react';
import { Upload, Download, Copy, Trash2, FileText, AlertCircle, AlertTriangle } from 'lucide-react';

export function GherkinEditor({ code, onChange, errorsByLine }) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const lines = code.split('\n');

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
          <button onClick={() => fileInputRef.current?.click()} className="btn-action">
            <Upload size={14} /> Upload File
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
            const lineErrors = errorsByLine[lineNum] || [];
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
          placeholder="Paste or type your Gherkin feature file here...&#10;&#10;Feature: My Awesome Feature&#10;  Scenario: My Test Scenario&#10;    Given the user is logged in&#10;    When the user clicks submit&#10;    Then success message is shown"
          spellCheck="false"
        />
      </div>

      <div className="editor-footer">
        <span>Lines: {lines.length} | Characters: {code.length}</span>
        {Object.keys(errorsByLine).length > 0 && (
          <span className="error-highlight-notice">
            <AlertCircle size={13} /> {Object.keys(errorsByLine).length} lines flagged with issues
          </span>
        )}
      </div>
    </div>
  );
}
