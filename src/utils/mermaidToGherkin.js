/**
 * Advanced Utility for Vice Versa Conversion:
 * 1. Converts Visual Builder State (Feature -> Scenarios -> Steps -> Examples) to clean Gherkin .feature code.
 * 2. Smart Parser that converts ANY raw Mermaid flowchart syntax (graph TD/LR, subgraphs, inline nodes, brackets)
 *    back into clean, valid Gherkin .feature code.
 */

export function buildGherkinFromNodes(builderState) {
  const { featureTitle, featureDescription, scenarios } = builderState;
  let codeLines = [];

  // Feature
  if (featureTitle && featureTitle.trim()) {
    codeLines.push(`Feature: ${featureTitle.trim()}`);
  } else {
    codeLines.push(`Feature: Automated User Feature`);
  }

  if (featureDescription && featureDescription.trim()) {
    const descLines = featureDescription.trim().split('\n');
    descLines.forEach(l => codeLines.push(`  ${l.trim()}`));
  }
  codeLines.push('');

  // Scenarios
  scenarios.forEach((sc, scIdx) => {
    const scType = sc.isOutline ? 'Scenario Outline' : 'Scenario';
    const scTitle = sc.title && sc.title.trim() ? sc.title.trim() : `Scenario ${scIdx + 1}`;
    
    // Tags
    if (sc.tags && sc.tags.trim()) {
      codeLines.push(`  ${sc.tags.trim()}`);
    }

    codeLines.push(`  ${scType}: ${scTitle}`);

    // Steps
    if (sc.steps && sc.steps.length > 0) {
      sc.steps.forEach(step => {
        const kw = step.keyword || 'Given';
        const txt = step.text || '';
        codeLines.push(`    ${kw} ${txt}`.trimEnd());
      });
    } else {
      codeLines.push('    Given the system is initialized');
      codeLines.push('    When an event occurs');
      codeLines.push('    Then the system state is updated');
    }

    // Examples table for Scenario Outlines
    if (sc.isOutline && sc.examples && sc.examples.headers && sc.examples.headers.length > 0) {
      codeLines.push('');
      codeLines.push('    Examples:');
      const headerRow = '| ' + sc.examples.headers.join(' | ') + ' |';
      codeLines.push(`      ${headerRow}`);
      
      if (sc.examples.rows && sc.examples.rows.length > 0) {
        sc.examples.rows.forEach(row => {
          const rowStr = '| ' + row.join(' | ') + ' |';
          codeLines.push(`      ${rowStr}`);
        });
      } else {
        const dummyRow = '| ' + sc.examples.headers.map(() => 'val').join(' | ') + ' |';
        codeLines.push(`      ${dummyRow}`);
      }
    }

    codeLines.push('');
  });

  return codeLines.join('\n').trim() + '\n';
}

/**
 * Clean up node label text from Mermaid formatting, quotes, and HTML entities
 */
