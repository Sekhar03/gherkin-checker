import React, { useState } from 'react';
import { Header } from './components/Header';
import { GherkinEditor } from './components/GherkinEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ReportExporter } from './components/ReportExporter';
import { SAMPLES } from './utils/samples';
import { runAllCheckers } from './validators/masterRunner';
import './index.css';

export default function App() {
  const [currentSampleId, setCurrentSampleId] = useState(null);
  const [code, setCode] = useState(''); // Initial blank box when opening site
  const [isTested, setIsTested] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const handleRunTest = (codeToTest = code) => {
    const results = runAllCheckers(codeToTest);
    setAnalysisResults(results);
    setIsTested(true);
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
      {/* Header */}
      <Header
        currentSampleId={currentSampleId}
        onSelectSample={handleSelectSample}
        totalErrors={analysisResults?.totalErrors || 0}
        totalWarnings={analysisResults?.totalWarnings || 0}
        overallPass={analysisResults?.overallPass || false}
        executionTimeMs={analysisResults?.executionTimeMs || '0.00'}
        isTested={isTested}
      />

      {/* Main Grid: Gherkin Editor & Analysis Dashboard */}
      <main className="main-grid">
        <GherkinEditor
          code={code}
          onChange={handleCodeChange}
          onRunTest={() => handleRunTest(code)}
          errorsByLine={analysisResults?.errorsByLine || {}}
          isTested={isTested}
        />

        <AnalysisDashboard
          results={analysisResults}
          isTested={isTested}
          onRunTest={() => handleRunTest(code)}
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
