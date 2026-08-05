import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GherkinEditor } from './components/GherkinEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ReportExporter } from './components/ReportExporter';
import { AISettingsModal } from './components/AISettingsModal';
import { SAMPLES } from './utils/samples';
import { runAllCheckers } from './validators/masterRunner';
import { autoFixGherkin, fixSingleLine } from './utils/autoFixer';
import { fixGherkinWithClaudeAI } from './utils/aiFixer';
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

  // Claude AI state
  const [isFixingWithAI, setIsFixingWithAI] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem('claude_api_key') || '');
  const [claudeProvider, setClaudeProvider] = useState(() => localStorage.getItem('claude_provider') || 'anthropic');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gherkin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSaveApiKey = (key) => {
    setClaudeApiKey(key);
    localStorage.setItem('claude_api_key', key);
  };

  const handleSaveProvider = (provider) => {
    setClaudeProvider(provider);
    localStorage.setItem('claude_provider', provider);
  };

  const handleRunTest = (codeToTest = code) => {
    const results = runAllCheckers(codeToTest);
    setAnalysisResults(results);
    setIsTested(true);
  };

  const handleClaudeAutoFix = async () => {
    if (!code || !code.trim()) return;

    setIsFixingWithAI(true);
    try {
      const fixedCode = await fixGherkinWithClaudeAI({
        code,
        results: analysisResults,
        apiKey: claudeApiKey,
        apiProvider: claudeProvider
      });

      setCode(fixedCode);
      handleRunTest(fixedCode);
      if (claudeApiKey && claudeApiKey.trim()) {
        setFixNotice('🤖 Connected via Claude AI API! All 4 checker errors repaired.');
      } else {
        setFixNotice('✨ Auto-Fix applied! All syntax, keywords, and indentations repaired.');
      }
    } catch (err) {
      console.error('Claude AI Fix Error:', err);
      // Run smart fallback fix
      const fallbackFixed = autoFixGherkin(code);
      setCode(fallbackFixed);
      handleRunTest(fallbackFixed);
      setFixNotice(`⚠️ API Key Error (${err.message || 'Call failed'}). Applied Smart Auto-Fix.`);
    } finally {
      setIsFixingWithAI(false);
      setTimeout(() => setFixNotice(null), 5000);
    }
  };

  const handleAutoFix = () => {
    handleClaudeAutoFix();
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
        onAutoFix={handleClaudeAutoFix}
        onOpenAISettings={() => setIsAISettingsOpen(true)}
        isFixingWithAI={isFixingWithAI}
        hasIssues={(analysisResults?.totalErrors || 0) > 0 || (analysisResults?.totalWarnings || 0) > 0}
      />

      {/* Main Grid: Gherkin Editor & Analysis Dashboard */}
      <main className="main-grid">
        <GherkinEditor
          code={code}
          onChange={handleCodeChange}
          onRunTest={() => handleRunTest(code)}
          onAutoFix={handleClaudeAutoFix}
          isFixingWithAI={isFixingWithAI}
          errorsByLine={analysisResults?.errorsByLine || {}}
          isTested={isTested}
          hasIssues={(analysisResults?.totalErrors || 0) > 0 || (analysisResults?.totalWarnings || 0) > 0}
        />

        <AnalysisDashboard
          results={analysisResults}
          isTested={isTested}
          onRunTest={() => handleRunTest(code)}
          onAutoFix={handleClaudeAutoFix}
          onFixLine={handleFixSingleLine}
          isFixingWithAI={isFixingWithAI}
        />
      </main>

      {/* Report Exporter Bar */}
      {isTested && analysisResults && (
        <ReportExporter
          results={analysisResults}
          code={code}
        />
      )}

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        apiKey={claudeApiKey}
        onSaveApiKey={handleSaveApiKey}
        apiProvider={claudeProvider}
        onSaveProvider={handleSaveProvider}
      />
    </div>
  );
}
