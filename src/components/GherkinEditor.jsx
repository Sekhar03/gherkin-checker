import React, { useRef } from 'react';
import { Upload, Download, Copy, Trash2, FileText, Play, Loader2, Sparkles, AlignLeft } from 'lucide-react';
import { formatGherkinCode } from '../utils/autoFixer';

export function GherkinEditor({ code, onChange, onRunTest, onAutoFix, onFormat, isFixingWithAI, _errorsByLine = {}, isTested, hasIssues }) {
  const fileInputRef = useRef(null);

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
    if (!code || !code.trim()) return;

    // Auto-format Gherkin code when export/download is initiated
    const formatted = onFormat ? onFormat() : formatGherkinCode(code);
    const contentToDownload = formatted || code;

    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
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

          {/* Dedicated Format Button */}
          <button
            onClick={onFormat}
            className="btn-action btn-format"
            disabled={!code.trim()}
            title="Format Gherkin syntax, clean indentation (0/2/4/6 spaces), and normalize data tables"
          >
            <AlignLeft size={13} />
            <span>Format Gherkin</span>
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

          <button onClick={handleDownload} className="btn-action btn-icon-only" disabled={!code.trim()} title="Auto-format and Export file">
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
        <div className="line-numbers">
          {(code ? code.split('\n') : ['']).map((_, i) => (
            <div key={i + 1} className="line-number">
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Feature: User Authentication System\n\n  Scenario: Successful Login with valid credentials\n    Given the user is on the login page\n    When the user submits valid credentials\n    Then the system redirects to dashboard`}
          className="gherkin-textarea"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
