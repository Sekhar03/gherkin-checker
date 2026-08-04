import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { GherkinEditor } from './components/GherkinEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ReportExporter } from './components/ReportExporter';
import { SAMPLES } from './utils/samples';
import { runAllCheckers } from './validators/masterRunner';
import './index.css';

export default function App() {
  const [currentSampleId, setCurrentSampleId] = useState('valid');
  const [code, setCode] = useState(SAMPLES[0].code);

  const handleSelectSample = (sampleId) => {
    setCurrentSampleId(sampleId);
    const selected = SAMPLES.find(s => s.id === sampleId);
    if (selected) {
      setCode(selected.code);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setCurrentSampleId(null);
  };

  const analysisResults = useMemo(() => {
    return runAllCheckers(code);
  }, [code]);

  return (
    <div className="app-wrapper">
      {/* Header */}
      <Header
        currentSampleId={currentSampleId}
        onSelectSample={handleSelectSample}
        totalErrors={analysisResults.totalErrors}
        totalWarnings={analysisResults.totalWarnings}
        overallPass={analysisResults.overallPass}
        executionTimeMs={analysisResults.executionTimeMs}
      />

      {/* Main Grid: Gherkin Editor & Analysis Dashboard */}
      <main className="main-grid">
        <GherkinEditor
          code={code}
          onChange={handleCodeChange}
          errorsByLine={analysisResults.errorsByLine}
        />

        <AnalysisDashboard
          results={analysisResults}
        />
      </main>

      {/* Report Exporter Bar */}
      <ReportExporter
        results={analysisResults}
        code={code}
      />
    </div>
  );
}