function cleanLabel(rawLabel) {
  if (!rawLabel) return '';
  return rawLabel
    .replace(/^["']|["']$/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#124;/g, '|')
    .trim();
}

/**
 * Smartly determines Gherkin Keyword (Given/When/Then/And) for a node label
 */
function inferKeyword(label, indexInScenario, totalStepsInScenario) {
  const clean = label.replace(/^[📋🧪🔄⚙️📊🟩🟧🟦🟣]\s*/, '').trim();

  const kwMatch = clean.match(/^(Given|When|Then|And|But)\b:?/i);
  if (kwMatch) {
    const kw = kwMatch[1].toUpperCase();
    const rest = clean.substring(kwMatch[0].length).trim();
    return { keyword: kw.charAt(0) + kw.slice(1).toLowerCase(), text: rest };
  }

  // Heuristics based on text content
  const lower = clean.toLowerCase();
  
  if (/\b(is|am|are|have|has|exist|initial|on page|open|given|start|logged in)\b/.test(lower) || indexInScenario === 0) {
    return { keyword: 'Given', text: clean };
  }

  if (/\b(click|enter|select|type|press|submit|navigate|trigger|when|do|perform|fill)\b/.test(lower) || indexInScenario < totalStepsInScenario - 1) {
    return { keyword: 'When', text: clean };
  }

  if (/\b(see|verify|check|should|display|receive|then|expect|confirm|assert|error|success)\b/.test(lower) || indexInScenario === totalStepsInScenario - 1) {
    return { keyword: 'Then', text: clean };
  }

  return { keyword: indexInScenario === 0 ? 'Given' : 'And', text: clean };
}

/**
 * Converts ANY raw Mermaid flowchart syntax (graph TD/LR, subgraphs, bracket nodes) to clean Gherkin
 */
export function convertMermaidToGherkin(mermaidSyntax) {
  if (!mermaidSyntax || !mermaidSyntax.trim()) {
    return 'Feature: New Feature\n\n  Scenario: Sample Scenario\n    Given I start the workflow\n    When I execute the task\n    Then the result is successful';
  }

  const lines = mermaidSyntax.split(/\r?\n/);
  
  let featureTitle = 'Flowchart Feature';
  let featureDescription = 'Converted from Mermaid flowchart diagram';
  
  const nodesMap = new Map(); // id -> label
  const edgeList = []; // [{ from, to, edgeText }]
  const subgraphs = []; // [{ title, nodes: [] }]
  
  let currentSubgraph = null;

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%') || line.startsWith('style') || line.startsWith('classDef') || line.startsWith('linkStyle')) {
      return;
    }

    // Graph definition header
    if (/^graph\s+(TD|TB|LR|RL)/i.test(line) || /^flowchart\s+(TD|TB|LR|RL)/i.test(line)) {
      return;
    }

    // Subgraph start
    const subMatch = line.match(/^subgraph\s+["']?([^"']+)["']?/i);
    if (subMatch) {
      currentSubgraph = { title: cleanLabel(subMatch[1]), nodes: [] };
      subgraphs.push(currentSubgraph);
      return;
    }

    // Subgraph end
    if (line.toLowerCase() === 'end') {
      currentSubgraph = null;
      return;
    }

    // Extract all node declarations in line (e.g., node1["Label"] or node2[Label] or node3(Label) or node4{Label})
    // Regex matches node_id followed by brackets/parens/quotes
    const nodeRegex = /([A-Za-z0-9_-]+)\s*(?:\["([^"]+)"\]|\['([^']+)'\]|\[([^\]]+)\]|\("([^"]+)"\)|\(([^)]+)\)|\{"([^"]+)"\}|\{([^}]+)\})/g;
    
    let match;
    while ((match = nodeRegex.exec(line)) !== null) {
      const nodeId = match[1];
      const label = cleanLabel(match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8]);
      if (label) {
        nodesMap.set(nodeId, label);
        if (currentSubgraph) {
          currentSubgraph.nodes.push(nodeId);
        }
      }
    }

    // Extract connections (edges) e.g., A --> B or A -->|Label| B or A -- Text --> B
    const edgeRegex = /([A-Za-z0-9_-]+)\s*(?:-->|---|==>|-\.->)\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_-]+)/g;
    let edgeMatch;
    while ((edgeMatch = edgeRegex.exec(line)) !== null) {
      const from = edgeMatch[1];
      const edgeLabel = cleanLabel(edgeMatch[2]);
      const to = edgeMatch[3];
      edgeList.push({ from, to, edgeLabel });
    }
  });

  // Extract Feature Title from node containing "Feature:" if present
  for (const [id, label] of nodesMap.entries()) {
    if (/Feature:/i.test(label)) {
      featureTitle = label.replace(/.*Feature:\s*/i, '').replace(/^[📋]\s*/, '').trim() || featureTitle;
      nodesMap.delete(id);
      break;
    }
  }

  // Group nodes into Scenarios
  const scenarios = [];

  if (subgraphs.length > 0) {
    // Each subgraph becomes a Scenario
    subgraphs.forEach(sub => {
      const scNodes = sub.nodes.map(id => nodesMap.get(id)).filter(Boolean);
      if (scNodes.length > 0) {
        const steps = scNodes.map((label, idx) => {
          const { keyword, text } = inferKeyword(label, idx, scNodes.length);
          return { keyword, text };
        });

        scenarios.push({
          title: sub.title || 'Sub-flow Scenario',
          isOutline: false,
          steps,
          examples: { headers: [], rows: [] }
        });
      }
    });
  }

  // If no subgraphs or standalone nodes exist, build scenarios by tracing node paths
  if (scenarios.length === 0) {
    let currentScenario = null;
    let currentSteps = [];

    // Find root nodes or scenario headers
    nodesMap.forEach((label, id) => {
      const isScenarioHeader = /Scenario\b/i.test(label) || label.includes('🧪') || label.includes('🔄');

      if (isScenarioHeader) {
        if (currentScenario) {
          currentScenario.steps = currentSteps.map((lbl, idx) => {
            const { keyword, text } = inferKeyword(lbl, idx, currentSteps.length);
            return { keyword, text };
          });
          scenarios.push(currentScenario);
        }

        const isOutline = /Scenario Outline/i.test(label) || label.includes('🔄');
        const title = label.replace(/^[🧪🔄]\s*/, '').replace(/.*Scenario (Outline|Template)?:?\s*/i, '').trim() || 'User Scenario';

        currentScenario = {
          title,
          isOutline,
          steps: [],
          examples: { headers: [], rows: [] }
        };
        currentSteps = [];
      } else if (!label.startsWith('|') && !label.includes('Examples Data Table')) {
        currentSteps.push(label);
      }
    });

    if (currentScenario) {
      currentScenario.steps = currentSteps.map((lbl, idx) => {
        const { keyword, text } = inferKeyword(lbl, idx, currentSteps.length);
        return { keyword, text };
      });
      scenarios.push(currentScenario);
    }
  }

  // Fallback: If no structured scenario headers found, assemble all non-empty nodes into a scenario!
  if (scenarios.length === 0) {
    const allStepLabels = Array.from(nodesMap.values()).filter(l => !l.includes('Feature:'));

    if (allStepLabels.length > 0) {
      const steps = allStepLabels.map((lbl, idx) => {
        const { keyword, text } = inferKeyword(lbl, idx, allStepLabels.length);
        return { keyword, text };
      });

      scenarios.push({
        title: `${featureTitle} Scenario Flow`,
        isOutline: false,
        steps,
        examples: { headers: [], rows: [] }
      });
    }
  }

  // Absolute fallback
  if (scenarios.length === 0) {
    scenarios.push({
      title: 'Converted Flowchart Scenario',
      isOutline: false,
      steps: [
        { keyword: 'Given', text: 'the flowchart diagram is imported' },
        { keyword: 'When', text: 'it is processed by the converter' },
        { keyword: 'Then', text: 'valid Gherkin feature code is generated' }
      ],
      examples: { headers: [], rows: [] }
    });
  }

  return buildGherkinFromNodes({
    featureTitle,
    featureDescription,
    scenarios
  });
}
