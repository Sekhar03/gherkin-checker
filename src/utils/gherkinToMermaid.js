/**
 * Converts Gherkin feature code into a structured Mermaid.js flowchart (graph TD).
 * Handles Features, Scenarios, Scenario Outlines, Backgrounds, Given/When/Then steps, and Examples.
 */
export function convertGherkinToMermaid(gherkinCode) {
  if (!gherkinCode || !gherkinCode.trim()) {
    return `graph TD
    empty["Input Gherkin Feature Code to Generate Flowchart"]
    style empty fill:#1e293b,stroke:#64748b,color:#94a3b8,stroke-width:2px,rx:8px`;
  }

  const lines = gherkinCode.split(/\r?\n/);
  let mermaidLines = ['graph TD'];
  let nodeCount = 0;
  let currentScenarioId = null;
  let previousStepId = null;
  let featureId = null;

  const escapeLabel = (str) => {
    if (!str) return '';
    return str
      .replace(/"/g, '&quot;')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\|/g, '&#124;');
  };

  const getNextId = (prefix) => {
    nodeCount += 1;
    return `${prefix}_${nodeCount}`;
  };

  let inDocString = false;
  let inExamples = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty or comment lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle multiline DocStrings
    if (trimmed.startsWith('"""') || trimmed.startsWith('```')) {
      inDocString = !inDocString;
      continue;
    }
    if (inDocString) continue;

    // Feature title
    if (/^Feature:/i.test(trimmed)) {
      const featureTitle = trimmed.replace(/^Feature:/i, '').trim() || 'Feature';
      featureId = getNextId('feat');
      mermaidLines.push(`    ${featureId}["📋 Feature: ${escapeLabel(featureTitle)}"]`);
      mermaidLines.push(`    style ${featureId} fill:#1e1b4b,stroke:#6366f1,color:#e0e7ff,stroke-width:3px,rx:10px`);
      currentScenarioId = null;
      previousStepId = featureId;
      inExamples = false;
      continue;
    }

    // Background
    if (/^Background:/i.test(trimmed)) {
      const bgTitle = trimmed.replace(/^Background:/i, '').trim() || 'Background Pre-conditions';
      const bgId = getNextId('bg');
      mermaidLines.push(`    ${bgId}["⚙️ Background: ${escapeLabel(bgTitle)}"]`);
      mermaidLines.push(`    style ${bgId} fill:#0f172a,stroke:#38bdf8,color:#38bdf8,stroke-width:2px,rx:8px`);
      if (featureId) {
        mermaidLines.push(`    ${featureId} --> ${bgId}`);
      }
      currentScenarioId = bgId;
      previousStepId = bgId;
      inExamples = false;
      continue;
    }

    // Scenario or Scenario Outline
    if (/^(Scenario|Scenario Outline|Scenario Template):/i.test(trimmed)) {
      const isOutline = /Scenario (Outline|Template):/i.test(trimmed);
      const scenarioTitle = trimmed.replace(/^(Scenario|Scenario Outline|Scenario Template):/i, '').trim() || (isOutline ? 'Scenario Outline' : 'Scenario');
      const scId = getNextId('sc');
      const icon = isOutline ? '🔄' : '🧪';
      mermaidLines.push(`    ${scId}["${icon} ${escapeLabel(scenarioTitle)}"]`);

      if (isOutline) {
        mermaidLines.push(`    style ${scId} fill:#3b0764,stroke:#c084fc,color:#f3e8ff,stroke-width:2px,rx:8px`);
      } else {
        mermaidLines.push(`    style ${scId} fill:#030712,stroke:#a855f7,color:#f3e8ff,stroke-width:2px,rx:8px`);
      }

      if (featureId) {
        mermaidLines.push(`    ${featureId} --> ${scId}`);
      }
      currentScenarioId = scId;
      previousStepId = scId;
      inExamples = false;
      continue;
    }

    // Examples header
    if (/^Examples:/i.test(trimmed)) {
      if (currentScenarioId) {
        const exId = getNextId('ex');
        mermaidLines.push(`    ${exId}["📊 Examples Data Table"]`);
        mermaidLines.push(`    style ${exId} fill:#451a03,stroke:#f59e0b,color:#fef3c7,stroke-width:2px,rx:6px`);
        if (previousStepId) {
          mermaidLines.push(`    ${previousStepId} --> ${exId}`);
        }
        previousStepId = exId;
        inExamples = true;
      }
      continue;
    }

    // Examples table row
    if (inExamples && trimmed.startsWith('|')) {
      // Table row node
      const rowId = getNextId('row');
      mermaidLines.push(`    ${rowId}["${escapeLabel(trimmed)}"]`);
      mermaidLines.push(`    style ${rowId} fill:#292524,stroke:#d97706,color:#fde68a,stroke-width:1px,rx:4px`);
      if (previousStepId) {
        mermaidLines.push(`    ${previousStepId} --> ${rowId}`);
      }
      previousStepId = rowId;
      continue;
    }

    // Gherkin Steps: Given, When, Then, And, But
    const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.*)/i);
    if (stepMatch) {
      inExamples = false;
      const keyword = stepMatch[1].toUpperCase();
      const text = stepMatch[2];
      const stepId = getNextId('step');

      let icon = '🔹';
      let styleCss = 'fill:#1e293b,stroke:#64748b,color:#cbd5e1,stroke-width:1px,rx:6px';

      if (keyword === 'GIVEN') {
        icon = '🟩 Given:';
        styleCss = 'fill:#064e3b,stroke:#10b981,color:#d1fae5,stroke-width:2px,rx:6px';
      } else if (keyword === 'WHEN') {
        icon = '🟧 When:';
        styleCss = 'fill:#7c2d12,stroke:#f97316,color:#ffedd5,stroke-width:2px,rx:6px';
      } else if (keyword === 'THEN') {
        icon = '🟦 Then:';
        styleCss = 'fill:#0c4a6e,stroke:#0ea5e9,color:#e0f2fe,stroke-width:2px,rx:6px';
      } else if (keyword === 'AND' || keyword === 'BUT') {
        icon = '🟣 ' + keyword.charAt(0) + keyword.slice(1).toLowerCase() + ':';
        styleCss = 'fill:#1e1b4b,stroke:#818cf8,color:#e0e7ff,stroke-width:1.5px,rx:6px';
      }

      mermaidLines.push(`    ${stepId}["${icon} ${escapeLabel(text)}"]`);
      mermaidLines.push(`    style ${stepId} ${styleCss}`);

      if (previousStepId) {
        mermaidLines.push(`    ${previousStepId} --> ${stepId}`);
      } else if (currentScenarioId) {
        mermaidLines.push(`    ${currentScenarioId} --> ${stepId}`);
      }

      previousStepId = stepId;
    }
  }

  // Fallback if no nodes were created
  if (mermaidLines.length === 1) {
    return `graph TD
    empty["No Gherkin Scenarios Detected"]
    style empty fill:#1e293b,stroke:#f43f5e,color:#fecdd3,stroke-width:2px,rx:8px`;
  }

  return mermaidLines.join('\n');
}
