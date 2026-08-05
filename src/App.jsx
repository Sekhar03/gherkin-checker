import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GherkinEditor } from './components/GherkinEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ReportExporter } from './components/ReportExporter';
import { SAMPLES } from './utils/samples';
import { runAllCheckers } from './validators/masterRunner';
import { autoFixGherkin, fixSingleLine } from './utils/autoFixer';
import './index.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gherkin_theme') || 'light';
  });
  const [currentSampleId, setCurrentSampleId] = useState(null);
  const [code, setCode] = useState(''); // Initial blank box when opening site
  const [isTested, setIsTested] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [fixNotice, setFixNotice] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gherkin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleRunTest = (codeToTest = code) => {
    const results = runAllCheckers(codeToTest);
    setAnalysisResults(results);
    setIsTested(true);
  };

  const handleAutoFix = () => {
    const fixed = autoFixGherkin(code);
    setCode(fixed);
    handleRunTest(fixed);
    setFixNotice('✨ Auto-Fix applied! All syntax, keywords, and indentations repaired.');
    setTimeout(() => setFixNotice(null), 4000);
  };

  const handleFixSingleLine = (lineNum, errorDetail) => {
    const fixed = fixSingleLine(code, lineNum, errorDetail);
    setCode(fixed);
    handleRunTest(fixed);
    setFixNotice(`✨ Repaired issue on Line ${lineNum}!`);
    setTimeout(() => setFixNotice(null), 3000);
  };

  const handleSelectSample = (sampleId) => {
    setCurrentSampleId(sampleId);
    const selected = SAMPLES.find(s => s.id === sampleId);
    if (selected) {
      setCode(selected.code);
      handleRunTest(selected.code);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setCurrentSampleId(null);
    setIsTested(false); // Reset tested state so user clicks Test Gherkin button
  };

  return (
    <div className="app-wrapper">
      {/* Toast Fix Notice */}
      {fixNotice && (
        <div className="toast-notice">
          {fixNotice}
        </div>
      )}

      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        currentSampleId={currentSampleId}
        onSelectSample={handleSelectSample}
        totalErrors={analysisResults?.totalErrors || 0}
        totalWarnings={analysisResults?.totalWarnings || 0}
        overallPass={analysisResults?.overallPass || false}
        executionTimeMs={analysisResults?.executionTimeMs || '0.00'}
        isTested={isTested}
        onAutoFix={handleAutoFix}
        hasIssues={(analysisResults?.totalErrors || 0) > 0 || (analysisResults?.totalWarnings || 0) > 0}
      />

      {/* Main Grid: Gherkin Editor & Analysis Dashboard */}
      <main className="main-grid">
        <GherkinEditor
          code={code}
          onChange={handleCodeChange}
          onRunTest={() => handleRunTest(code)}
          onAutoFix={handleAutoFix}
          errorsByLine={analysisResults?.errorsByLine || {}}
          isTested={isTested}
          hasIssues={(analysisResults?.totalErrors || 0) > 0 || (analysisResults?.totalWarnings || 0) > 0}
        />

        <AnalysisDashboard
          results={analysisResults}
          isTested={isTested}
          onRunTest={() => handleRunTest(code)}
          onAutoFix={handleAutoFix}
          onFixLine={handleFixSingleLine}
        />
      </main>

      {/* Report Exporter Bar */}
      {isTested && analysisResults && (
        <ReportExporter
          results={analysisResults}
          code={code}
        />
      )}
    </div>
  );
}
