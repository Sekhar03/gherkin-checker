import React, { useRef, useState } from 'react';
import { Upload, Download, Copy, Trash2, FileText, Play, Loader2, Sparkles, AlignLeft, AlertCircle, AlertTriangle, Zap } from 'lucide-react';
import { formatGherkinCode } from '../utils/autoFixer';
import { getStepSuggestions } from '../utils/stepDictionary';

export function GherkinEditor({ code, onChange, onRunTest, onAutoFix, onFormat, isFixingWithAI, errorsByLine = {}, isTested, hasIssues }) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);

  const lines = code ? code.split('\n') : [''];

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCodeTextChange = (e) => {
    const val = e.target.value;
    onChange(val);

    // Compute active line text for intellisense
    const cursorPos = e.target.selectionStart;
    const linesUpToCursor = val.substring(0, cursorPos).split('\n');
    const currentLineIdx = linesUpToCursor.length - 1;
    const currentLineText = linesUpToCursor[currentLineIdx] || '';

    setActiveLineIdx(currentLineIdx);
    const stepSugg = getStepSuggestions(val, currentLineText);
    setSuggestions(stepSugg);
  };

  const applySuggestion = (sugg) => {
    if (!textareaRef.current || activeLineIdx < 0) return;

    const allLines = code.split('\n');
    const activeLine = allLines[activeLineIdx] || '';
    const kwMatch = activeLine.trimStart().match(/^(Given|When|Then|And|But)\s*/i);
    const indent = activeLine.match(/^\s*/)?.[0] || '    ';
    const kw = kwMatch ? kwMatch[1] : sugg.keyword;

    allLines[activeLineIdx] = `${indent}${kw} ${sugg.text}`;
    const newCode = allLines.join('\n');
    onChange(newCode);
    setSuggestions([]);
  };

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
    setSuggestions([]);
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

      <div className="editor-workspace position-relative">
        <div className="line-numbers" ref={gutterRef}>
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const lineIssues = errorsByLine[lineNum] || [];
            const hasError = lineIssues.some(iss => !iss.isWarning);
            const hasWarning = !hasError && lineIssues.some(iss => iss.isWarning);

            return (
              <div
                key={lineNum}
                className={`line-num-item ${hasError ? 'has-error' : ''} ${hasWarning ? 'has-warning' : ''}`}
                title={lineIssues.map(iss => iss.reason).join('\n')}
              >
                <span>{lineNum}</span>
                {hasError && <AlertCircle size={11} className="marker-icon text-red" />}
                {hasWarning && <AlertTriangle size={11} className="marker-icon text-amber" />}
              </div>
            );
          })}
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeTextChange}
          onScroll={handleScroll}
          wrap="off"
          placeholder={`Feature: User Authentication System\n\n  Scenario: Successful Login with valid credentials\n    Given the user is on the login page\n    When the user submits valid credentials\n    Then the system redirects to dashboard`}
          className="code-textarea gherkin-textarea"
          spellCheck="false"
        />

        {/* Smart Intellisense Autocomplete Popup */}
        {suggestions.length > 0 && (
          <div className="intellisense-popup">
            <div className="intellisense-header">
              <Zap size={12} className="text-amber" />
              <span>Step Autocomplete (Intellisense)</span>
            </div>
            <div className="intellisense-list">
              {suggestions.map((sugg, idx) => (
                <div
                  key={idx}
                  onClick={() => applySuggestion(sugg)}
                  className="intellisense-item"
                >
                  <span className={`kw-badge kw-${sugg.keyword.toLowerCase()}`}>{sugg.keyword}</span>
                  <span className="sugg-text">{sugg.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

