/**
 * Advanced Converter: Transforms Gherkin feature code into a structured, highly readable Mermaid.js flowchart (graph TD).
 * Organizes Scenarios into distinct subgraphs with clear execution flow:
 * Background -> Given (Setup) -> When (Action) -> Then (Assertion Outcome) -> Examples (Data Iterations).
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

  let featureId = null;
  let bgEndNodeId = null;
  
  // Structure to hold parsed feature elements
  let featureTitle = 'Gherkin Feature Flow';
  let backgroundObj = null;
  const scenariosList = [];
  let currentBlock = null; // background | scenario
  let inDocString = false;
  let inExamples = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('"""') || trimmed.startsWith('```')) {
      inDocString = !inDocString;
      continue;
    }
    if (inDocString) continue;

    // Feature title
    if (/^Feature:/i.test(trimmed)) {
      featureTitle = trimmed.replace(/^Feature:/i, '').trim() || featureTitle;
      currentBlock = null;
      inExamples = false;
      continue;
    }

    // Background block
    if (/^Background:/i.test(trimmed)) {
      const bgTitle = trimmed.replace(/^Background:/i, '').trim() || 'Background Prerequisites';
      backgroundObj = {
        title: bgTitle,
        steps: []
      };
      currentBlock = backgroundObj;
      inExamples = false;
      continue;
    }

    // Scenario / Scenario Outline
    if (/^(Scenario|Scenario Outline|Scenario Template):/i.test(trimmed)) {
      const isOutline = /Scenario (Outline|Template):/i.test(trimmed);
      const scenarioTitle = trimmed.replace(/^(Scenario|Scenario Outline|Scenario Template):/i, '').trim() || (isOutline ? 'Scenario Outline' : 'Scenario');
      
      const newSc = {
        title: scenarioTitle,
        isOutline,
        steps: [],
        examples: { headers: [], rows: [] }
      };
      scenariosList.push(newSc);
      currentBlock = newSc;
      inExamples = false;
      continue;
    }

    // Examples header
    if (/^Examples:/i.test(trimmed)) {
      if (currentBlock && currentBlock.isOutline) {
        inExamples = true;
      }
      continue;
    }

    // Examples rows
    if (inExamples && trimmed.startsWith('|') && currentBlock && currentBlock.isOutline) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
      if (currentBlock.examples.headers.length === 0) {
        currentBlock.examples.headers = cells;
      } else {
        currentBlock.examples.rows.push(cells);
      }
      continue;
    }

    // Step line
    const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.*)/i);
    if (stepMatch && currentBlock) {
      inExamples = false;
      currentBlock.steps.push({
        keyword: stepMatch[1].toUpperCase(),
        text: stepMatch[2]
      });
    }
  }

  // --- Build Mermaid Graph Structure ---

  // 1. Root Feature Node
  featureId = getNextId('feat');
  mermaidLines.push(`    ${featureId}["📋 Feature: ${escapeLabel(featureTitle)}"]`);
  mermaidLines.push(`    style ${featureId} fill:#1e1b4b,stroke:#6366f1,color:#e0e7ff,stroke-width:3px,rx:10px`);

  // 2. Render Background block if present
  if (backgroundObj && backgroundObj.steps.length > 0) {
    const bgSubId = getNextId('sub_bg');
    mermaidLines.push(`    subgraph ${bgSubId} ["⚙️ Background: ${escapeLabel(backgroundObj.title)}"]`);
    
    let prevBgNode = null;
    backgroundObj.steps.forEach((st, idx) => {
      const stId = getNextId('bgstep');
      const icon = st.keyword === 'GIVEN' ? '🟩 Given:' : '🟣 And:';
      mermaidLines.push(`        ${stId}["${icon} ${escapeLabel(st.text)}"]`);
      mermaidLines.push(`        style ${stId} fill:#0f172a,stroke:#38bdf8,color:#e0f2fe,stroke-width:2px,rx:6px`);
      
      if (idx === 0) {
        mermaidLines.push(`    ${featureId} --> ${stId}`);
      } else if (prevBgNode) {
        mermaidLines.push(`        ${prevBgNode} --> ${stId}`);
      }
      prevBgNode = stId;
    });

    mermaidLines.push(`    end`);
    bgEndNodeId = prevBgNode;
  }

  // 3. Render Scenarios in subgraphs
  if (scenariosList.length === 0) {
    const emptyScId = getNextId('no_sc');
    mermaidLines.push(`    ${emptyScId}["⚠️ No Scenarios Defined"]`);
    mermaidLines.push(`    ${featureId} --> ${emptyScId}`);
  } else {
    scenariosList.forEach((sc, scIdx) => {
      const scSubId = getNextId(`sub_sc_${scIdx}`);
      const isOutline = sc.isOutline;
      const scIcon = isOutline ? '🔄' : '🧪';
      const scTypeLabel = isOutline ? 'Scenario Outline' : 'Scenario';
      
      mermaidLines.push(`    subgraph ${scSubId} ["${scIcon} ${scTypeLabel}: ${escapeLabel(sc.title)}"]`);
      
      let prevStepId = null;
      let firstStepId = null;

      if (sc.steps.length > 0) {
        sc.steps.forEach((st, stIdx) => {
          const stepId = getNextId('step');
          let icon = '🔹';
          let styleCss = 'fill:#1e293b,stroke:#64748b,color:#cbd5e1,stroke-width:1px,rx:6px';

          if (st.keyword === 'GIVEN') {
            icon = '🟩 Given:';
            styleCss = 'fill:#064e3b,stroke:#10b981,color:#d1fae5,stroke-width:2px,rx:6px';
          } else if (st.keyword === 'WHEN') {
            icon = '🟧 When:';
            styleCss = 'fill:#7c2d12,stroke:#f97316,color:#ffedd5,stroke-width:2px,rx:6px';
          } else if (st.keyword === 'THEN') {
            icon = '🟦 Then:';
            styleCss = 'fill:#0c4a6e,stroke:#0ea5e9,color:#e0f2fe,stroke-width:2px,rx:6px';
          } else if (st.keyword === 'AND' || st.keyword === 'BUT') {
            icon = '🟣 ' + st.keyword.charAt(0) + st.keyword.slice(1).toLowerCase() + ':';
            styleCss = 'fill:#1e1b4b,stroke:#818cf8,color:#e0e7ff,stroke-width:1.5px,rx:6px';
          }

          mermaidLines.push(`        ${stepId}["${icon} ${escapeLabel(st.text)}"]`);
          mermaidLines.push(`        style ${stepId} ${styleCss}`);

          if (stIdx === 0) {
            firstStepId = stepId;
          } else if (prevStepId) {
            mermaidLines.push(`        ${prevStepId} --> ${stepId}`);
          }

          prevStepId = stepId;
        });
      } else {
        const dummyId = getNextId('empty_sc');
        mermaidLines.push(`        ${dummyId}["No Steps"]`);
        firstStepId = dummyId;
        prevStepId = dummyId;
      }

      // Handle Examples Table Flow for Scenario Outlines
      if (isOutline && sc.examples.rows.length > 0) {
        const exTableId = getNextId('extable');
        mermaidLines.push(`        ${exTableId}["📊 Examples: | ${escapeLabel(sc.examples.headers.join(' | '))} |"]`);
        mermaidLines.push(`        style ${exTableId} fill:#451a03,stroke:#f59e0b,color:#fef3c7,stroke-width:2px,rx:6px`);
        
        if (prevStepId) {
          mermaidLines.push(`        ${prevStepId} --> ${exTableId}`);
        }

        sc.examples.rows.forEach((row, rIdx) => {
          const rowId = getNextId('exrow');
          const rowLabel = `Row ${rIdx + 1}: | ${row.join(' | ')} |`;
          mermaidLines.push(`        ${rowId}["${escapeLabel(rowLabel)}"]`);
          mermaidLines.push(`        style ${rowId} fill:#292524,stroke:#d97706,color:#fde68a,stroke-width:1px,rx:4px`);
          mermaidLines.push(`        ${exTableId} -- "Run Iteration ${rIdx + 1}" --> ${rowId}`);
        });
      }

      mermaidLines.push(`    end`);

      // Connect Root Feature or Background to the First Step of each Scenario
      if (bgEndNodeId) {
        mermaidLines.push(`    ${bgEndNodeId} --> ${firstStepId}`);
      } else {
        mermaidLines.push(`    ${featureId} --> ${firstStepId}`);
      }
    });
  }

  return mermaidLines.join('\n');
}
