import React from 'react';
import { FileJson, FileCode } from 'lucide-react';
import { formatGherkinCode } from '../utils/autoFixer';

export function ReportExporter({ results, code, onFormat }) {
  const getFormattedCode = () => {
    if (onFormat) {
      const res = onFormat();
      if (res) return res;
    }
    return formatGherkinCode(code);
  };

  const exportJSON = () => {
    const formattedSource = getFormattedCode();
    const reportData = {
      timestamp: new Date().toISOString(),
      overallPass: results.overallPass,
      totalErrors: results.totalErrors,
      totalWarnings: results.totalWarnings,
      executionTimeMs: results.executionTimeMs,
      checkers: results.checkers,
      sourceCode: formattedSource || code
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gherkin_validation_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const formattedSource = getFormattedCode();
    let md = `# Gherkin 4-in-1 Checker & Validator Summary Report\n\n`;
    md += `- **Overall Status**: ${results.overallPass ? '✅ PASS' : '❌ FAIL'}\n`;
    md += `- **Total Errors**: ${results.totalErrors}\n`;
    md += `- **Total Warnings**: ${results.totalWarnings}\n`;
    md += `- **Analysis Time**: ${results.executionTimeMs} ms\n`;
    md += `- **Timestamp**: ${new Date().toLocaleString()}\n\n`;

    md += `## Formatted Source Code\n\n\`\`\`gherkin\n${formattedSource || code}\n\`\`\`\n\n`;
    md += `## 4 Checkers Breakdown\n\n`;

    results.checkers.forEach(c => {
      md += `### ${c.name} (${c.pass ? 'PASS' : 'FAIL'})\n`;
      md += `Repository: [${c.repo}](${c.repo})\n\n`;

      if (c.errors.length === 0) {
        md += `*No errors reported.*\n\n`;
      } else {
        md += `#### Errors (${c.errors.length}):\n`;
        c.errors.forEach(e => {
          md += `- **Line ${e.line}**: \`${e.text || ''}\`\n  - **Reason**: ${e.reason}\n`;
        });
        md += `\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gherkin_validation_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="exporter-bar">
      <div className="exporter-info">
        <span>Export Validation Summary Report (Auto-Formats Code):</span>
      </div>
      <div className="exporter-buttons">
        <button onClick={exportJSON} className="btn-export">
          <FileJson size={14} /> Download JSON Report
        </button>
        <button onClick={exportMarkdown} className="btn-export">
          <FileCode size={14} /> Download Markdown Report
        </button>
      </div>
    </div>
  );
}
